<?php

namespace Tests\Feature;

use App\Models\ContentSchedulerMedia;
use App\Models\InstagramAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ContentSchedulerValidationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected InstagramAccount $account;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
        Storage::fake('public');

        $this->user = User::factory()->create();
        $this->account = InstagramAccount::factory()->for($this->user)->create(['status' => 'active']);
    }

    protected function createMediaWithRatio(float $ratio, string $type = 'image', int $width = 1000): ContentSchedulerMedia
    {
        $height = (int) round($width / $ratio);
        return ContentSchedulerMedia::create([
            'user_id' => $this->user->id,
            'disk' => 'public',
            'path' => 'content-scheduler/media/test_' . uniqid() . ($type === 'video' ? '.mp4' : '.jpg'),
            'original_name' => 'test_media_' . $ratio . ($type === 'video' ? '.mp4' : '.jpg'),
            'mime_type' => $type === 'video' ? 'video/mp4' : 'image/jpeg',
            'media_type' => $type,
            'size_bytes' => 1024 * 500,
            'metadata' => [
                'width' => $width,
                'height' => $height,
                'aspect_ratio' => $ratio,
            ],
        ]);
    }

    public function test_feed_image_rejects_too_tall_aspect_ratio(): void
    {
        $media = $this->createMediaWithRatio(0.4734); // 9:19 vertical screenshot

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/instagram/scheduler', [
                'instagram_account_id' => $this->account->id,
                'media_asset_ids' => [$media->id],
                'format' => 'image',
                'caption' => 'Test caption',
                'publish_now' => true,
            ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['code' => 'ASPECT_RATIO_TOO_TALL']);
        $this->assertStringContainsString('too tall', $response->json('message'));
    }

    public function test_feed_image_rejects_too_wide_aspect_ratio(): void
    {
        $media = $this->createMediaWithRatio(1.95); // Too wide (> 1.92)

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/instagram/scheduler', [
                'instagram_account_id' => $this->account->id,
                'media_asset_ids' => [$media->id],
                'format' => 'image',
                'caption' => 'Test caption',
                'publish_now' => true,
            ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['code' => 'ASPECT_RATIO_TOO_WIDE']);
        $this->assertStringContainsString('too wide', $response->json('message'));
    }

    public function test_feed_image_accepts_canonical_boundaries_and_tolerances(): void
    {
        // 0.79 (0.80 - 0.01 tolerance)
        $media79 = $this->createMediaWithRatio(0.79);
        $this->actingAs($this->user)
            ->postJson('/api/v1/instagram/scheduler', [
                'instagram_account_id' => $this->account->id,
                'media_asset_ids' => [$media79->id],
                'format' => 'image',
                'caption' => 'Tolerance 0.79',
                'publish_now' => true,
            ])
            ->assertCreated();

        // 0.80 (canonical 4:5)
        $media80 = $this->createMediaWithRatio(0.80);
        $this->actingAs($this->user)
            ->postJson('/api/v1/instagram/scheduler', [
                'instagram_account_id' => $this->account->id,
                'media_asset_ids' => [$media80->id],
                'format' => 'image',
                'caption' => 'Canonical 4:5',
                'publish_now' => true,
            ])
            ->assertCreated();

        // 0.801
        $media801 = $this->createMediaWithRatio(0.801);
        $this->actingAs($this->user)
            ->postJson('/api/v1/instagram/scheduler', [
                'instagram_account_id' => $this->account->id,
                'media_asset_ids' => [$media801->id],
                'format' => 'image',
                'caption' => 'Slight variation 0.801',
                'publish_now' => true,
            ])
            ->assertCreated();

        // 1.00 (canonical 1:1 square)
        $media100 = $this->createMediaWithRatio(1.00);
        $this->actingAs($this->user)
            ->postJson('/api/v1/instagram/scheduler', [
                'instagram_account_id' => $this->account->id,
                'media_asset_ids' => [$media100->id],
                'format' => 'image',
                'caption' => 'Square 1:1',
                'publish_now' => true,
            ])
            ->assertCreated();

        // 1.91 (canonical 1.91:1 landscape)
        $media191 = $this->createMediaWithRatio(1.91);
        $this->actingAs($this->user)
            ->postJson('/api/v1/instagram/scheduler', [
                'instagram_account_id' => $this->account->id,
                'media_asset_ids' => [$media191->id],
                'format' => 'image',
                'caption' => 'Landscape 1.91',
                'publish_now' => true,
            ])
            ->assertCreated();

        // 1.92 (1.91 + 0.01 tolerance)
        $media192 = $this->createMediaWithRatio(1.92);
        $this->actingAs($this->user)
            ->postJson('/api/v1/instagram/scheduler', [
                'instagram_account_id' => $this->account->id,
                'media_asset_ids' => [$media192->id],
                'format' => 'image',
                'caption' => 'Landscape tolerance 1.92',
                'publish_now' => true,
            ])
            ->assertCreated();
    }

    public function test_carousel_accepts_consistent_ratios(): void
    {
        $slide1 = $this->createMediaWithRatio(0.80);
        $slide2 = $this->createMediaWithRatio(0.80);
        $slide3 = $this->createMediaWithRatio(0.80);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/instagram/scheduler', [
                'instagram_account_id' => $this->account->id,
                'media_asset_ids' => [$slide1->id, $slide2->id, $slide3->id],
                'format' => 'carousel',
                'caption' => 'Consistent 4:5 Carousel',
                'publish_now' => true,
            ]);

        $response->assertCreated();
    }

    public function test_carousel_rejects_mixed_aspect_ratios_with_structured_details(): void
    {
        $slide1 = $this->createMediaWithRatio(0.80); // 4:5
        $slide2 = $this->createMediaWithRatio(1.00); // 1:1 (mismatch)

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/instagram/scheduler', [
                'instagram_account_id' => $this->account->id,
                'media_asset_ids' => [$slide1->id, $slide2->id],
                'format' => 'carousel',
                'caption' => 'Mixed Carousel',
                'publish_now' => true,
            ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['code' => 'CAROUSEL_ASPECT_RATIO_MISMATCH']);
        $this->assertEquals(0.80, $response->json('first_slide_ratio'));
        $this->assertNotEmpty($response->json('mismatched_slides'));
        $this->assertEquals(2, $response->json('mismatched_slides.0.slide_index'));
    }

    public function test_carousel_rejects_invalid_child_aspect_ratio(): void
    {
        $slide1 = $this->createMediaWithRatio(0.80);
        $slide2 = $this->createMediaWithRatio(0.47); // Invalid feed ratio

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/instagram/scheduler', [
                'instagram_account_id' => $this->account->id,
                'media_asset_ids' => [$slide1->id, $slide2->id],
                'format' => 'carousel',
                'caption' => 'Invalid child Carousel',
                'publish_now' => true,
            ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['code' => 'CAROUSEL_CHILD_RATIO_INVALID']);
    }

    public function test_story_accepts_vertical_ratios_that_feed_rejects(): void
    {
        $verticalMedia = $this->createMediaWithRatio(0.4734); // Rejected for feed

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/instagram/scheduler', [
                'instagram_account_id' => $this->account->id,
                'media_asset_ids' => [$verticalMedia->id],
                'format' => 'story',
                'caption' => '',
                'publish_now' => true,
            ]);

        $response->assertCreated();
    }

    public function test_media_upload_rejects_excessive_dimensions(): void
    {
        // Craft a minimal 9000x9000 JPEG header (decompression bomb test)
        $sofLen = 17;
        $header = pack('n', 0xFFD8) // SOI
            . pack('n', 0xFFC0) // SOF0
            . pack('n', $sofLen)
            . chr(8)
            . pack('n', 9000) // height = 9000
            . pack('n', 9000) // width = 9000
            . chr(3)
            . chr(1) . chr(0x11) . chr(0)
            . chr(2) . chr(0x11) . chr(0)
            . chr(3) . chr(0x11) . chr(0)
            . pack('n', 0xFFD9); // EOI

        $tempFile = tempnam(sys_get_temp_dir(), 'bomb_');
        file_put_contents($tempFile, $header);

        $file = new UploadedFile($tempFile, 'huge.jpg', 'image/jpeg', null, true);

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/instagram/media', [
                'media' => $file,
            ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('exceed the maximum permitted limit', $response->json('errors.media.0'));
        @unlink($tempFile);
    }

    public function test_media_upload_accepts_valid_image_and_extracts_canonical_ratio(): void
    {
        $file = UploadedFile::fake()->image('valid_feed.jpg', 1080, 1350); // 4:5

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/instagram/media', [
                'media' => $file,
            ]);

        $response->assertStatus(201);
        $this->assertEquals(1080, $response->json('width'));
        $this->assertEquals(1350, $response->json('height'));
        $this->assertEquals(0.8, $response->json('aspectRatio'));
    }
}

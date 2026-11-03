<?php

namespace Tests\Feature;

use App\Models\SavedVideoFilter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SavedVideoFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_store_multiple_saved_video_filters(): void
    {
        $user = User::factory()->create();

        $firstPayload = [
            'name' => 'High Outlier',
            'filters' => [
                'search' => 'hooks',
                'outlier_min' => '2.5',
                'sort_by' => 'outlier_score',
                'sort_dir' => 'desc',
            ],
        ];
        $secondPayload = [
            'name' => 'Fresh Weekly',
            'filters' => [
                'date_value' => '7',
                'date_unit' => 'Days',
                'sort_by' => 'posted_date',
                'sort_dir' => 'desc',
            ],
        ];

        $this->actingAs($user)
            ->postJson('/api/saved-video-filters', $firstPayload)
            ->assertCreated()
            ->assertJsonPath('data.name', 'High Outlier');

        $this->actingAs($user)
            ->postJson('/api/saved-video-filters', $secondPayload)
            ->assertCreated()
            ->assertJsonPath('data.name', 'Fresh Weekly');

        $this->actingAs($user)
            ->getJson('/api/saved-video-filters')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_user_cannot_delete_another_users_saved_video_filter(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();

        $savedFilter = SavedVideoFilter::create([
            'user_id' => $owner->id,
            'name' => 'Owner Filter',
            'filters' => [
                'search' => 'owner',
                'sort_by' => 'views',
                'sort_dir' => 'asc',
            ],
        ]);

        $this->actingAs($otherUser)
            ->deleteJson('/api/saved-video-filters/'.$savedFilter->id)
            ->assertForbidden();

        $this->assertDatabaseHas('saved_video_filters', [
            'id' => $savedFilter->id,
            'user_id' => $owner->id,
        ]);
    }

    public function test_leading_zero_date_value_is_normalized_and_accepted(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/saved-video-filters', [
            'name' => 'Leading Zero Date',
            'filters' => [
                'date_value' => '010',
                'date_unit' => 'Months',
                'sort_by' => 'posted_date',
                'sort_dir' => 'desc',
            ],
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.filters.date_value', 10);
    }

    public function test_videos_page_receives_saved_video_filters_from_dedicated_table(): void
    {
        $user = User::factory()->create();

        SavedVideoFilter::create([
            'user_id' => $user->id,
            'name' => 'Weekly View',
            'filters' => [
                'search' => 'ugc',
                'sort_by' => 'views',
                'sort_dir' => 'asc',
            ],
        ]);

        SavedVideoFilter::create([
            'user_id' => $user->id,
            'name' => 'Outlier First',
            'filters' => [
                'search' => 'viral',
                'sort_by' => 'outlier_score',
                'sort_dir' => 'desc',
            ],
        ]);

        $response = $this->actingAs($user)->get(route('videos'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Videos/Index')
            ->has('savedVideoFilters', 2)
            ->where('savedVideoFilters.0.name', 'Outlier First')
            ->where('savedVideoFilters.1.name', 'Weekly View')
        );
    }
}

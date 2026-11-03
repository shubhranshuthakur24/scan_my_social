<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('autodm_template_use_cases', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 160)->unique();
            $table->text('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('autodm_templates', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('use_case_id')
                ->constrained('autodm_template_use_cases')
                ->cascadeOnDelete();
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->boolean('is_system')->default(false);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->boolean('recommended')->default(false);
            $table->string('name', 120);
            $table->string('title', 120);
            $table->string('slug', 180);
            $table->string('badge', 40)->nullable();
            $table->string('trigger_type', 20)->default('post');
            $table->string('content_source', 20)->default('media');
            $table->string('description', 300)->nullable();
            $table->json('keywords')->nullable();
            $table->json('template_payload');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'is_system']);
            $table->index(['created_by', 'is_active']);
            $table->index(['use_case_id', 'is_active']);
            $table->unique(['is_system', 'created_by', 'slug'], 'autodm_templates_scope_slug_unique');
        });

        $this->seedDefaultTemplateUseCasesAndTemplates();
    }

    public function down(): void
    {
        Schema::dropIfExists('autodm_templates');
        Schema::dropIfExists('autodm_template_use_cases');
    }

    private function seedDefaultTemplateUseCasesAndTemplates(): void
    {
        $now = now();
        $useCases = [
            ['name' => 'Lead Magnet Delivery', 'slug' => 'lead-magnet-delivery', 'description' => 'Deliver downloadable resources or lead magnets via DM.', 'sort_order' => 10],
            ['name' => 'Pricing Inquiry', 'slug' => 'pricing-inquiry', 'description' => 'Handle pricing, package, or plan questions instantly.', 'sort_order' => 20],
            ['name' => 'Service Details', 'slug' => 'service-details', 'description' => 'Share service details and next steps in DMs.', 'sort_order' => 30],
            ['name' => 'Webinar/Event Registration', 'slug' => 'webinar-event-registration', 'description' => 'Capture event intent and send registration links.', 'sort_order' => 40],
            ['name' => 'Free Audit/Consultation', 'slug' => 'free-audit-consultation', 'description' => 'Qualify and route consultation requests.', 'sort_order' => 50],
            ['name' => 'Coupon/Offer Claim', 'slug' => 'coupon-offer-claim', 'description' => 'Deliver time-bound offers or coupons via DM.', 'sort_order' => 60],
            ['name' => 'Course/Community Access', 'slug' => 'course-community-access', 'description' => 'Guide users into courses or private communities.', 'sort_order' => 70],
            ['name' => 'FAQs Auto-Reply', 'slug' => 'faqs-auto-reply', 'description' => 'Cover repetitive FAQs with reusable DM replies.', 'sort_order' => 80],
            ['name' => 'DM Keyword Campaign', 'slug' => 'dm-keyword-campaign', 'description' => 'Run keyword-driven campaigns for posts and reels.', 'sort_order' => 90],
            ['name' => 'Story Reply Funnel', 'slug' => 'story-reply-funnel', 'description' => 'Turn story replies into structured DM funnels.', 'sort_order' => 100],
        ];

        DB::table('autodm_template_use_cases')->insert(
            collect($useCases)->map(fn (array $row): array => [
                ...$row,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all()
        );

        /** @var array<string, int> $useCaseIds */
        $useCaseIds = DB::table('autodm_template_use_cases')
            ->pluck('id', 'slug')
            ->all();

        $templateRows = [
            [
                'use_case_slug' => 'lead-magnet-delivery',
                'name' => 'Lead Magnet AutoDM',
                'title' => 'Lead Magnet Delivery',
                'slug' => 'lead-magnet-delivery-default',
                'badge' => 'Lead Magnet',
                'trigger_type' => 'post',
                'content_source' => 'media',
                'description' => 'Deliver your free guide or checklist after keyword comments.',
                'keywords' => ['guide', 'free', 'resource', 'ebook'],
                'payload' => $this->payload(
                    replyMessage: 'Here is your free resource: https://example.com/resource',
                    openingEnabled: true,
                    openingMessage: 'Thanks for your interest. Tap below and I will send it right away.',
                    openingButton: 'Send me',
                    publicReplies: ['Check your inbox, sent.', 'Done, I just DMd you.', 'It is in your messages now.']
                ),
                'sort_order' => 10,
            ],
            [
                'use_case_slug' => 'pricing-inquiry',
                'name' => 'Pricing AutoDM',
                'title' => 'Pricing Inquiry',
                'slug' => 'pricing-inquiry-default',
                'badge' => 'High Intent',
                'trigger_type' => 'post',
                'content_source' => 'media',
                'description' => 'Share pricing and package details when users ask for cost.',
                'keywords' => ['price', 'pricing', 'cost', 'plans'],
                'payload' => $this->payload(
                    replyMessage: 'Great question. See all plans here: https://example.com/pricing',
                    publicReplies: ['Sent in DM.', 'Check your inbox for pricing details.', 'Done, just shared it in DM.'],
                    openingEnabled: false
                ),
                'sort_order' => 20,
            ],
            [
                'use_case_slug' => 'service-details',
                'name' => 'Service Details AutoDM',
                'title' => 'Service Details',
                'slug' => 'service-details-default',
                'badge' => 'Warmup',
                'trigger_type' => 'post',
                'content_source' => 'media',
                'description' => 'Warm users up, then send your service details in DM.',
                'keywords' => ['details', 'service', 'info'],
                'payload' => $this->payload(
                    replyMessage: 'Sharing service details now: https://example.com/services',
                    openingEnabled: true,
                    openingMessage: 'Thanks for commenting. Tap below and I will send full details.',
                    openingButton: 'Send details',
                    publicReplies: ['Perfect, sent in DM.', 'Just dropped details in your inbox.', 'Please check your DM.']
                ),
                'sort_order' => 30,
            ],
            [
                'use_case_slug' => 'webinar-event-registration',
                'name' => 'Webinar Registration AutoDM',
                'title' => 'Webinar/Event Registration',
                'slug' => 'webinar-event-registration-default',
                'badge' => 'Event',
                'trigger_type' => 'post',
                'content_source' => 'media',
                'description' => 'Capture webinar intent and share registration links.',
                'keywords' => ['webinar', 'register', 'event', 'join'],
                'payload' => $this->payload(
                    replyMessage: 'Reserve your seat here: https://example.com/webinar',
                    openingEnabled: true,
                    openingMessage: 'Awesome. Tap below and I will send the registration link.',
                    openingButton: 'Register now',
                    publicReplies: ['Registration link sent in DM.', 'Check your inbox to register.', 'Sent. See your DMs.']
                ),
                'sort_order' => 40,
            ],
            [
                'use_case_slug' => 'free-audit-consultation',
                'name' => 'Free Audit AutoDM',
                'title' => 'Free Audit/Consultation',
                'slug' => 'free-audit-consultation-default',
                'badge' => 'Consultation',
                'trigger_type' => 'post',
                'content_source' => 'media',
                'description' => 'Collect and route free audit requests quickly.',
                'keywords' => ['audit', 'consultation', 'review', 'help'],
                'payload' => $this->payload(
                    replyMessage: 'Book your free audit slot: https://example.com/audit',
                    openingEnabled: true,
                    openingMessage: 'Happy to help. Tap below and I will share the booking link.',
                    openingButton: 'Book audit',
                    publicReplies: ['Audit details sent in DM.', 'Check DM for booking link.', 'Done, sent it now.']
                ),
                'sort_order' => 50,
            ],
            [
                'use_case_slug' => 'coupon-offer-claim',
                'name' => 'Coupon Claim AutoDM',
                'title' => 'Coupon/Offer Claim',
                'slug' => 'coupon-offer-claim-default',
                'badge' => 'Offer',
                'trigger_type' => 'post',
                'content_source' => 'media',
                'description' => 'Deliver discount codes and limited-time offers.',
                'keywords' => ['coupon', 'offer', 'discount', 'deal'],
                'payload' => $this->payload(
                    replyMessage: 'Your offer is live: https://example.com/offer',
                    openingEnabled: true,
                    openingMessage: 'Nice. Tap below and I will unlock your offer.',
                    openingButton: 'Unlock offer',
                    publicReplies: ['Offer sent in DM.', 'Check your messages for the offer.', 'Done, it is in your inbox.']
                ),
                'sort_order' => 60,
            ],
            [
                'use_case_slug' => 'course-community-access',
                'name' => 'Course Access AutoDM',
                'title' => 'Course/Community Access',
                'slug' => 'course-community-access-default',
                'badge' => 'Community',
                'trigger_type' => 'post',
                'content_source' => 'media',
                'description' => 'Onboard prospects into your course or paid community.',
                'keywords' => ['course', 'community', 'join', 'access'],
                'payload' => $this->payload(
                    replyMessage: 'Join from here: https://example.com/community',
                    openingEnabled: true,
                    openingMessage: 'Great choice. Tap below and I will share access details.',
                    openingButton: 'Get access',
                    publicReplies: ['Access link sent in DM.', 'Check your inbox for access.', 'Done, sent it now.']
                ),
                'sort_order' => 70,
            ],
            [
                'use_case_slug' => 'faqs-auto-reply',
                'name' => 'FAQ AutoDM',
                'title' => 'FAQs Auto-Reply',
                'slug' => 'faqs-auto-reply-default',
                'badge' => 'Support',
                'trigger_type' => 'post',
                'content_source' => 'media',
                'description' => 'Answer repetitive DMs with a clean FAQ response.',
                'keywords' => ['faq', 'question', 'support', 'help'],
                'payload' => $this->payload(
                    replyMessage: 'Here are the answers to common questions: https://example.com/faq',
                    openingEnabled: false,
                    publicReplies: ['Sent FAQ in DM.', 'Shared details in your inbox.', 'Check DMs for full FAQ.']
                ),
                'sort_order' => 80,
            ],
            [
                'use_case_slug' => 'dm-keyword-campaign',
                'name' => 'DM Keyword Campaign AutoDM',
                'title' => 'DM Keyword Campaign',
                'slug' => 'dm-keyword-campaign-default',
                'badge' => 'Campaign',
                'trigger_type' => 'post',
                'content_source' => 'media',
                'description' => 'Run conversion campaigns based on keyword intent.',
                'keywords' => ['dm me', 'send', 'details', 'start'],
                'payload' => $this->payload(
                    replyMessage: 'Done. Sending full details now: https://example.com/campaign',
                    openingEnabled: true,
                    openingMessage: 'Perfect. Tap below to receive campaign details.',
                    openingButton: 'Send now',
                    publicReplies: ['Sent in DM.', 'Check your inbox.', 'Done, shared just now.']
                ),
                'sort_order' => 90,
            ],
            [
                'use_case_slug' => 'story-reply-funnel',
                'name' => 'Story Reply Funnel AutoDM',
                'title' => 'Story Reply Funnel',
                'slug' => 'story-reply-funnel-default',
                'badge' => 'Story',
                'trigger_type' => 'story',
                'content_source' => 'story',
                'description' => 'Convert story replies into DM follow-ups without public replies.',
                'keywords' => ['story', 'reply', 'details'],
                'payload' => $this->payload(
                    replyMessage: 'Thanks for replying to the story. Here is the link: https://example.com/story',
                    openingEnabled: false,
                    publicReplies: [],
                    publicReplyEnabled: false
                ),
                'sort_order' => 100,
            ],
        ];

        $rows = collect($templateRows)->map(function (array $template) use ($useCaseIds, $now): array {
            $useCaseId = (int) ($useCaseIds[$template['use_case_slug']] ?? 0);

            return [
                'use_case_id' => $useCaseId,
                'created_by' => null,
                'is_system' => true,
                'is_default' => true,
                'is_active' => true,
                'recommended' => true,
                'name' => $template['name'],
                'title' => $template['title'],
                'slug' => $template['slug'],
                'badge' => $template['badge'],
                'trigger_type' => $template['trigger_type'],
                'content_source' => $template['content_source'],
                'description' => $template['description'],
                'keywords' => json_encode($template['keywords']),
                'template_payload' => json_encode($template['payload']),
                'sort_order' => (int) $template['sort_order'],
                'created_at' => $now,
                'updated_at' => $now,
            ];
        })->filter(fn (array $row) => $row['use_case_id'] > 0)->values()->all();

        if (! empty($rows)) {
            DB::table('autodm_templates')->insert($rows);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(
        string $replyMessage,
        bool $openingEnabled = false,
        string $openingMessage = '',
        string $openingButton = '',
        array $publicReplies = [],
        bool $publicReplyEnabled = true
    ): array {
        return [
            'reply_messages' => [
                [
                    'message_text' => $replyMessage,
                    'media_url' => '',
                ],
            ],
            'opening_message_enabled' => $openingEnabled,
            'opening_message' => $openingEnabled ? $openingMessage : '',
            'opening_button_text' => $openingEnabled ? $openingButton : '',
            'public_reply_enabled' => $publicReplyEnabled,
            'public_comment_reply' => $publicReplyEnabled ? array_values($publicReplies) : [],
            'public_reply_limit_enabled' => $publicReplyEnabled,
            'public_reply_limit_count' => 200,
            'ask_to_follow_enabled' => false,
            'ask_to_follow_strict' => false,
            'ask_to_follow_message' => '',
            'reminder_enabled' => false,
            'reminder_delay_hours' => 20,
            'reminder_messages' => [''],
            'reminder_primary_button_text' => 'Show me more',
            'reminder_secondary_button_text' => 'Not now',
            'reminder_more_message' => 'Awesome. Tell me what you need next and I will help.',
            'reminder_offer_url' => '',
            'reminder_offer_button_text' => 'Get Premium',
        ];
    }
};

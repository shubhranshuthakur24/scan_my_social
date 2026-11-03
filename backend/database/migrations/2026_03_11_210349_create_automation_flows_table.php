<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('automation_flows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('instagram_account_id')->constrained('instagram_accounts')->onDelete('cascade');
            $table->unsignedBigInteger('lead_form_id')->nullable();

            // Basic automation info
            $table->string('name')->nullable();
            $table->enum('trigger_type', ['post', 'reel', 'story']);
            $table->string('trigger_value'); // media_id or story_id
            $table->text('trigger_media_url')->nullable();
            $table->json('keywords')->nullable(); // stored as JSON array: ["price", "cost"]
            $table->boolean('match_all_comments')->default(false);

            // Direct Message (DM) opening settings
            $table->boolean('opening_message_enabled')->default(false);
            $table->text('opening_message')->nullable();
            $table->string('opening_button_text', 80)->nullable();

            // Public comment reply settings
            $table->boolean('public_reply_enabled')->default(false);
            $table->json('public_comment_reply')->nullable();
            $table->boolean('public_reply_limit_enabled')->default(false);
            $table->unsignedInteger('public_reply_limit_count')->nullable();

            // Follow-Gate settings
            $table->boolean('ask_to_follow_enabled')->default(false);
            $table->boolean('ask_to_follow_strict')->default(false);
            $table->text('ask_to_follow_message')->nullable();
            $table->string('ask_to_follow_profile_button_text', 80)->nullable();
            $table->string('ask_to_follow_confirm_button_text', 80)->nullable();

            // Follow-up Reminder settings
            $table->boolean('reminder_enabled')->default(false);
            $table->unsignedTinyInteger('reminder_delay_hours')->nullable();
            $table->json('reminder_messages')->nullable();
            $table->string('reminder_primary_button_text')->nullable();
            $table->string('reminder_secondary_button_text')->nullable();
            $table->text('reminder_more_message')->nullable();
            $table->text('reminder_offer_url')->nullable();
            $table->string('reminder_offer_button_text')->nullable();

            $table->string('status')->default('active'); // active, paused
            $table->timestamps();

            // Indexes
            $table->index(['user_id', 'instagram_account_id', 'status'], 'automation_flows_my_insta_status_idx');
            $table->index(['user_id', 'instagram_account_id', 'status', 'trigger_value'], 'automation_flows_my_insta_trigger_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('automation_flows');
    }
};

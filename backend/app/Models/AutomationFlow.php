<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AutomationFlow extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'instagram_account_id',
        'lead_form_id',
        'name',
        'trigger_type',
        'trigger_value',
        'trigger_media_url',
        'keywords',
        'match_all_comments',
        'opening_message_enabled',
        'opening_message',
        'opening_button_text',
        'public_reply_enabled',
        'public_comment_reply',
        'public_reply_limit_enabled',
        'public_reply_limit_count',
        'ask_to_follow_enabled',
        'ask_to_follow_strict',
        'ask_to_follow_message',
        'ask_to_follow_profile_button_text',
        'ask_to_follow_confirm_button_text',
        'reminder_enabled',
        'reminder_delay_hours',
        'reminder_messages',
        'reminder_primary_button_text',
        'reminder_secondary_button_text',
        'reminder_more_message',
        'reminder_offer_url',
        'reminder_offer_button_text',
        'status',
    ];

    protected $casts = [
        'keywords' => 'array',
        'match_all_comments' => 'boolean',
        'opening_message_enabled' => 'boolean',
        'public_reply_enabled' => 'boolean',
        'public_comment_reply' => 'array',
        'public_reply_limit_enabled' => 'boolean',
        'ask_to_follow_enabled' => 'boolean',
        'ask_to_follow_strict' => 'boolean',
        'reminder_enabled' => 'boolean',
        'reminder_messages' => 'array',
    ];

    public function instagramAccount()
    {
        return $this->belongsTo(InstagramAccount::class);
    }

    public function leadForm()
    {
        return $this->belongsTo(LeadForm::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function messageVariants()
    {
        return $this->hasMany(AutomationFlowMessage::class);
    }

    public function logs()
    {
        return $this->hasMany(AutomationLog::class);
    }

    public function linkClicks()
    {
        return $this->hasMany(AutodmLinkClick::class);
    }

    public function reminderEvents()
    {
        return $this->hasMany(AutodmReminderEvent::class);
    }

    public function triggerMediaAnalytics(): BelongsTo
    {
        return $this->belongsTo(InstagramAccountMediaAnalytics::class, 'trigger_value', 'instagram_media_id');
    }
}

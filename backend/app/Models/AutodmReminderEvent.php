<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AutodmReminderEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'automation_flow_id',
        'automation_flow_message_id',
        'recipient_ig_id',
        'trigger_source_id',
        'status',
        'scheduled_for',
        'processed_at',
        'clicks_count',
        'skip_reason',
        'response_payload',
    ];

    protected $casts = [
        'scheduled_for' => 'datetime',
        'processed_at' => 'datetime',
        'response_payload' => 'array',
    ];

    public function automationFlow()
    {
        return $this->belongsTo(AutomationFlow::class);
    }

    public function messageVariant()
    {
        return $this->belongsTo(AutomationFlowMessage::class, 'automation_flow_message_id');
    }
}

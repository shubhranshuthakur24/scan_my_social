<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AutomationLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'automation_flow_id',
        'trigger_source_id',
        'recipient_ig_id',
        'status',
        'error_code',
        'error_message',
        'response_payload',
    ];

    protected $casts = [
        'response_payload' => 'array',
    ];

    public function automationFlow()
    {
        return $this->belongsTo(AutomationFlow::class);
    }
}

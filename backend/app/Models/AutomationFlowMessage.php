<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AutomationFlowMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'automation_flow_id',
        'message_type',
        'message_text',
        'media_url',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function automationFlow()
    {
        return $this->belongsTo(AutomationFlow::class);
    }

    public function linkClicks()
    {
        return $this->hasMany(AutodmLinkClick::class, 'automation_flow_message_id');
    }
}

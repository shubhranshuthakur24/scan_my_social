<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AutodmLinkClick extends Model
{
    use HasFactory;

    protected $fillable = [
        'automation_flow_id',
        'automation_flow_message_id',
        'target_url',
        'ip',
        'user_agent',
    ];

    public function flow()
    {
        return $this->belongsTo(AutomationFlow::class, 'automation_flow_id');
    }

    public function message()
    {
        return $this->belongsTo(AutomationFlowMessage::class, 'automation_flow_message_id');
    }
}

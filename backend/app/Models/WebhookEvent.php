<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebhookEvent extends Model
{
    protected $fillable = [
        'event_id',
        'event_type',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];
}

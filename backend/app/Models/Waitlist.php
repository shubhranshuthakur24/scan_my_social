<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Waitlist extends Model
{
    protected $fillable = [
        'email',
        'is_email_sent',
        'has_signed_up',
        'sent_emails_count',
    ];

    protected $casts = [
        'is_email_sent' => 'boolean',
        'has_signed_up' => 'boolean',
        'sent_emails_count' => 'integer',
    ];
}

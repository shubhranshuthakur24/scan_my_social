<?php

namespace App\Models;

use Database\Factories\LeadFormSubmissionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadFormSubmission extends Model
{
    /** @use HasFactory<LeadFormSubmissionFactory> */
    use HasFactory;

    protected $fillable = [
        'lead_form_id',
        'data',
        'metadata',
        'ip',
        'user_agent',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'metadata' => 'array',
            'submitted_at' => 'datetime',
        ];
    }

    public function leadForm(): BelongsTo
    {
        return $this->belongsTo(LeadForm::class);
    }
}

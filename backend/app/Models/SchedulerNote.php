<?php

namespace App\Models;

use Database\Factories\SchedulerNoteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SchedulerNote extends Model
{
    /** @use HasFactory<SchedulerNoteFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'note_date',
        'content',
        'color',
    ];

    protected function casts(): array
    {
        return [
            'note_date' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

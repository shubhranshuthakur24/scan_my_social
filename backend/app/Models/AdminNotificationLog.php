<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminNotificationLog extends Model
{
    /**
     * The table associated with the model.
     */
    protected $table = 'admin_notifications_log';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'admin_id',
        'target_type',
        'target_filter',
        'recipient_count',
        'title',
        'message',
        'type',
        'action_url',
    ];

    /**
     * Get the admin who sent this notification.
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}

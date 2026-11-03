<?php

namespace App\Policies;

use App\Models\ScheduledPost;
use App\Models\User;

class ScheduledPostPolicy
{
    public function view(User $user, ScheduledPost $scheduledPost): bool
    {
        return (int) $scheduledPost->user_id === (int) $user->id;
    }

    public function update(User $user, ScheduledPost $scheduledPost): bool
    {
        return (int) $scheduledPost->user_id === (int) $user->id;
    }

    public function delete(User $user, ScheduledPost $scheduledPost): bool
    {
        return (int) $scheduledPost->user_id === (int) $user->id;
    }
}

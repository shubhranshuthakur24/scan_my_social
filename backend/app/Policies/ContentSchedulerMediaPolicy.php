<?php

namespace App\Policies;

use App\Models\ContentSchedulerMedia;
use App\Models\User;

class ContentSchedulerMediaPolicy
{
    public function create(User $user): bool
    {
        return $user->exists;
    }

    public function view(User $user, ContentSchedulerMedia $media): bool
    {
        return (int) $media->user_id === (int) $user->id;
    }

    public function delete(User $user, ContentSchedulerMedia $media): bool
    {
        return (int) $media->user_id === (int) $user->id;
    }
}

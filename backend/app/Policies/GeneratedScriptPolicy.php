<?php

namespace App\Policies;

use App\Models\GeneratedScript;
use App\Models\User;

class GeneratedScriptPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, GeneratedScript $generatedScript): bool
    {
        return $user->id === $generatedScript->user_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, GeneratedScript $generatedScript): bool
    {
        return $user->id === $generatedScript->user_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, GeneratedScript $generatedScript): bool
    {
        return $user->id === $generatedScript->user_id;
    }
}

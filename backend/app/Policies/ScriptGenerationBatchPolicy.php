<?php

namespace App\Policies;

use App\Models\ScriptGenerationBatch;
use App\Models\User;

class ScriptGenerationBatchPolicy
{
    public function view(User $user, ScriptGenerationBatch $batch): bool
    {
        return $user->id === $batch->user_id;
    }

    public function update(User $user, ScriptGenerationBatch $batch): bool
    {
        return $user->id === $batch->user_id;
    }
}

<?php

namespace App\Policies;

use App\Models\LeadForm;
use App\Models\User;

class LeadFormPolicy
{
    public function view(User $user, LeadForm $leadForm): bool
    {
        return (int) $leadForm->user_id === (int) $user->id;
    }

    public function update(User $user, LeadForm $leadForm): bool
    {
        return (int) $leadForm->user_id === (int) $user->id;
    }

    public function delete(User $user, LeadForm $leadForm): bool
    {
        return (int) $leadForm->user_id === (int) $user->id;
    }
}

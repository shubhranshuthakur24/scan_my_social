<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Str;

class LinkPageUsernameService
{
    /**
     * @var list<string>
     */
    public const RESERVED_USERNAMES = [
        'admin',
        'api',
        'app',
        'autodm',
        'billing',
        'blogs',
        'channels',
        'dashboard',
        'data-deletion',
        'login',
        'logout',
        'pricing',
        'privacy-policy',
        'profile',
        'register',
        'settings',
        'storage',
        'videos',
        'viral-image-prompts',
        'waitlist',
    ];

    public function normalize(string $value): string
    {
        return Str::slug(Str::lower(trim($value)));
    }

    public function generate(string $name, ?int $ignoreUserId = null): string
    {
        $base = $this->normalize($name);
        if ($base === '' || in_array($base, self::RESERVED_USERNAMES, true)) {
            $base = 'creator';
        }

        $username = $base;
        $suffix = 2;

        while ($this->isTaken($username, $ignoreUserId) || in_array($username, self::RESERVED_USERNAMES, true)) {
            $username = "{$base}-{$suffix}";
            $suffix++;
        }

        return $username;
    }

    private function isTaken(string $username, ?int $ignoreUserId): bool
    {
        return User::query()
            ->where('username', $username)
            ->when($ignoreUserId, fn ($query) => $query->whereKeyNot($ignoreUserId))
            ->exists();
    }
}

<?php

namespace App\Models;

use App\Notifications\QueuedVerifyEmail;
use App\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'bio',
        'avatar_url',
        'password',
        'google_id',
        'google_token',
        'preferences',
        'referral_code',
        'referred_by_id',
        'wallet_balance',
        'razorpay_contact_id',
        'razorpay_customer_id',
        'affiliate_status',
        'affiliate_code',
        'affiliate_rejection_reason',
        'affiliate_applied_at',
        'affiliate_approved_at',
        'affiliate_contact',
        'affiliate_note',
        'bank_name',
        'account_number',
        'ifsc_code',
        'account_holder_name',
        'channel_untrack_count',
        'lock_time_slots_across_event_types',
        'booking_timezone',
        'booking_welcome_message',
        'default_minimum_booking_notice_minutes',
        'default_booking_window_days',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'google_token',
        'google_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'google_token' => 'encrypted',
            'credits' => 'integer',
            'has_claimed_free' => 'boolean',
            'preferences' => 'array',
            'wallet_balance' => 'integer',
            'role' => UserRole::class,
            'affiliate_applied_at' => 'datetime',
            'affiliate_approved_at' => 'datetime',
            'channel_untrack_count' => 'integer',
            'lock_time_slots_across_event_types' => 'boolean',
            'default_minimum_booking_notice_minutes' => 'integer',
            'default_booking_window_days' => 'integer',
        ];
    }

    protected static function booted()
    {
        static::updating(function ($user) {
            // referred_by_id is STRICTLY IMMUTABLE once set.
            if ($user->isDirty('referred_by_id') && ! is_null($user->getOriginal('referred_by_id'))) {
                throw ValidationException::withMessages([
                    'referred_by_id' => ['The referral assignment is immutable and cannot be changed.'],
                ]);
            }
        });
    }

    public function generateReferralCodeIfNull(): void
    {
        if (is_null($this->referral_code)) {
            $this->referral_code = strtoupper('SMS_'.Str::random(8));
            $this->save();
        }
    }

    /**
     * Send the email verification notification.
     *
     * @return void
     */
    public function sendEmailVerificationNotification()
    {
        $this->notify(new QueuedVerifyEmail);
    }

    public function channels(): BelongsToMany
    {
        return $this->belongsToMany(Channel::class, 'channel_users')
            ->withTimestamps();
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function creditLedger(): HasMany
    {
        return $this->hasMany(CreditLedger::class);
    }

    public function hasEnoughCredits(int $amount): bool
    {
        return $this->credits >= $amount;
    }

    public function deductCredits(int $amount, string $action): bool
    {
        if ($amount <= 0) {
            return true;
        }

        return DB::transaction(function () use ($amount, $action): bool {
            $updatedRows = static::query()
                ->whereKey($this->getKey())
                ->where('credits', '>=', $amount)
                ->decrement('credits', $amount);

            if ($updatedRows === 0) {
                return false;
            }

            $this->creditLedger()->create([
                'action' => $action,
                'amount' => -$amount,
            ]);

            $this->refresh();

            return true;
        });
    }

    public function addCredits(int $amount, string $action): void
    {
        $this->increment('credits', $amount);

        $this->creditLedger()->create([
            'action' => $action,
            'amount' => $amount,
        ]);
    }

    public function watchlists(): HasMany
    {
        return $this->hasMany(Watchlist::class);
    }

    public function contentAnalyses(): BelongsToMany
    {
        return $this->belongsToMany(ContentAnalysis::class, 'content_analysis_by_user')
            ->withPivot([
                'transcription_charged_at',
                'analysis_charged_at',
                'transcription_status',
                'transcription_error',
                'analysis_status',
                'analysis_error',
            ])
            ->withTimestamps();
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function leadForms(): HasMany
    {
        return $this->hasMany(LeadForm::class);
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    public function linkPage(): HasOne
    {
        return $this->hasOne(LinkPage::class)->where('is_primary', true);
    }

    public function linkPages(): HasMany
    {
        return $this->hasMany(LinkPage::class);
    }

    public function shortLinks(): HasMany
    {
        return $this->hasMany(ShortLink::class);
    }

    public function webPages(): HasMany
    {
        return $this->hasMany(WebPage::class);
    }

    public function hostedBookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'host_user_id');
    }

    public function bookingEventTypes(): HasMany
    {
        return $this->hasMany(BookingEventType::class, 'host_user_id');
    }

    public function bookingHostAvailabilityRules(): HasMany
    {
        return $this->hasMany(BookingHostAvailabilityRule::class, 'host_user_id');
    }

    public function bookingAvailabilityOverrides(): HasMany
    {
        return $this->hasMany(BookingAvailabilityOverride::class, 'host_user_id');
    }

    public function generatedScripts(): HasMany
    {
        return $this->hasMany(GeneratedScript::class);
    }

    public function scriptGenerationBatches(): HasMany
    {
        return $this->hasMany(ScriptGenerationBatch::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }

    public function logActivity(string $type, string $description, ?string $url = null): void
    {
        $safeUrl = Activity::sanitizeInternalUrl($url);

        $this->activities()->create([
            'type' => $type,
            'description' => $description,
            'url' => $safeUrl,
        ]);
    }

    public function referrer()
    {
        return $this->belongsTo(User::class, 'referred_by_id');
    }

    public function referees()
    {
        return $this->hasMany(User::class, 'referred_by_id');
    }

    public function referrals()
    {
        return $this->hasMany(Referral::class, 'referrer_id');
    }

    public function attribution(): HasOne
    {
        return $this->hasOne(UserAttribution::class);
    }

    public function walletTransactions()
    {
        return $this->hasMany(WalletTransaction::class);
    }

    public function instagramAccounts(): HasMany
    {
        return $this->hasMany(InstagramAccount::class);
    }

    public function contentSchedulerMedia(): HasMany
    {
        return $this->hasMany(ContentSchedulerMedia::class);
    }

    public function scheduledPosts(): HasMany
    {
        return $this->hasMany(ScheduledPost::class);
    }

    public function schedulerNotes(): HasMany
    {
        return $this->hasMany(SchedulerNote::class);
    }

    public function payoutRequests()
    {
        return $this->hasMany(PayoutRequest::class);
    }

    public function savedVideoFilters(): HasMany
    {
        return $this->hasMany(SavedVideoFilter::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === UserRole::SuperAdmin;
    }

    public function getIsAffiliateAttribute(): bool
    {
        return $this->affiliate_status === 'approved';
    }

    public function generateAffiliateCode(): string
    {
        if ($this->affiliate_code) {
            return $this->affiliate_code;
        }

        $firstName = strtoupper(preg_replace('/[^a-zA-Z0-9]/', '', explode(' ', $this->name)[0]));
        if (strlen($firstName) < 2) {
            $firstName = 'USER';
        }

        do {
            $code = 'AFF_'.$firstName.'_'.rand(1000, 9999);
        } while (static::where('affiliate_code', $code)->exists());

        $this->update(['affiliate_code' => $code]);

        return $code;
    }
}

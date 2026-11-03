<?php

namespace App\Services;

use App\Models\Channel;
use App\Models\Post;
use Illuminate\Support\Facades\Log;

class OutlierDetectionService
{
    // === Configuration Constants (Viralzr V1 Spec) ===
    const WINDOW_SIZE = 10;

    const MIN_PREVIOUS_POSTS = 5;

    const BASELINE_FLOOR = 1000;

    const ABSOLUTE_MINIMUM_PLAYS = 10000;

    // Multiplier thresholds (check highest first)
    const EXPLOSIVE_MULTIPLIER = 75;

    const BREAKOUT_MULTIPLIER = 25;

    const OUTLIER_MULTIPLIER = 10;

    const STRONG_MULTIPLIER = 5;

    // StdDev thresholds per tier
    const EXPLOSIVE_STDDEV_MULTIPLIER = 5;

    const BREAKOUT_STDDEV_MULTIPLIER = 4;

    const OUTLIER_STDDEV_MULTIPLIER = 3;

    // Label strings
    const LABEL_INSUFFICIENT = 'Insufficient Data';

    const LABEL_NORMAL = 'Normal';

    const LABEL_STRONG = 'Strong';

    const LABEL_OUTLIER = 'Outlier';

    const LABEL_BREAKOUT = 'Breakout';

    const LABEL_EXPLOSIVE = 'Explosive';

    /**
     * Run the full outlier + engagement detection for every post in a channel.
     * Posts are evaluated chronologically (oldest → newest) using a rolling window.
     */
    public function processChannel(Channel $channel): void
    {
        $allPosts = $channel->posts()
            ->orderBy('post_timestamp', 'asc')
            ->get();

        $count = $allPosts->count();

        if ($count === 0) {
            Log::info("OutlierDetectionService: No posts for channel @{$channel->handle}, skipping.");

            return;
        }

        // Separate posts with a valid timestamp (for rolling window) from those without
        $datedPosts = $allPosts->filter(fn ($p) => ! is_null($p->post_timestamp))->values();
        $undatedPosts = $allPosts->filter(fn ($p) => is_null($p->post_timestamp))->values();

        // Posts without a timestamp cannot be meaningfully positioned in the window
        // store engagement_rate only and mark as Insufficient Data
        foreach ($undatedPosts as $post) {
            $post->update([
                'breakout_label' => self::LABEL_INSUFFICIENT,
                'breakout_multiplier' => null,
                'median_baseline' => null,
                'stddev_baseline' => null,
                'engagement_rate' => $this->engagementRate($post),
                'engagement_ratio' => null,
            ]);
        }

        Log::info("OutlierDetectionService: Processing {$datedPosts->count()} dated posts (+ {$undatedPosts->count()} undated) for @{$channel->handle}");

        foreach ($datedPosts as $i => $post) {
            $this->evaluatePost($datedPosts, $i);
        }

        Log::info("OutlierDetectionService: Done for @{$channel->handle}");
    }

    /**
     * Evaluate a single post at index $i within the ordered collection.
     */
    protected function evaluatePost($posts, int $i): void
    {
        $post = $posts[$i];

        // --- Guard: Not enough history yet ---
        if ($i < self::MIN_PREVIOUS_POSTS) {
            $post->update([
                'breakout_label' => self::LABEL_INSUFFICIENT,
                'breakout_multiplier' => null,
                'median_baseline' => null,
                'stddev_baseline' => null,
                'engagement_rate' => $this->engagementRate($post),
                'engagement_ratio' => null,
            ]);

            return;
        }

        // --- Step B: Extract rolling window (up to last WINDOW_SIZE posts) ---
        $startIndex = max(0, $i - self::WINDOW_SIZE);
        $windowPosts = $posts->slice($startIndex, $i - $startIndex)->values();

        // --- Step C: Extract play counts ---
        $baselinePlays = $windowPosts->map(fn ($p) => $this->effectivePlays($p))->toArray();

        // --- Step D: Calculate Median (with floor) ---
        $median = $this->median($baselinePlays);
        if ($median < self::BASELINE_FLOOR) {
            $median = self::BASELINE_FLOOR;
        }

        // --- Step E: Calculate StdDev (population), guard zero ---
        $stddev = $this->pstdev($baselinePlays);
        if ($stddev == 0) {
            $stddev = 1;
        }

        // --- Step F: Calculate Multiplier ---
        $currentPlays = $this->effectivePlays($post);
        $multiplier = $median > 0 ? ($currentPlays / $median) : 0;

        // --- Step G: Absolute Minimum Filter ---
        if ($currentPlays < self::ABSOLUTE_MINIMUM_PLAYS) {
            $post->update([
                'breakout_label' => self::LABEL_NORMAL,
                'breakout_multiplier' => round($multiplier, 4),
                'median_baseline' => round($median, 2),
                'stddev_baseline' => round($stddev, 2),
                'engagement_rate' => $this->engagementRate($post),
                'engagement_ratio' => $this->computeEngagementRatio($post, $windowPosts),
            ]);

            return;
        }

        // --- Step 4: Breakout Classification (check highest first) ---
        $label = $this->classify($currentPlays, $multiplier, $median, $stddev);

        // --- Steps 5-7: Engagement Rate + Rolling Baseline + Ratio Validation ---
        $er = $this->engagementRate($post);
        $erRatio = $this->computeEngagementRatio($post, $windowPosts);

        // Downgrade if engagement ratio < 0.7 (algorithm reach without real engagement)
        if ($erRatio !== null && $erRatio < 0.7) {
            $label = $this->downgrade($label);
        }

        // --- Step 8: Store ---
        $post->update([
            'breakout_label' => $label,
            'breakout_multiplier' => round($multiplier, 4),
            'median_baseline' => round($median, 2),
            'stddev_baseline' => round($stddev, 2),
            'engagement_rate' => $er,
            'engagement_ratio' => $erRatio !== null ? round($erRatio, 4) : null,
        ]);
    }

    /**
     * Classify a post into a label tier (highest first).
     */
    protected function classify(int $currentPlays, float $multiplier, float $median, float $stddev): string
    {
        // 🔴 Explosive
        if (
            $multiplier >= self::EXPLOSIVE_MULTIPLIER
            && $currentPlays > $median + (self::EXPLOSIVE_STDDEV_MULTIPLIER * $stddev)
        ) {
            return self::LABEL_EXPLOSIVE;
        }

        // 🟣 Breakout
        if (
            $multiplier >= self::BREAKOUT_MULTIPLIER
            && $currentPlays > $median + (self::BREAKOUT_STDDEV_MULTIPLIER * $stddev)
        ) {
            return self::LABEL_BREAKOUT;
        }

        // 🔵 Outlier
        if (
            $multiplier >= self::OUTLIER_MULTIPLIER
            && $currentPlays > $median + (self::OUTLIER_STDDEV_MULTIPLIER * $stddev)
        ) {
            return self::LABEL_OUTLIER;
        }

        // 🟢 Strong (no StdDev check needed)
        if ($multiplier >= self::STRONG_MULTIPLIER) {
            return self::LABEL_STRONG;
        }

        return self::LABEL_NORMAL;
    }

    /**
     * Downgrade label by one tier.
     * Explosive → Breakout → Outlier → Strong → Normal
     */
    protected function downgrade(string $label): string
    {
        return match ($label) {
            self::LABEL_EXPLOSIVE => self::LABEL_BREAKOUT,
            self::LABEL_BREAKOUT => self::LABEL_OUTLIER,
            self::LABEL_OUTLIER => self::LABEL_STRONG,
            default => self::LABEL_NORMAL,
        };
    }

    /**
     * Engagement rate for a post: (likes + comments) / plays
     */
    protected function engagementRate(Post $post): ?float
    {
        $plays = $this->effectivePlays($post);
        if ($plays === 0) {
            return null;
        }

        $er = ((int) ($post->likes_count ?? 0) + (int) ($post->comments_count ?? 0)) / $plays;

        return round($er, 6);
    }

    /**
     * Compute engagement ratio: post_er / rolling_median_er
     * Returns null if not computable.
     */
    protected function computeEngagementRatio(Post $post, $windowPosts): ?float
    {
        $postEr = $this->engagementRate($post);

        if ($postEr === null) {
            return null;
        }

        $baselineERs = $windowPosts
            ->map(fn ($p) => $this->engagementRate($p))
            ->filter(fn ($er) => $er !== null)
            ->values()
            ->toArray();

        if (count($baselineERs) === 0) {
            return null;
        }

        $medianEr = $this->median($baselineERs);
        if ($medianEr == 0) {
            return null;
        }

        return round($postEr / $medianEr, 4);
    }

    /**
     * Get the effective play count for a post.
     * Uses the higher of video_play_count and video_view_count (Reels can report both).
     */
    protected function effectivePlays(Post $post): int
    {
        return (int) max(
            (int) ($post->video_play_count ?? 0),
            (int) ($post->video_view_count ?? 0)
        );
    }

    /**
     * Calculate the median of an array of numbers.
     */
    protected function median(array $values): float
    {
        if (empty($values)) {
            return 0;
        }

        sort($values);
        $count = count($values);
        $mid = (int) floor($count / 2);

        if ($count % 2 === 0) {
            return ($values[$mid - 1] + $values[$mid]) / 2;
        }

        return $values[$mid];
    }

    /**
     * Calculate population standard deviation.
     */
    protected function pstdev(array $values): float
    {
        $count = count($values);
        if ($count === 0) {
            return 0;
        }

        $mean = array_sum($values) / $count;
        $sumSq = array_sum(array_map(fn ($v) => ($v - $mean) ** 2, $values));

        return sqrt($sumSq / $count);
    }
}

<?php

namespace App\Console\Commands;

use App\Models\ScriptResearch;
use Illuminate\Console\Command;

class CleanupScriptResearch extends Command
{
    protected $signature = 'script-research:cleanup';

    protected $description = 'Expire stale script research and delete unreferenced artifacts beyond retention';

    public function handle(): int
    {
        $expired = ScriptResearch::query()
            ->where('state', 'active')
            ->where('fresh_until', '<=', now())
            ->update(['state' => 'expired']);

        ScriptResearch::query()
            ->with(['batches:id,script_research_id'])
            ->chunkById(100, function ($artifacts): void {
                foreach ($artifacts as $artifact) {
                    $referenceCount = $artifact->batches()
                        ->withCount('scripts')
                        ->get()
                        ->sum('scripts_count');
                    $artifact->forceFill([
                        'reference_count' => $referenceCount,
                        'is_historical' => $referenceCount > 0,
                    ])->save();
                }
            });

        $deleted = ScriptResearch::query()
            ->where('state', 'expired')
            ->where('is_historical', false)
            ->where('reference_count', 0)
            ->where('fresh_until', '<=', now()->subDays((int) config('script_research.retention_days', 90)))
            ->delete();

        $this->info("Expired {$expired} artifacts and deleted {$deleted} cleanup candidates.");

        return self::SUCCESS;
    }
}

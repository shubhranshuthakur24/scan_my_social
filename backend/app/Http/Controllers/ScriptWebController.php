<?php

namespace App\Http\Controllers;

use App\Models\GeneratedScript;
use App\Models\ScriptGenerationBatch;
use Inertia\Inertia;

class ScriptWebController extends Controller
{
    public function index()
    {
        return Inertia::render('Scripts/Index');
    }

    public function create()
    {
        return Inertia::render('Scripts/Create', [
            'engineOptions' => [
                'platforms' => config('script_engine.platforms'),
                'lengths' => config('script_engine.lengths'),
                'objectives' => config('script_engine.objectives'),
                'problemSuggestions' => config('script_engine.problem_suggestions'),
                'audienceSuggestions' => config('script_engine.audience_suggestions'),
                'tones' => config('script_engine.tones'),
                'contentMixPresets' => config('script_engine.content_mix_presets'),
            ],
        ]);
    }

    public function build(ScriptGenerationBatch $batch)
    {
        $this->authorize('view', $batch);

        $batch->load([
            'angles',
            'selectedAngle',
            'scripts',
            'research.claims.sources',
            'research.sources',
            'supplementalClaims.sources',
            'supplementalSources',
        ]);

        return Inertia::render('Scripts/Build', [
            'batch' => $batch,
        ]);
    }

    public function show(GeneratedScript $script)
    {
        $this->authorize('view', $script);
        $script->load([
            'contentAnalysis.post.channel',
            'generationBatch.research.claims.sources',
            'generationBatch.research.sources',
            'generationBatch.supplementalClaims.sources',
            'generationBatch.supplementalSources',
            'generationBatch.angles',
            'generationBatch.selectedAngle',
            'scriptAngle',
        ]);

        if ($script->generationBatch?->workflow_version === config('script_engine.workflow_version')
            && $script->generationBatch->status !== 'completed') {
            return redirect()->route('scripts.build', $script->generationBatch);
        }

        return Inertia::render('Scripts/Show', [
            'script' => $script,
        ]);
    }
}

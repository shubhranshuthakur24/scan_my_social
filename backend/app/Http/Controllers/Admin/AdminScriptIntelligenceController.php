<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ScriptCtaType;
use App\Models\ScriptHookType;
use App\Models\ScriptObjective;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AdminScriptIntelligenceController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/ScriptIntelligence', [
            'hooks' => ScriptHookType::orderBy('display_order')->get(),
            'ctas' => ScriptCtaType::orderBy('display_order')->get(),
            'objectives' => ScriptObjective::orderBy('display_order')->get(),
        ]);
    }

    // Hooks
    public function storeHook(Request $request)
    {
        $validated = $request->validate([
            'label' => 'required|string|max:255',
            'description' => 'nullable|string',
            'prompt_instruction' => 'required|string',
            'display_order' => 'required|integer|min:1',
            'is_active' => 'required|boolean',
        ]);

        $this->shiftOrders(ScriptHookType::class, $validated['display_order']);

        $validated['slug'] = Str::slug($validated['label']);

        ScriptHookType::create($validated);
        $this->normalizeOrders(ScriptHookType::class);

        return back()->with('success', 'Hook type created successfully.');
    }

    public function updateHook(Request $request, ScriptHookType $hook)
    {
        $validated = $request->validate([
            'label' => 'required|string|max:255',
            'description' => 'nullable|string',
            'prompt_instruction' => 'required|string',
            'display_order' => 'required|integer|min:1',
            'is_active' => 'required|boolean',
        ]);

        $newOrder = (int) $validated['display_order'];
        $oldOrder = $hook->display_order;

        if ($newOrder !== $oldOrder) {
            if ($newOrder > $oldOrder) {
                ScriptHookType::where('display_order', '>', $oldOrder)
                    ->where('display_order', '<=', $newOrder)
                    ->decrement('display_order');
            } else {
                ScriptHookType::where('display_order', '>=', $newOrder)
                    ->where('display_order', '<', $oldOrder)
                    ->increment('display_order');
            }
        }

        $hook->update($validated);
        $this->normalizeOrders(ScriptHookType::class);

        return back()->with('success', 'Hook type updated successfully.');
    }

    public function destroyHook(ScriptHookType $hook)
    {
        $hook->delete();
        $this->normalizeOrders(ScriptHookType::class);

        return back()->with('success', 'Hook type deleted successfully.');
    }

    // CTAs
    public function storeCta(Request $request)
    {
        $validated = $request->validate([
            'label' => 'required|string|max:255',
            'description' => 'nullable|string',
            'prompt_instruction' => 'required|string',
            'display_order' => 'required|integer|min:1',
            'is_active' => 'required|boolean',
        ]);

        $this->shiftOrders(ScriptCtaType::class, $validated['display_order']);

        $validated['slug'] = Str::slug($validated['label']);

        ScriptCtaType::create($validated);
        $this->normalizeOrders(ScriptCtaType::class);

        return back()->with('success', 'CTA type created successfully.');
    }

    public function updateCta(Request $request, ScriptCtaType $cta)
    {
        $validated = $request->validate([
            'label' => 'required|string|max:255',
            'description' => 'nullable|string',
            'prompt_instruction' => 'required|string',
            'display_order' => 'required|integer|min:1',
            'is_active' => 'required|boolean',
        ]);

        $newOrder = (int) $validated['display_order'];
        $oldOrder = $cta->display_order;

        if ($newOrder !== $oldOrder) {
            if ($newOrder > $oldOrder) {
                ScriptCtaType::where('display_order', '>', $oldOrder)
                    ->where('display_order', '<=', $newOrder)
                    ->decrement('display_order');
            } else {
                ScriptCtaType::where('display_order', '>=', $newOrder)
                    ->where('display_order', '<', $oldOrder)
                    ->increment('display_order');
            }
        }

        $cta->update($validated);
        $this->normalizeOrders(ScriptCtaType::class);

        return back()->with('success', 'CTA type updated successfully.');
    }

    public function destroyCta(ScriptCtaType $cta)
    {
        $cta->delete();
        $this->normalizeOrders(ScriptCtaType::class);

        return back()->with('success', 'CTA type deleted successfully.');
    }

    // Objectives
    public function storeObjective(Request $request)
    {
        $validated = $request->validate([
            'label' => 'required|string|max:255',
            'description' => 'nullable|string',
            'prompt_instruction' => 'required|string',
            'display_order' => 'required|integer|min:1',
            'is_active' => 'required|boolean',
        ]);

        $this->shiftOrders(ScriptObjective::class, $validated['display_order']);

        $validated['slug'] = Str::slug($validated['label']);

        ScriptObjective::create($validated);
        $this->normalizeOrders(ScriptObjective::class);

        return back()->with('success', 'Objective created successfully.');
    }

    public function updateObjective(Request $request, ScriptObjective $objective)
    {
        $validated = $request->validate([
            'label' => 'required|string|max:255',
            'description' => 'nullable|string',
            'prompt_instruction' => 'required|string',
            'display_order' => 'required|integer|min:1',
            'is_active' => 'required|boolean',
        ]);

        $newOrder = (int) $validated['display_order'];
        $oldOrder = $objective->display_order;

        if ($newOrder !== $oldOrder) {
            if ($newOrder > $oldOrder) {
                ScriptObjective::where('display_order', '>', $oldOrder)
                    ->where('display_order', '<=', $newOrder)
                    ->decrement('display_order');
            } else {
                ScriptObjective::where('display_order', '>=', $newOrder)
                    ->where('display_order', '<', $oldOrder)
                    ->increment('display_order');
            }
        }

        $objective->update($validated);
        $this->normalizeOrders(ScriptObjective::class);

        return back()->with('success', 'Objective updated successfully.');
    }

    public function destroyObjective(ScriptObjective $objective)
    {
        $objective->delete();
        $this->normalizeOrders(ScriptObjective::class);

        return back()->with('success', 'Objective deleted successfully.');
    }

    private function shiftOrders($modelClass, $startOrder)
    {
        $modelClass::where('display_order', '>=', $startOrder)
            ->increment('display_order');
    }

    private function normalizeOrders($modelClass)
    {
        $items = $modelClass::orderBy('display_order')->get();
        $i = 1;
        foreach ($items as $item) {
            if ($item->display_order !== $i) {
                $item->update(['display_order' => $i]);
            }
            $i++;
        }
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SavedVideoFilter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SavedVideoFilterController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->user()
            ->savedVideoFilters()
            ->latest('id')
            ->get(['id', 'name', 'filters', 'created_at', 'updated_at']);

        return response()->json([
            'data' => $filters,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatePayload($request, true);

        $savedFilter = $request->user()->savedVideoFilters()->create($validated);

        return response()->json([
            'data' => $savedFilter->only(['id', 'name', 'filters', 'created_at', 'updated_at']),
        ], 201);
    }

    public function update(Request $request, SavedVideoFilter $savedVideoFilter): JsonResponse
    {
        $this->ensureOwnership($request, $savedVideoFilter);

        $validated = $this->validatePayload($request, false);

        if ($validated !== []) {
            $savedVideoFilter->update($validated);
        }

        return response()->json([
            'data' => $savedVideoFilter->fresh()->only(['id', 'name', 'filters', 'created_at', 'updated_at']),
        ]);
    }

    public function destroy(Request $request, SavedVideoFilter $savedVideoFilter): JsonResponse
    {
        $this->ensureOwnership($request, $savedVideoFilter);

        $savedVideoFilter->delete();

        return response()->json([
            'message' => 'Saved video filter deleted.',
        ]);
    }

    /**
     * @return array{
     *     name?: string,
     *     filters?: array<string, mixed>
     * }
     */
    private function validatePayload(Request $request, bool $creating): array
    {
        $this->normalizeFiltersPayload($request);

        $nameRules = ['string', 'max:100'];
        if ($creating) {
            array_unshift($nameRules, 'required');
        } else {
            array_unshift($nameRules, 'sometimes');
        }
        $nameRules[] = Rule::unique('saved_video_filters', 'name')
            ->where(fn ($query) => $query->where('user_id', $request->user()->id))
            ->ignore($request->route('savedVideoFilter')?->id);

        $filtersRules = ['array'];
        if ($creating) {
            array_unshift($filtersRules, 'required');
        } else {
            array_unshift($filtersRules, 'sometimes');
        }

        return $request->validate([
            'name' => $nameRules,
            'filters' => $filtersRules,
            'filters.search' => ['nullable', 'string', 'max:255'],
            'filters.platform' => ['nullable', 'array'],
            'filters.platform.*' => ['string', 'in:instagram,youtube,tiktok,linkedin'],
            'filters.creator' => ['nullable', 'array'],
            'filters.creator.*' => ['string', 'max:255'],
            'filters.watchlist' => ['nullable', 'array'],
            'filters.watchlist.*' => ['integer', 'min:1'],
            'filters.label' => ['nullable', 'array'],
            'filters.label.*' => ['string', 'max:50'],
            'filters.engagement_min' => ['nullable', 'numeric', 'min:0'],
            'filters.engagement_max' => ['nullable', 'numeric', 'min:0'],
            'filters.views_min' => ['nullable', 'integer', 'min:0'],
            'filters.views_max' => ['nullable', 'integer', 'min:0'],
            'filters.outlier_min' => ['nullable', 'numeric', 'min:0'],
            'filters.outlier_max' => ['nullable', 'numeric', 'min:0'],
            'filters.date_value' => ['nullable', 'integer', 'min:0'],
            'filters.date_unit' => ['nullable', 'in:Days,Weeks,Months,Years'],
            'filters.sort_by' => ['nullable', 'in:outlier_score,views,engagement_rate,posted_date'],
            'filters.sort_dir' => ['nullable', 'in:asc,desc'],
        ]);
    }

    private function normalizeFiltersPayload(Request $request): void
    {
        $filters = $request->input('filters');
        if (! is_array($filters)) {
            return;
        }

        if (array_key_exists('date_value', $filters)) {
            $rawDateValue = trim((string) ($filters['date_value'] ?? ''));

            if ($rawDateValue === '') {
                $filters['date_value'] = null;
            } else {
                $digitsOnly = preg_replace('/\D+/', '', $rawDateValue);
                $filters['date_value'] = $digitsOnly === '' ? null : (int) $digitsOnly;
            }
        }

        $request->merge([
            'filters' => $filters,
        ]);
    }

    private function ensureOwnership(Request $request, SavedVideoFilter $savedVideoFilter): void
    {
        abort_unless($savedVideoFilter->user_id === $request->user()->id, 403);
    }
}

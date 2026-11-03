<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class LeadController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'source_type' => ['nullable', Rule::in([Lead::SOURCE_FORM_SUBMISSION, Lead::SOURCE_APPOINTMENT_BOOKING])],
            'status' => ['nullable', Rule::in([Lead::STATUS_NEW, Lead::STATUS_BOOKED, Lead::STATUS_CANCELLED, Lead::STATUS_ARCHIVED])],
            'search' => ['nullable', 'string', 'max:120'],
        ]);

        $search = trim((string) ($validated['search'] ?? ''));
        $userId = (int) $request->user()->id;

        $leads = Lead::query()
            ->where('user_id', $userId)
            ->when($validated['source_type'] ?? null, fn ($query, string $sourceType) => $query->where('source_type', $sourceType))
            ->when($validated['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($nested) use ($search): void {
                    $nested
                        ->where('name', 'like', '%'.$search.'%')
                        ->orWhere('email', 'like', '%'.$search.'%')
                        ->orWhere('phone', 'like', '%'.$search.'%')
                        ->orWhere('source_label', 'like', '%'.$search.'%');
                });
            })
            ->latest('captured_at')
            ->latest('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Lead $lead): array => [
                'id' => $lead->id,
                'source_type' => $lead->source_type,
                'source_label' => $lead->source_label,
                'source_id' => $lead->source_id,
                'name' => $lead->name,
                'email' => $lead->email,
                'phone' => $lead->phone,
                'status' => $lead->status,
                'captured_at' => $lead->captured_at?->toIso8601String(),
                'payload' => $lead->payload ?? [],
            ]);

        return Inertia::render('Leads/Index', [
            'filters' => [
                'source_type' => $validated['source_type'] ?? '',
                'status' => $validated['status'] ?? '',
                'search' => $search,
            ],
            'leads' => $leads,
            'source_type_options' => [
                ['value' => Lead::SOURCE_FORM_SUBMISSION, 'label' => 'Lead Form'],
                ['value' => Lead::SOURCE_APPOINTMENT_BOOKING, 'label' => 'Appointment'],
            ],
            'status_options' => [
                ['value' => Lead::STATUS_NEW, 'label' => 'New'],
                ['value' => Lead::STATUS_BOOKED, 'label' => 'Booked'],
                ['value' => Lead::STATUS_CANCELLED, 'label' => 'Cancelled'],
                ['value' => Lead::STATUS_ARCHIVED, 'label' => 'Archived'],
            ],
            'summary' => [
                'total' => Lead::query()->where('user_id', $userId)->count(),
                'new' => Lead::query()->where('user_id', $userId)->where('status', Lead::STATUS_NEW)->count(),
                'booked' => Lead::query()->where('user_id', $userId)->where('status', Lead::STATUS_BOOKED)->count(),
                'cancelled' => Lead::query()->where('user_id', $userId)->where('status', Lead::STATUS_CANCELLED)->count(),
            ],
        ]);
    }
}

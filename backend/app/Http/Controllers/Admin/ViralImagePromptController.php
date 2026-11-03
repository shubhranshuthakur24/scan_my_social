<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\ViralImagePromptRequest;
use App\Models\ViralImagePrompt;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ViralImagePromptController extends Controller
{
    public function index()
    {
        $prompts = ViralImagePrompt::latest()->get();

        return Inertia::render('Admin/ViralImagePrompts/Index', [
            'prompts' => $prompts,
        ]);
    }

    public function show(ViralImagePrompt $viralImagePrompt)
    {
        $relatedPrompts = ViralImagePrompt::query()
            ->whereKeyNot($viralImagePrompt->id)
            ->latest()
            ->limit(6)
            ->get();

        return Inertia::render('Admin/ViralImagePrompts/Show', [
            'prompt' => $viralImagePrompt,
            'relatedPrompts' => $relatedPrompts,
        ]);
    }

    public function manage()
    {
        $prompts = ViralImagePrompt::latest()->get();

        return Inertia::render('Admin/ViralImagePrompts/Manage', [
            'prompts' => $prompts,
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/ViralImagePrompts/Form');
    }

    public function store(ViralImagePromptRequest $request)
    {
        $data = $request->validated();
        unset($data['image_file']);
        $data['slug'] = ViralImagePrompt::createUniqueSlug((string) $data['title']);

        if ($request->hasFile('image_file')) {
            $data['image_path'] = $this->storeImageAndGetUrl($request->file('image_file'));
        }

        ViralImagePrompt::create($data);

        return redirect()->route('viral-image-prompts.manage')
            ->with('success', 'Prompt created successfully.');
    }

    public function edit(ViralImagePrompt $viralImagePrompt)
    {
        return Inertia::render('Admin/ViralImagePrompts/Form', [
            'prompt' => $viralImagePrompt,
        ]);
    }

    public function update(ViralImagePromptRequest $request, ViralImagePrompt $viralImagePrompt)
    {
        $data = $request->validated();
        unset($data['image_file']);

        if ($request->hasFile('image_file')) {
            $this->deleteManagedImage($viralImagePrompt->image_path);
            $data['image_path'] = $this->storeImageAndGetUrl($request->file('image_file'));
        }

        $viralImagePrompt->update($data);

        return redirect()->route('viral-image-prompts.manage')
            ->with('success', 'Prompt updated successfully.');
    }

    public function destroy(ViralImagePrompt $viralImagePrompt)
    {
        $this->deleteManagedImage($viralImagePrompt->image_path);

        $viralImagePrompt->delete();

        return redirect()->route('viral-image-prompts.manage')
            ->with('success', 'Prompt deleted successfully.');
    }

    private function storeImageAndGetUrl(UploadedFile $file): string
    {
        $disk = config('filesystems.upload_disk', 'public');
        $path = $file->store('viral-image-prompts', $disk);

        return Storage::disk($disk)->url($path);
    }

    private function deleteManagedImage(?string $imagePath): void
    {
        if (! $imagePath) {
            return;
        }

        foreach ($this->deletableDisks() as $disk) {
            $resolvedPath = $this->resolveDiskPath($imagePath, $disk);

            if ($resolvedPath !== null) {
                Storage::disk($disk)->delete($resolvedPath);

                return;
            }
        }
    }

    /**
     * @return array<int, string>
     */
    private function deletableDisks(): array
    {
        return array_values(array_unique([
            (string) config('filesystems.upload_disk', 'public'),
            'r2',
            'public',
        ]));
    }

    private function resolveDiskPath(string $imagePath, string $disk): ?string
    {
        if ($disk === 'public') {
            $publicPath = '/storage/';
            if (str_starts_with($imagePath, $publicPath)) {
                return ltrim(Str::after($imagePath, $publicPath), '/');
            }
        }

        if (! filter_var($imagePath, FILTER_VALIDATE_URL)) {
            return null;
        }

        $diskBaseUrl = rtrim((string) Storage::disk($disk)->url(''), '/');
        if ($diskBaseUrl === '' || ! str_starts_with($imagePath, $diskBaseUrl)) {
            return null;
        }

        $relativePath = ltrim(Str::after($imagePath, $diskBaseUrl), '/');

        return $relativePath === '' ? null : $relativePath;
    }
}

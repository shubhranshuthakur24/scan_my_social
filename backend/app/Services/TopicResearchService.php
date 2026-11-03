<?php

namespace App\Services;

use App\Models\Post;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TopicResearchService
{
    /**
     * Conduct research on a topic using web search APIs or database fallback.
     */
    public function conductResearch(string $topic): string
    {
        $topic = trim($topic);
        if ($topic === '') {
            return '';
        }

        Log::info("Conducting content research for topic: '{$topic}'");

        // 1. Tavily Search API
        $tavilyKey = env('TAVILY_API_KEY');
        if (is_string($tavilyKey) && trim($tavilyKey) !== '') {
            try {
                $results = $this->searchWithTavily(trim($tavilyKey), $topic);
                if ($results !== '') {
                    Log::info('Tavily research successfully completed.');

                    return $results;
                }
            } catch (\Throwable $e) {
                Log::warning('Tavily search failed: '.$e->getMessage());
            }
        }

        // 2. Serper Google Search API
        $serperKey = env('SERPER_API_KEY');
        if (is_string($serperKey) && trim($serperKey) !== '') {
            try {
                $results = $this->searchWithSerper(trim($serperKey), $topic);
                if ($results !== '') {
                    Log::info('Serper research successfully completed.');

                    return $results;
                }
            } catch (\Throwable $e) {
                Log::warning('Serper search failed: '.$e->getMessage());
            }
        }

        // 3. Google Custom Search JSON API
        $googleKey = env('GOOGLE_SEARCH_KEY');
        $googleCx = env('GOOGLE_SEARCH_CX');
        if (is_string($googleKey) && trim($googleKey) !== '' && is_string($googleCx) && trim($googleCx) !== '') {
            try {
                $results = $this->searchWithGoogleCustomSearch(trim($googleKey), trim($googleCx), $topic);
                if ($results !== '') {
                    Log::info('Google Custom Search research successfully completed.');

                    return $results;
                }
            } catch (\Throwable $e) {
                Log::warning('Google Custom Search failed: '.$e->getMessage());
            }
        }

        // 4. Fallback to Local database content library
        Log::info('No web search credentials found or requests failed. Falling back to local database search.');

        return $this->searchLocalDatabase($topic);
    }

    /**
     * Search Tavily API.
     */
    protected function searchWithTavily(string $apiKey, string $query): string
    {
        $response = Http::timeout(10)
            ->post('https://api.tavily.com/search', [
                'api_key' => $apiKey,
                'query' => $query,
                'search_depth' => 'basic',
                'max_results' => 5,
                'include_answer' => false,
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException('Tavily returned status '.$response->status().': '.$response->body());
        }

        $results = $response->json('results') ?? [];
        if (empty($results)) {
            return '';
        }

        $context = "=== Web Search Results (Tavily) ===\n";
        foreach ($results as $index => $res) {
            $num = $index + 1;
            $title = $res['title'] ?? 'No Title';
            $url = $res['url'] ?? '';
            $content = $res['content'] ?? '';
            $context .= "Result #{$num}:\nTitle: {$title}\nURL: {$url}\nSnippet: {$content}\n\n";
        }

        return trim($context);
    }

    /**
     * Search Serper API.
     */
    protected function searchWithSerper(string $apiKey, string $query): string
    {
        $response = Http::timeout(10)
            ->withHeaders([
                'X-API-KEY' => $apiKey,
                'Content-Type' => 'application/json',
            ])
            ->post('https://google.serper.dev/search', [
                'q' => $query,
                'num' => 5,
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException('Serper returned status '.$response->status().': '.$response->body());
        }

        $organic = $response->json('organic') ?? [];
        if (empty($organic)) {
            return '';
        }

        $context = "=== Web Search Results (Serper) ===\n";
        foreach ($organic as $index => $item) {
            $num = $index + 1;
            $title = $item['title'] ?? 'No Title';
            $link = $item['link'] ?? '';
            $snippet = $item['snippet'] ?? '';
            $context .= "Result #{$num}:\nTitle: {$title}\nURL: {$link}\nSnippet: {$snippet}\n\n";
        }

        return trim($context);
    }

    /**
     * Search Google Custom Search JSON API.
     */
    protected function searchWithGoogleCustomSearch(string $apiKey, string $cx, string $query): string
    {
        $response = Http::timeout(10)
            ->get('https://www.googleapis.com/customsearch/v1', [
                'key' => $apiKey,
                'cx' => $cx,
                'q' => $query,
                'num' => 5,
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException('Google CSE returned status '.$response->status().': '.$response->body());
        }

        $items = $response->json('items') ?? [];
        if (empty($items)) {
            return '';
        }

        $context = "=== Web Search Results (Google Custom Search) ===\n";
        foreach ($items as $index => $item) {
            $num = $index + 1;
            $title = $item['title'] ?? 'No Title';
            $link = $item['link'] ?? '';
            $snippet = $item['snippet'] ?? '';
            $context .= "Result #{$num}:\nTitle: {$title}\nURL: {$link}\nSnippet: {$snippet}\n\n";
        }

        return trim($context);
    }

    /**
     * Search our own database for high-performing matching posts.
     */
    protected function searchLocalDatabase(string $query): string
    {
        // Clean and search keywords using LIKE query
        $keywords = array_filter(explode(' ', preg_replace('/[^\p{L}\p{N}\s]/u', '', mb_strtolower($query))));
        if (empty($keywords)) {
            return '';
        }

        $postsQuery = Post::query()
            ->with(['contentAnalysis'])
            ->where(function ($q) use ($keywords) {
                foreach ($keywords as $word) {
                    $escapedWord = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $word);
                    $q->orWhere('caption', 'like', "%{$escapedWord}%")
                        ->orWhere('owner_username', 'like', "%{$escapedWord}%");
                }
            });

        // Get top 3 highest-performing matching posts
        $posts = $postsQuery
            ->orderByRaw('COALESCE(video_play_count, likes_count, 0) DESC')
            ->limit(3)
            ->get();

        if ($posts->isEmpty()) {
            return "No local database search results found matching query '{$query}'.";
        }

        $context = "=== Content Library Database Search Results ===\n";
        foreach ($posts as $index => $post) {
            $num = $index + 1;
            $caption = $post->caption ? substr($post->caption, 0, 150).'...' : 'No caption';
            $transcript = $post->contentAnalysis->transcription ?? $post->contentAnalysis->transcript_cleaned ?? '';
            $transcriptSnippet = $transcript !== '' ? substr($transcript, 0, 300).'...' : 'No transcript';
            $perfMetric = $post->video_play_count
                ? 'Plays: '.number_format($post->video_play_count)
                : 'Likes: '.number_format($post->likes_count);

            $context .= "Post #{$num}:\n";
            $context .= "Creator: @{$post->owner_username}\n";
            $context .= "Performance: {$perfMetric}\n";
            $context .= "Caption: {$caption}\n";
            $context .= "Transcript: {$transcriptSnippet}\n\n";
        }

        return trim($context);
    }
}

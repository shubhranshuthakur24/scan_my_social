<?php

namespace Tests\Feature;

use App\Services\OpenAIService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OpenAIWebResearchRequestTest extends TestCase
{
    public function test_web_research_does_not_enable_incompatible_json_mode(): void
    {
        config([
            'services.openai.api_key' => 'test-key',
            'script_research.model' => 'test-model',
        ]);

        Http::fake([
            'api.openai.com/v1/responses' => Http::response([
                'id' => 'resp_test',
                'model' => 'test-model',
                'output_text' => <<<'JSON'
```json
{"topic_summary":"Verified summary","verified_facts":[]}
```
JSON,
                'output' => [
                    [
                        'type' => 'web_search_call',
                        'action' => [
                            'sources' => [
                                [
                                    'title' => 'Official source',
                                    'url' => 'https://example.com/source',
                                ],
                            ],
                        ],
                    ],
                ],
                'usage' => ['input_tokens' => 10],
            ]),
        ]);

        $result = app(OpenAIService::class)->researchTopic('Research this topic and return JSON.');

        $this->assertSame('Verified summary', $result['data']['topic_summary']);
        $this->assertSame(1, $result['usage']['web_search_calls']);

        Http::assertSent(function (Request $request): bool {
            $payload = $request->data();

            return $request->url() === 'https://api.openai.com/v1/responses'
                && ($payload['tools'][0]['type'] ?? null) === 'web_search'
                && ($payload['include'][0] ?? null) === 'web_search_call.action.sources'
                && ! array_key_exists('text', $payload);
        });
    }
}

<?php

namespace App\Logging;

use Illuminate\Support\Facades\Http;
use Monolog\Handler\AbstractProcessingHandler;
use Monolog\Level;
use Monolog\LogRecord;

class SlackSSLFixHandler extends AbstractProcessingHandler
{
    protected $url;

    protected $channel;

    protected $username;

    protected $emoji;

    public function __construct(
        $url,
        $channel = null,
        $username = 'Laravel Log',
        $emoji = ':boom:',
        $level = Level::Debug,
        $bubble = true
    ) {
        parent::__construct($level, $bubble);
        $this->url = $url;
        $this->channel = $channel;
        $this->username = $username;
        $this->emoji = $emoji;
    }

    protected function write(LogRecord $record): void
    {
        if (empty($this->url)) {
            return;
        }

        $postData = [
            'text' => $record->formatted,
            'username' => $this->username,
            'icon_emoji' => $this->emoji,
        ];

        if ($this->channel) {
            $postData['channel'] = $this->channel;
        }

        try {
            Http::withoutVerifying()->timeout(5)->post($this->url, $postData);
        } catch (\Exception $e) {
            // Silently fail to avoid infinite loops, but maybe log to single file if needed
            // Log::channel('single')->error("Slack Logging Failed: " . $e->getMessage());
        }
    }
}

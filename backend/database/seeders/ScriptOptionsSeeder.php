<?php

namespace Database\Seeders;

use App\Models\ScriptCtaType;
use App\Models\ScriptHookType;
use App\Models\ScriptObjective;
use Illuminate\Database\Seeder;

class ScriptOptionsSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedHookTypes();
        $this->seedCtaTypes();
        $this->seedObjectives();

        if ($this->command) {
            $this->command->info('Script options seeded successfully.');
        }
    }

    private function seedHookTypes(): void
    {
        $hookTypes = [
            [
                'slug' => 'problem_setup',
                'label' => 'Problem Setup',
                'description' => 'Opens by describing a relatable pain point or problem.',
                'prompt_instruction' => 'Open by describing a relatable pain point or problem your audience faces. Make it vivid and specific so viewers immediately think "that\'s me". Example: "You\'re losing followers every day and you don\'t even know why..."',
                'display_order' => 1,
            ],
            [
                'slug' => 'reversal',
                'label' => 'Reversal',
                'description' => 'States a common belief, then immediately contradicts it.',
                'prompt_instruction' => 'Open with a reversal pattern   state what everyone believes, then immediately contradict it with a surprising truth. Example structure: "Everyone says X... but actually Y." This creates instant curiosity and pattern interruption.',
                'display_order' => 2,
            ],
            [
                'slug' => 'authority',
                'label' => 'Authority',
                'description' => 'Opens by citing a credible source, statistic, or expert.',
                'prompt_instruction' => 'Open by citing a credible source, statistic, or expert opinion that grabs attention. Use concrete numbers or names. Example: "Google just confirmed...", "A study of 10,000 creators found...", "Harvard researchers discovered..."',
                'display_order' => 3,
            ],
            [
                'slug' => 'direct_address',
                'label' => 'Direct Address',
                'description' => 'Speaks directly to the viewer with "you" or "your".',
                'prompt_instruction' => 'Open by speaking directly to the viewer with "you" or "your". Make them feel personally called out. The viewer should feel like you are pointing at them through the screen. Example: "You\'re doing X wrong and it\'s costing you Y."',
                'display_order' => 4,
            ],
            [
                'slug' => 'number_led',
                'label' => 'Number-Led',
                'description' => 'Opens with a specific number that promises concrete value.',
                'prompt_instruction' => 'Open with a specific number that promises concrete, countable value. Numbers create instant clarity and set expectations. Example: "3 things nobody tells you about...", "₹0 to ₹50K in 30 days   here\'s how.", "5 mistakes killing your reach."',
                'display_order' => 5,
            ],
            [
                'slug' => 'contrast',
                'label' => 'Contrast',
                'description' => 'Contrasts two opposing ideas, states, or outcomes.',
                'prompt_instruction' => 'Open by contrasting two opposing ideas, states, or outcomes. The gap between them creates curiosity. Example: "Others are struggling with X while doing Y. Here\'s the difference...", "Most people do A, but top creators do B."',
                'display_order' => 6,
            ],
        ];

        foreach ($hookTypes as $hookType) {
            ScriptHookType::query()->updateOrCreate(
                ['slug' => $hookType['slug']],
                $hookType
            );
        }
    }

    private function seedCtaTypes(): void
    {
        $ctaTypes = [
            [
                'slug' => 'follow_cta',
                'label' => 'Follow CTA',
                'description' => 'Drives viewers to follow the account.',
                'prompt_instruction' => 'Close by giving a compelling reason to follow. Frame it as missing out on future value: "Follow for more X" or "I post Y every week   follow so you don\'t miss it." Make the viewer feel that following is the smart move.',
                'display_order' => 1,
            ],
            [
                'slug' => 'comment_cta',
                'label' => 'Comment CTA',
                'description' => 'Drives viewers to comment on the post.',
                'prompt_instruction' => 'Close by asking a specific question that\'s easy to answer. Make it opinion-based to lower friction: "Drop your answer below" or "Which one are you? Comment 1 or 2." The question should relate directly to the script topic.',
                'display_order' => 2,
            ],
            [
                'slug' => 'dm_cta',
                'label' => 'DM CTA',
                'description' => 'Drives viewers to send a direct message.',
                'prompt_instruction' => 'Close by offering something exclusive via DM. Create a keyword trigger: "DM me [KEYWORD] and I\'ll send you the full guide." Build curiosity around what they will receive. The keyword should be short and memorable.',
                'display_order' => 3,
            ],
            [
                'slug' => 'save_share_cta',
                'label' => 'Save/Share CTA',
                'description' => 'Drives viewers to save or share the post.',
                'prompt_instruction' => 'Close by reminding viewers to save for later reference or share with someone specific: "Save this before it gets buried" or "Tag someone who needs this." Position the content as too valuable to scroll past.',
                'display_order' => 4,
            ],
            [
                'slug' => 'external_action_cta',
                'label' => 'External Action CTA',
                'description' => 'Drives viewers to take action outside the platform.',
                'prompt_instruction' => 'Close by driving action outside the platform   link in bio, website visit, registration. Make the benefit crystal clear: "Link in bio for the free template." The transition from content to CTA should feel natural, not salesy.',
                'display_order' => 5,
            ],
            [
                'slug' => 'soft_cta',
                'label' => 'Soft CTA',
                'description' => 'Subtle, non-pushy closure that builds trust.',
                'prompt_instruction' => 'Close with a subtle, non-pushy CTA that builds trust and authority. End with a thought-provoking statement or challenge: "Think about that." or "Try this today and see what happens." No explicit ask   let the value speak for itself.',
                'display_order' => 6,
            ],
        ];

        foreach ($ctaTypes as $ctaType) {
            ScriptCtaType::query()->updateOrCreate(
                ['slug' => $ctaType['slug']],
                $ctaType
            );
        }
    }

    private function seedObjectives(): void
    {
        $objectives = [
            [
                'slug' => 'get_more_followers',
                'label' => 'Get More Followers',
                'description' => 'Optimize the script for follow conversion.',
                'prompt_instruction' => 'Optimize for follow conversion. The script should position the creator as someone worth following long-term. End by teasing upcoming value that makes following the obvious next step.',
                'display_order' => 1,
            ],
            [
                'slug' => 'get_more_comments',
                'label' => 'Get More Comments',
                'description' => 'Optimize the script for comment engagement.',
                'prompt_instruction' => 'Optimize for comment engagement. Include a polarizing statement or easy-to-answer question. Frame the CTA as starting a conversation, not demanding a response. Controversial but safe topics drive the most comments.',
                'display_order' => 2,
            ],
            [
                'slug' => 'get_more_saves',
                'label' => 'Get More Saves',
                'description' => 'Optimize the script for saves.',
                'prompt_instruction' => 'Optimize for saves. Pack the script with dense, actionable value that viewers will want to reference later. Make it feel like a cheat sheet or step-by-step guide they will need again.',
                'display_order' => 3,
            ],
            [
                'slug' => 'get_more_shares',
                'label' => 'Get More Shares',
                'description' => 'Optimize the script for shares.',
                'prompt_instruction' => 'Optimize for shares. Make the content broadly relatable so viewers want to tag friends. Include a "tag someone who..." or "share this with..." moment. The content should make the sharer look smart or helpful.',
                'display_order' => 4,
            ],
            [
                'slug' => 'get_more_dms',
                'label' => 'Get More DMs',
                'description' => 'Optimize the script for DM conversion.',
                'prompt_instruction' => 'Optimize for DM conversion. Build curiosity around an exclusive resource, template, or offer. Use a memorable keyword trigger for automated DM response. The promise must be specific and valuable.',
                'display_order' => 5,
            ],
            [
                'slug' => 'get_clicks_or_leads',
                'label' => 'Get Clicks or Leads',
                'description' => 'Optimize for link clicks and lead generation.',
                'prompt_instruction' => 'Optimize for link clicks and lead generation. Build a pain-solution arc where the external resource (link in bio, landing page, free tool) feels like the obvious next step. The script should create urgency without being pushy.',
                'display_order' => 6,
            ],
        ];

        foreach ($objectives as $objective) {
            ScriptObjective::query()->updateOrCreate(
                ['slug' => $objective['slug']],
                $objective
            );
        }
    }
}

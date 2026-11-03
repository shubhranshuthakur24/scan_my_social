<?php

namespace App\Http\Requests\LinkPage;

use App\Models\LinkPage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateLinkPageRequest extends FormRequest
{
    private const MIN_TEXT_CONTRAST_RATIO = 4.5;

    private const MIN_BUTTON_CONTRAST_RATIO = 3.0;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'is_published' => $this->boolean('is_published'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'theme' => ['required', 'string', Rule::in(array_keys(LinkPage::themePresets()))],
            'theme_settings' => ['required', 'array'],
            'theme_settings.background_color' => ['required', 'hex_color'],
            'theme_settings.text_color' => ['required', 'hex_color'],
            'theme_settings.button_background_color' => ['required', 'hex_color'],
            'theme_settings.button_text_color' => ['required', 'hex_color'],
            'theme_settings.button_style' => ['required', 'string', Rule::in(['rounded', 'pill', 'sharp'])],
            'theme_settings.layout' => ['nullable', 'string', Rule::in(['editorial', 'immersive', 'split', 'poster', 'cinematic', 'portrait', 'gallery'])],
            'theme_settings.font_style' => ['nullable', 'string', Rule::in(['sans', 'serif', 'mono'])],
            'theme_settings.cover_image' => ['nullable', 'string', 'max:500'],
            'is_published' => ['required', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $settings = (array) $this->validated('theme_settings', []);
            $backgroundColor = (string) Arr::get($settings, 'background_color', '');
            $textColor = (string) Arr::get($settings, 'text_color', '');
            $buttonBackgroundColor = (string) Arr::get($settings, 'button_background_color', '');
            $buttonTextColor = (string) Arr::get($settings, 'button_text_color', '');

            if ($this->contrastRatio($backgroundColor, $textColor) < self::MIN_TEXT_CONTRAST_RATIO) {
                $validator->errors()->add(
                    'theme_settings.text_color',
                    'Text color contrast is too low against background color. Choose a more readable combination.'
                );
            }

            if ($this->contrastRatio($buttonBackgroundColor, $buttonTextColor) < self::MIN_BUTTON_CONTRAST_RATIO) {
                $validator->errors()->add(
                    'theme_settings.button_text_color',
                    'Button text contrast is too low against button background color. Choose a more readable combination.'
                );
            }
        });
    }

    private function contrastRatio(string $backgroundColor, string $foregroundColor): float
    {
        $backgroundLuminance = $this->relativeLuminance($backgroundColor);
        $foregroundLuminance = $this->relativeLuminance($foregroundColor);
        $lighter = max($backgroundLuminance, $foregroundLuminance);
        $darker = min($backgroundLuminance, $foregroundLuminance);

        return ($lighter + 0.05) / ($darker + 0.05);
    }

    private function relativeLuminance(string $hexColor): float
    {
        $rgb = $this->hexToRgb($hexColor);
        $red = $this->srgbToLinear($rgb['r']);
        $green = $this->srgbToLinear($rgb['g']);
        $blue = $this->srgbToLinear($rgb['b']);

        return (0.2126 * $red) + (0.7152 * $green) + (0.0722 * $blue);
    }

    /**
     * @return array{r: int, g: int, b: int}
     */
    private function hexToRgb(string $hexColor): array
    {
        $normalized = ltrim($hexColor, '#');

        return [
            'r' => (int) hexdec(substr($normalized, 0, 2)),
            'g' => (int) hexdec(substr($normalized, 2, 2)),
            'b' => (int) hexdec(substr($normalized, 4, 2)),
        ];
    }

    private function srgbToLinear(int $channel): float
    {
        $value = $channel / 255;

        if ($value <= 0.03928) {
            return $value / 12.92;
        }

        return (($value + 0.055) / 1.055) ** 2.4;
    }
}

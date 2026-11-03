export const CANONICAL_RATIOS = {
  PORTRAIT_4_5: 4 / 5,     // 0.80 - Instagram portrait
  SQUARE_1_1: 1,           // 1.00 - Instagram square
  LANDSCAPE_1_91: 1.91,    // 1.91 - Instagram landscape
  VERTICAL_9_16: 9 / 16,   // 0.5625 - Story / Reel vertical
} as const;

export const INSTAGRAM_FEED_BOUNDS = {
  min: 0.80,
  max: 1.91,
  tolerance: 0.01,
} as const;

export const CAROUSEL_RULES = {
  minSlides: 2,
  maxSlides: 10,
  consistencyTolerance: 0.02,
} as const;

export type AspectRatioPreset = '4:5' | '1:1' | '1.91:1' | '9:16' | 'free';

export interface AspectRatioClassification {
  ratio: number;
  status: 'too_tall' | 'feed_compliant' | 'too_wide' | 'story_vertical';
  label: string;
  isFeedCompliant: boolean;
  isStoryCompliant: boolean;
  recommendedAction: 'crop_4_5' | 'crop_1_91' | 'switch_story' | 'none';
}

/**
 * Semantically classify an image aspect ratio against Instagram standards.
 */
export function classifyAspectRatio(ratio: number): AspectRatioClassification {
  const rounded = Math.round(ratio * 10000) / 10000;
  const feedMin = INSTAGRAM_FEED_BOUNDS.min - INSTAGRAM_FEED_BOUNDS.tolerance; // 0.79
  const feedMax = INSTAGRAM_FEED_BOUNDS.max + INSTAGRAM_FEED_BOUNDS.tolerance; // 1.92

  if (rounded < feedMin) {
    const isCloseToStory = Math.abs(rounded - CANONICAL_RATIOS.VERTICAL_9_16) < 0.05;
    return {
      ratio: rounded,
      status: 'too_tall',
      label: `Too tall (${rounded.toFixed(2)})`,
      isFeedCompliant: false,
      isStoryCompliant: isCloseToStory || rounded < 0.70,
      recommendedAction: isCloseToStory ? 'switch_story' : 'crop_4_5',
    };
  }

  if (rounded > feedMax) {
    return {
      ratio: rounded,
      status: 'too_wide',
      label: `Too wide (${rounded.toFixed(2)})`,
      isFeedCompliant: false,
      isStoryCompliant: false,
      recommendedAction: 'crop_1_91',
    };
  }

  return {
    ratio: rounded,
    status: 'feed_compliant',
    label: `Compliant (${rounded.toFixed(2)})`,
    isFeedCompliant: true,
    isStoryCompliant: false,
    recommendedAction: 'none',
  };
}

export interface StructuredValidationError {
  code?: string;
  message: string;
  first_slide_ratio?: number;
  mismatched_slides?: Array<{
    media_id: number;
    slide_index: number;
    aspect_ratio: number;
    expected_ratio: number;
    difference: number;
  }>;
  errors?: {
    media?: Array<{
      media_id: number;
      slide_index?: number;
      aspect_ratio: number;
      required: string;
      classification?: string;
      code?: string;
    }>;
    [key: string]: any;
  };
}

export const FPS = 30;
export const VIDEO_SECONDS = 88;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION_IN_FRAMES = VIDEO_SECONDS * FPS;

export type DemoProps = {
  includeVoiceover?: boolean;
  voiceoverPath?: string;
  includeMusic?: boolean;
  musicPath?: string;
};

export type Scene = {
  id: string;
  start: number;
  duration: number;
  eyebrow: string;
  title: string;
  caption: string;
};

export const scenes: Scene[] = [
  {
    id: 'cold-open',
    start: 0,
    duration: 7 * FPS,
    eyebrow: 'Problem',
    title: 'Stop guessing what will work',
    caption:
      'Your competitors already posted the clues. Scan My Social turns those clues into a repeatable content plan.',
  },
  {
    id: 'product-reveal',
    start: 7 * FPS,
    duration: 8 * FPS,
    eyebrow: 'Scan My Social',
    title: 'A content intelligence OS for creators',
    caption:
      'Track channels, detect outlier posts, reverse engineer the winning structure, then generate scripts for your own brand.',
  },
  {
    id: 'channels',
    start: 15 * FPS,
    duration: 12 * FPS,
    eyebrow: 'Step 1',
    title: 'Add the accounts you want to learn from',
    caption:
      'Build watchlists for your niche. The app keeps competitor channels, posts, and performance signals organized.',
  },
  {
    id: 'outliers',
    start: 27 * FPS,
    duration: 13 * FPS,
    eyebrow: 'Step 2',
    title: 'Find the posts that broke the baseline',
    caption:
      'Outlier scoring compares a post against the creator baseline, so you see the frameworks that overperformed.',
  },
  {
    id: 'analysis',
    start: 40 * FPS,
    duration: 13 * FPS,
    eyebrow: 'Step 3',
    title: 'Decode the hook, story, rhythm, and CTA',
    caption:
      'The video analysis view turns raw content into usable creative intelligence, including transcript and structural notes.',
  },
  {
    id: 'scripts',
    start: 53 * FPS,
    duration: 12 * FPS,
    eyebrow: 'Step 4',
    title: 'Generate scripts from proven patterns',
    caption:
      'Use the winning formula as a starting point, then adapt it into fresh scripts built for your audience and offer.',
  },
  {
    id: 'autodm',
    start: 65 * FPS,
    duration: 12 * FPS,
    eyebrow: 'Step 5',
    title: 'Turn engagement into conversations',
    caption:
      'Auto DM and lead forms help convert comments and replies into pipeline while the content is still getting attention.',
  },
  {
    id: 'final',
    start: 77 * FPS,
    duration: 11 * FPS,
    eyebrow: 'Outcome',
    title: 'Content research, creation, and conversion in one flow',
    caption:
      'Scan your niche. Learn what is working. Ship sharper content. Capture the demand it creates.',
  },
];

export const sampleVideos = [
  {
    creator: '@fitcoach.avi',
    title: '3 mistakes killing your morning routine',
    views: '1.8M',
    baseline: '142K',
    score: '12.7x',
    color: '#F43F5E',
  },
  {
    creator: '@growthlab.in',
    title: 'The offer teardown nobody talks about',
    views: '940K',
    baseline: '81K',
    score: '11.6x',
    color: '#7C3AED',
  },
  {
    creator: '@founderclips',
    title: 'I tested 5 hooks on the same reel',
    views: '620K',
    baseline: '74K',
    score: '8.4x',
    color: '#10B981',
  },
  {
    creator: '@creatorops',
    title: 'Steal this content calendar framework',
    views: '488K',
    baseline: '61K',
    score: '8.0x',
    color: '#F59E0B',
  },
];

export const scriptLines = [
  'Open with the pain your audience already feels.',
  'Show the hidden pattern behind the viral post.',
  'Adapt the angle to your offer and proof.',
  'Close with one direct action, not five choices.',
];

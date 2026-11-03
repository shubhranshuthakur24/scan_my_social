import {chromium} from 'playwright';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const screenshotsDir = path.join(projectRoot, 'public', 'screenshots');
const generatedDir = path.join(projectRoot, 'src', 'generated');
const generatedManifestPath = path.join(generatedDir, 'screenshots.ts');

const baseUrl = (process.env.APP_BASE_URL || process.env.VITE_APP_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const email = process.env.DEMO_EMAIL || process.env.APP_DEMO_EMAIL || '';
const password = process.env.DEMO_PASSWORD || process.env.APP_DEMO_PASSWORD || '';
const playwrightChannel = process.env.PLAYWRIGHT_CHANNEL || 'chrome';
const skipLogin = process.env.SKIP_LOGIN === '1';
const videoDetailPath = process.env.DEMO_VIDEO_PATH || (process.env.DEMO_VIDEO_ID ? `/videos/${process.env.DEMO_VIDEO_ID}` : '');

const screenshotKeys = [
  'welcome',
  'pricing',
  'login',
  'dashboard',
  'channels',
  'videos',
  'videoDetail',
  'scripts',
  'projects',
  'leadForms',
  'autodm',
];

const defaultImages = {
  welcome: {path: 'screenshots/welcome.png', captured: false},
  pricing: {path: 'screenshots/pricing.png', captured: false},
  login: {path: 'screenshots/login.png', captured: false},
  dashboard: {path: 'screenshots/dashboard.png', captured: false},
  channels: {path: 'screenshots/channels.png', captured: false},
  videos: {path: 'screenshots/videos.png', captured: false},
  videoDetail: {path: 'screenshots/video-detail.png', captured: false},
  scripts: {path: 'screenshots/scripts.png', captured: false},
  projects: {path: 'screenshots/projects.png', captured: false},
  leadForms: {path: 'screenshots/lead-forms.png', captured: false},
  autodm: {path: 'screenshots/autodm.png', captured: false},
};

const publicTargets = [
  {key: 'welcome', route: '/', fileName: 'welcome.png'},
  {key: 'pricing', route: '/pricing', fileName: 'pricing.png'},
  {key: 'login', route: '/login', fileName: 'login.png'},
];

const protectedTargets = [
  {key: 'dashboard', route: '/dashboard', fileName: 'dashboard.png'},
  {key: 'channels', route: '/channels', fileName: 'channels.png'},
  {key: 'videos', route: '/videos', fileName: 'videos.png'},
  ...(videoDetailPath ? [{key: 'videoDetail', route: videoDetailPath, fileName: 'video-detail.png'}] : []),
  {key: 'scripts', route: '/scripts', fileName: 'scripts.png'},
  {key: 'projects', route: '/projects', fileName: 'projects.png'},
  {key: 'leadForms', route: '/lead-forms', fileName: 'lead-forms.png'},
  {key: 'autodm', route: '/autodm', fileName: 'autodm.png'},
];

const toTsManifest = ({images, capturedAt}) => `export type ScreenshotKey =
  | 'welcome'
  | 'pricing'
  | 'login'
  | 'dashboard'
  | 'channels'
  | 'videos'
  | 'videoDetail'
  | 'scripts'
  | 'projects'
  | 'leadForms'
  | 'autodm';

export type ScreenshotRecord = {
  path: string;
  captured: boolean;
};

export type ScreenshotManifest = {
  available: boolean;
  capturedAt: string | null;
  baseUrl: string | null;
  images: Record<ScreenshotKey, ScreenshotRecord>;
};

export const realAppScreenshots: ScreenshotManifest = ${JSON.stringify(
  {
    available: Object.values(images).some((image) => image.captured),
    capturedAt,
    baseUrl,
    images,
  },
  null,
  2,
)};
`;

const waitForApp = async (page) => {
  const response = await page.goto(`${baseUrl}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });

  if (!response || !response.ok()) {
    throw new Error(`Unable to reach ${baseUrl}. Start the Laravel app before capturing screenshots.`);
  }
};

const stabilizePage = async (page) => {
  await page.addStyleTag({
    content: `
      html { scroll-behavior: auto !important; }
      * { caret-color: transparent !important; }
      ::-webkit-scrollbar { width: 0 !important; height: 0 !important; }
    `,
  });
  await page.waitForLoadState('networkidle', {timeout: 15000}).catch(() => {});
  await page.waitForTimeout(1200);
};

const login = async (page) => {
  if (skipLogin || !email || !password) {
    return false;
  }

  await page.goto(`${baseUrl}/login`, {waitUntil: 'domcontentloaded'});
  await stabilizePage(page);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes('/login'), {timeout: 20000}).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  await stabilizePage(page);

  return !page.url().includes('/login');
};

const captureTarget = async ({page, target, images}) => {
  const url = `${baseUrl}${target.route}`;
  await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 30000});
  await stabilizePage(page);

  const filePath = path.join(screenshotsDir, target.fileName);
  await page.screenshot({
    path: filePath,
    fullPage: false,
    animations: 'disabled',
  });

  images[target.key] = {
    path: `screenshots/${target.fileName}`,
    captured: true,
  };

  console.log(`captured ${target.key}: ${url}`);
};

const main = async () => {
  await mkdir(screenshotsDir, {recursive: true});
  await mkdir(generatedDir, {recursive: true});

  const images = {...defaultImages};
  const browser = await chromium.launch({
    channel: playwrightChannel,
    headless: true,
  });

  try {
    const context = await browser.newContext({
      viewport: {width: 1440, height: 960},
      deviceScaleFactor: 1,
      colorScheme: 'light',
    });
    const page = await context.newPage();

    await waitForApp(page);

    for (const target of publicTargets) {
      await captureTarget({page, target, images});
    }

    const authenticated = await login(page);
    if (authenticated) {
      for (const target of protectedTargets) {
        await captureTarget({page, target, images});
      }
    } else {
      console.warn('Skipped protected app screenshots: set DEMO_EMAIL and DEMO_PASSWORD to capture authenticated pages.');
    }
  } finally {
    await browser.close();
  }

  await writeFile(
    generatedManifestPath,
    toTsManifest({images, capturedAt: new Date().toISOString()}),
  );

  console.log(`wrote ${generatedManifestPath}`);
};

main().catch(async (error) => {
  await mkdir(generatedDir, {recursive: true});
  await writeFile(
    generatedManifestPath,
    toTsManifest({images: defaultImages, capturedAt: null}),
  );
  console.error(error.message);
  process.exitCode = 1;
});

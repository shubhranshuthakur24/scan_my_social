export type ScreenshotKey =
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

export const realAppScreenshots: ScreenshotManifest = {
  "available": false,
  "capturedAt": null,
  "baseUrl": "http://127.0.0.1:8010",
  "images": {
    "welcome": {
      "path": "screenshots/welcome.png",
      "captured": false
    },
    "pricing": {
      "path": "screenshots/pricing.png",
      "captured": false
    },
    "login": {
      "path": "screenshots/login.png",
      "captured": false
    },
    "dashboard": {
      "path": "screenshots/dashboard.png",
      "captured": false
    },
    "channels": {
      "path": "screenshots/channels.png",
      "captured": false
    },
    "videos": {
      "path": "screenshots/videos.png",
      "captured": false
    },
    "videoDetail": {
      "path": "screenshots/video-detail.png",
      "captured": false
    },
    "scripts": {
      "path": "screenshots/scripts.png",
      "captured": false
    },
    "projects": {
      "path": "screenshots/projects.png",
      "captured": false
    },
    "leadForms": {
      "path": "screenshots/lead-forms.png",
      "captured": false
    },
    "autodm": {
      "path": "screenshots/autodm.png",
      "captured": false
    }
  }
};

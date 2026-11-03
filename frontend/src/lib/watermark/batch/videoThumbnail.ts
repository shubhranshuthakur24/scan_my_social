/**
 * Lightweight, high-performance video thumbnail extractor and memory cache
 * for the NLE sequence timeline filmstrip.
 */

const thumbnailCache = new Map<string, string>();
const pendingPromises = new Map<string, Promise<string>>();

/**
 * Returns a cached thumbnail data URL if available.
 */
export function getCachedVideoThumbnail(clipId: string): string | undefined {
  return thumbnailCache.get(clipId);
}

/**
 * Extracts a lightweight poster thumbnail from a video Object URL or File.
 * Sizes the thumbnail to 72px height matching the timeline V1 track height,
 * preserving the source aspect ratio.
 */
export async function extractVideoThumbnail(
  clipId: string,
  videoUrl: string,
  timeSec = 0.5
): Promise<string> {
  if (thumbnailCache.has(clipId)) {
    return thumbnailCache.get(clipId)!;
  }

  if (pendingPromises.has(clipId)) {
    return pendingPromises.get(clipId)!;
  }

  if (typeof window === 'undefined' || !videoUrl) {
    return '';
  }

  const promise = new Promise<string>((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let isDone = false;
    const finish = (dataUrl: string) => {
      if (isDone) return;
      isDone = true;
      video.removeAttribute('src');
      video.load();
      pendingPromises.delete(clipId);
      if (dataUrl) {
        thumbnailCache.set(clipId, dataUrl);
      }
      resolve(dataUrl);
    };

    const timeout = setTimeout(() => {
      finish('');
    }, 4500);

    video.onloadedmetadata = () => {
      const dur = video.duration || 1;
      const targetTime = Math.min(Math.max(0.1, timeSec), Math.max(0.1, dur * 0.15));
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const vW = video.videoWidth || 16;
        const vH = video.videoHeight || 9;
        const aspect = vW / vH;
        const targetHeight = 72;
        const targetWidth = Math.max(36, Math.min(128, Math.round(targetHeight * aspect)));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          finish(dataUrl);
        } else {
          finish('');
        }
      } catch {
        finish('');
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      finish('');
    };

    video.src = videoUrl;
  });

  pendingPromises.set(clipId, promise);
  return promise;
}

/**
 * Image Watermark Adapter
 * Handles format validation, ImageData extraction via OffscreenCanvas / createImageBitmap,
 * synchronous core algorithm execution, and high-fidelity Blob export matching source MIME.
 */

import { removeWatermarkFromImageDataSync } from './core/imageData.js';
import { ImageMetadata } from './types';

export const RECOMMENDED_MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Validates that the file is an image of supported type (PNG, JPEG, WebP).
 */
export function isValidImageFile(file: File): { valid: boolean; reason?: string } {
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
  const fileName = file.name.toLowerCase();
  const hasValidExt = allowedExtensions.some((ext) => fileName.endsWith(ext));
  const hasValidMime =
    file.type === 'image/png' ||
    file.type === 'image/jpeg' ||
    file.type === 'image/webp';

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      reason: 'Unsupported image format. Please select a PNG, JPG, or WebP image.',
    };
  }

  if (file.size > RECOMMENDED_MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      reason: 'File size exceeds 25 MB. Please select a smaller image.',
    };
  }

  return { valid: true };
}

/**
 * Normalizes source image MIME type to one of PNG, JPEG, or WebP.
 */
export function normalizeImageMimeType(
  file: File
): 'image/png' | 'image/jpeg' | 'image/webp' {
  const lower = file.name.toLowerCase();
  if (file.type === 'image/png' || lower.endsWith('.png')) return 'image/png';
  if (file.type === 'image/webp' || lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/**
 * Reads a File into an ImageData object and extracts metadata.
 */
export async function extractImageDataFromFile(file: File): Promise<{
  imageData: ImageData;
  metadata: ImageMetadata;
}> {
  const mimeType = normalizeImageMimeType(file);

  // Modern browsers: createImageBitmap is fast and runs off the main thread
  if (typeof createImageBitmap !== 'undefined') {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    let canvas: OffscreenCanvas | HTMLCanvasElement;
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(width, height);
    } else {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true }) as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D;
    if (!ctx) throw new Error('Failed to acquire 2D canvas rendering context.');

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const imageData = ctx.getImageData(0, 0, width, height);
    return {
      imageData,
      metadata: {
        width,
        height,
        mimeType,
        fileName: file.name,
        size: file.size,
      },
    };
  }

  // Fallback for environments lacking createImageBitmap
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: width, naturalHeight: height } = img;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Failed to acquire canvas context.'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, width, height);
      resolve({
        imageData,
        metadata: {
          width,
          height,
          mimeType,
          fileName: file.name,
          size: file.size,
        },
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image file.'));
    };

    img.src = url;
  });
}

/**
 * Converts an ImageData object back into a Blob matching the source format.
 */
export async function convertImageDataToBlob(
  imageData: ImageData,
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
): Promise<Blob> {
  const { width, height } = imageData;

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
    ctx.putImageData(imageData, 0, 0);

    const quality = mimeType === 'image/jpeg' || mimeType === 'image/webp' ? 0.98 : undefined;
    return canvas.convertToBlob({ type: mimeType, quality });
  }

  // Fallback: DOM Canvas
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas context unavailable for Blob export.'));
      return;
    }
    ctx.putImageData(imageData, 0, 0);

    const quality = mimeType === 'image/jpeg' || mimeType === 'image/webp' ? 0.98 : undefined;
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate image Blob.'));
      },
      mimeType,
      quality
    );
  });
}

/**
 * Synchronously executes the upstream image watermark cleanup pipeline on ImageData.
 */
export function processImageWatermarkSync(
  imageData: ImageData,
  options: { adaptiveMode?: boolean } = {}
) {
  return removeWatermarkFromImageDataSync(imageData, options);
}

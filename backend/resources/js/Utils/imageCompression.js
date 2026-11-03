const MAX_REPLY_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_REPLY_IMAGE_INPUT_BYTES = 10 * 1024 * 1024;
const JPEG_QUALITIES = [0.82, 0.75, 0.68, 0.6, 0.52, 0.45];

const canvasToBlob = (canvas, type, quality) => new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
});

const encodeWithQualities = async (canvas, type, qualities) => {
    for (const quality of qualities) {
        const blob = await canvasToBlob(canvas, type, quality);
        if (blob && blob.size <= MAX_REPLY_IMAGE_BYTES) {
            return blob;
        }
    }
    return null;
};

export const compressImageToJpeg = async (file) => {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    if (typeof bitmap.close === 'function') {
        bitmap.close();
    }

    let blob = await encodeWithQualities(canvas, 'image/jpeg', JPEG_QUALITIES);
    const extension = 'jpg';
    const mimeType = 'image/jpeg';

    if (!blob || blob.size > MAX_REPLY_IMAGE_BYTES) {
        throw new Error('Image must be 2MB or less after compression.');
    }

    const name = `autodm_${Date.now()}_${Math.floor(Math.random() * 10000)}.${extension}`;
    return new File([blob], name, { type: mimeType });
};

export const getReplyImageLimits = () => ({
    maxBytes: MAX_REPLY_IMAGE_BYTES,
    maxInputBytes: MAX_REPLY_IMAGE_INPUT_BYTES,
});

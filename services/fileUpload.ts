import { Attachment } from "../types";

// Requests to the server are limited to about 4 MB, and phone photos are often larger.
// Photos are scaled down so their longest side is at most this many pixels, which is still
// plenty for reading a document.
const MAX_IMAGE_SIDE = 2048;
// Photos smaller than this that also fit within MAX_IMAGE_SIDE are sent unchanged.
const SMALL_IMAGE_BYTES = 1_500_000;
const JPEG_QUALITY = 0.85;

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const base64Of = (dataUrl: string) => dataUrl.split(',')[1] || '';

// Returns a smaller JPEG version of a photo, or null if the original should be sent as is.
async function shrinkImage(file: File): Promise<Blob | null> {
  if (typeof createImageBitmap !== 'function') return null;

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SMALL_IMAGE_BYTES) return null;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff'; // JPEG has no transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    return blob && blob.size < file.size ? blob : null;
  } finally {
    bitmap.close();
  }
}

// Reads a file the user picked, shrinking photos first.
export async function fileToAttachment(file: File): Promise<Attachment> {
  const isPhoto = file.type.startsWith('image/') && file.type !== 'image/gif' && file.type !== 'image/svg+xml';
  if (isPhoto) {
    try {
      const smaller = await shrinkImage(file);
      if (smaller) {
        return { mimeType: 'image/jpeg', data: base64Of(await readAsDataUrl(smaller)), name: file.name };
      }
    } catch (err) {
      // Unsupported format for the browser's decoder: fall back to the original file.
      console.warn('Could not shrink image, sending the original', err);
    }
  }
  return { mimeType: file.type, data: base64Of(await readAsDataUrl(file)), name: file.name };
}

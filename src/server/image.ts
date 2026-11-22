import 'server-only';
import crypto from 'crypto';
import sharp from 'sharp';
import { badRequest } from './http';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Detect the real image type from magic bytes (never trust the extension / client MIME). */
export function sniffImageType(buf: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buf.length > 12) {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  }
  return null;
}

export interface ProcessedImage {
  full: Buffer;
  thumb: Buffer;
  sha256: string; // hash of the ORIGINAL bytes, to detect the same screenshot reused across orders
  sizeBytes: number;
}

/**
 * Validates and re-encodes an uploaded payment screenshot:
 * real-type check, decode (rejects corrupt/malicious files), auto-rotate, drop all metadata
 * (EXIF/GPS), cap dimensions, output WebP.
 */
export async function processPaymentScreenshot(original: Buffer): Promise<ProcessedImage> {
  if (original.length === 0) throw badRequest('Empty file');
  if (original.length > MAX_UPLOAD_BYTES) throw badRequest('File too large (max 10 MB)', 'FILE_TOO_LARGE');
  if (!sniffImageType(original)) {
    throw badRequest('Unsupported file type. Upload a JPG, PNG or WebP image.', 'BAD_FILE_TYPE');
  }

  try {
    // rotate() applies EXIF orientation; sharp drops all metadata on output by default
    const base = sharp(original, { limitInputPixels: 50_000_000 }).rotate();
    const full = await base
      .clone()
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    const thumb = await base
      .clone()
      .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();
    return {
      full,
      thumb,
      sizeBytes: full.length,
      sha256: crypto.createHash('sha256').update(original).digest('hex'),
    };
  } catch {
    throw badRequest('Could not read the image. Please upload a valid screenshot.', 'BAD_IMAGE');
  }
}

export function randomKey(prefix: string, ext = 'webp') {
  return `${prefix}/${crypto.randomBytes(16).toString('hex')}.${ext}`;
}

/** Product photos are public: same safety checks as screenshots, but sized for the shop. */
export async function processProductImage(original: Buffer): Promise<Buffer> {
  if (original.length === 0) throw badRequest('Empty file');
  if (original.length > MAX_UPLOAD_BYTES) throw badRequest('File too large (max 10 MB)', 'FILE_TOO_LARGE');
  if (!sniffImageType(original)) throw badRequest('Unsupported file type. Upload a JPG, PNG or WebP image.', 'BAD_FILE_TYPE');
  try {
    return await sharp(original, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw badRequest('Could not read the image.', 'BAD_IMAGE');
  }
}

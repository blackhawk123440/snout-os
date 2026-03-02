/**
 * Pluggable storage for report media (photos).
 * - Local dev: writes to uploads/ folder, served via /api/uploads
 * - Prod: use S3/R2 when env vars present (add @aws-sdk/client-s3)
 */

import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILES = 5;

// Magic byte signatures (first bytes) for image validation
const MAGIC_JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const MAGIC_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAGIC_WEBP = Buffer.from([0x52, 0x49, 0x46, 0x46]); // RIFF
const MAGIC_WEBP_END = Buffer.from([0x57, 0x45, 0x42, 0x50]); // WEBP at bytes 8-11

export function validateReportMediaFile(
  file: { size: number; type: string },
  currentCount: number
): { ok: boolean; error?: string } {
  if (currentCount >= MAX_FILES) {
    return { ok: false, error: `Maximum ${MAX_FILES} photos allowed` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: 'File too large (max 5MB)' };
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return { ok: false, error: 'Only JPEG, PNG, and WebP images allowed' };
  }
  return { ok: true };
}

/**
 * Validate file magic bytes match claimed MIME type.
 * Rejects spoofed files (e.g. .exe renamed to .jpg).
 */
export function validateReportMediaMagicBytes(
  buffer: Buffer,
  claimedMime: string
): { ok: boolean; error?: string } {
  if (buffer.length < 12) {
    return { ok: false, error: 'File too small to validate' };
  }
  if (claimedMime === 'image/jpeg') {
    if (!buffer.subarray(0, 3).equals(MAGIC_JPEG)) {
      return { ok: false, error: 'Invalid JPEG file signature' };
    }
  } else if (claimedMime === 'image/png') {
    if (!buffer.subarray(0, 8).equals(MAGIC_PNG)) {
      return { ok: false, error: 'Invalid PNG file signature' };
    }
  } else if (claimedMime === 'image/webp') {
    if (!buffer.subarray(0, 4).equals(MAGIC_WEBP) || !buffer.subarray(8, 12).equals(MAGIC_WEBP_END)) {
      return { ok: false, error: 'Invalid WebP file signature' };
    }
  } else {
    return { ok: false, error: 'Unsupported file type' };
  }
  return { ok: true };
}

export function getMaxFiles(): number {
  return MAX_FILES;
}

/** Local storage: write to uploads/ folder */
async function getUploadsDir(): Promise<string> {
  const root = process.cwd();
  const dir = path.join(root, 'uploads', 'report-media');
  await mkdir(dir, { recursive: true });
  return dir;
}

function getExtension(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return map[mime] || 'bin';
}

/**
 * Upload a file buffer to local storage.
 * Returns a path like "orgId/bookingId/uuid.ext" - caller builds full URL.
 */
export async function uploadReportMediaLocal(
  buffer: Buffer,
  mimeType: string,
  orgId: string,
  bookingId: string
): Promise<string> {
  const dir = await getUploadsDir();
  const ext = getExtension(mimeType);
  const key = `${orgId}/${bookingId}/${randomUUID()}.${ext}`;
  const fullPath = path.join(dir, key);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);
  return key;
}

/**
 * Check if S3 is configured (for future use).
 * When S3 env vars are present, we could use @aws-sdk/client-s3 here.
 */
function isS3Configured(): boolean {
  return !!(
    process.env.S3_BUCKET &&
    process.env.S3_REGION &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  );
}

/**
 * Upload report media. Uses local storage when S3 is not configured.
 */
export async function uploadReportMedia(
  buffer: Buffer,
  mimeType: string,
  orgId: string,
  bookingId: string
): Promise<string> {
  if (isS3Configured()) {
    // TODO: Add @aws-sdk/client-s3 and implement S3 upload
    // For now, fall back to local
  }
  return uploadReportMediaLocal(buffer, mimeType, orgId, bookingId);
}

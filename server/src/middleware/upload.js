import multer from 'multer';
import { AppError } from '../utils/AppError.js';

const ALLOWED = { 'image/jpeg': [[0xff, 0xd8, 0xff]], 'image/png': [[0x89, 0x50, 0x4e, 0x47]], 'image/webp': [[0x52, 0x49, 0x46, 0x46]] };
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 6 },
  fileFilter: (_req, file, cb) =>
    ALLOWED[file.mimetype] ? cb(null, true) : cb(new AppError('Only JPEG, PNG or WebP images are allowed', 400, 'INVALID_FILE_TYPE')),
});

// Verifies the real file signature, not just the client-declared mimetype.
export function assertImageSignature(file) {
  const sigs = ALLOWED[file.mimetype];
  const ok = sigs?.some((sig) => sig.every((b, i) => file.buffer[i] === b)) &&
    (file.mimetype !== 'image/webp' || file.buffer.subarray(8, 12).toString() === 'WEBP');
  if (!ok) throw new AppError('File content does not match its image type', 400, 'INVALID_FILE_CONTENT');
}

// Express middleware: run after multer. Rejects spoofed files before any storage call.
export function verifyUploads(req, _res, next) {
  try { for (const f of req.files || []) assertImageSignature(f); next(); } catch (e) { next(e); }
}

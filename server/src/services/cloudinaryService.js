import { v2 as cloudinary } from 'cloudinary';
import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { assertImageSignature } from '../middleware/upload.js';

let configured = false;
function ensure() {
  if (!env.cloudinaryConfigured) throw new AppError('Image uploads are not configured (Cloudinary credentials missing)', 503, 'UPLOAD_NOT_CONFIGURED');
  if (!configured) {
    cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET, secure: true });
    configured = true;
  }
}

export const resetCloudinary = () => { configured = false; };

export async function uploadImage(file, subfolder = 'misc') {
  assertImageSignature(file);
  ensure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `${env.CLOUDINARY_FOLDER}/${subfolder}`, resource_type: 'image', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], overwrite: false },
      (err, result) => (err ? reject(new AppError('Image upload failed', 502, 'UPLOAD_FAILED')) : resolve({ url: result.secure_url, publicId: result.public_id })),
    );
    stream.end(file.buffer);
  });
}

export async function deleteImage(publicId) {
  if (!publicId || !env.cloudinaryConfigured) return;
  ensure();
  try { await cloudinary.uploader.destroy(publicId); } catch { /* best effort */ }
}

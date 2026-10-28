import { ZodError } from 'zod';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import env from '../config/env.js';

export const notFoundHandler = (req, _res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl.split('?')[0]}`);
  err.status = 404; err.code = 'ROUTE_NOT_FOUND'; err.expose = true;
  next(err);
};

export function errorHandler(err, req, res, _next) {
  let status = err.status || err.statusCode || 500;
  let code = err.code && typeof err.code === 'string' ? err.code : 'INTERNAL_ERROR';
  let message = err.expose ? err.message : 'Something went wrong. Please try again.';
  let details = err.details;

  if (err instanceof ZodError) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Validation failed';
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    message = details[0] ? `${details[0].field ? details[0].field + ': ' : ''}${details[0].message}` : message;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400; code = 'VALIDATION_ERROR';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = details[0]?.message || 'Validation failed';
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400; code = 'INVALID_ID'; message = 'Invalid identifier';
  } else if (err.code === 11000) {
    status = 409; code = 'DUPLICATE';
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'value';
    message = `A record with this ${field} already exists`;
  } else if (err.name === 'MulterError') {
    status = 400; code = 'UPLOAD_ERROR';
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 5 MB)' : err.message;
  } else if (err.type === 'entity.parse.failed') {
    status = 400; code = 'INVALID_JSON'; message = 'Malformed JSON body';
  }
  if (typeof code !== 'string' || /^E[A-Z]+$/.test(code)) code = 'INTERNAL_ERROR';
  if (status >= 500) logger.error({ err, path: req.path }, 'Unhandled error');
  else logger.debug({ code, path: req.path }, message);
  res.status(status).json({
    success: false, message, code,
    ...(details ? { details } : {}),
    ...(!env.isProd && status >= 500 ? { stack: err.stack } : {}),
  });
}

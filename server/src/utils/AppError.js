export class AppError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST', details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = true;
  }
}
export const notFound = (what = 'Resource') => new AppError(`${what} not found`, 404, 'NOT_FOUND');
export const forbidden = (msg = 'You do not have permission to perform this action') => new AppError(msg, 403, 'FORBIDDEN');
export const unauthorized = (msg = 'Authentication required') => new AppError(msg, 401, 'UNAUTHENTICATED');
export const conflict = (msg, code = 'CONFLICT') => new AppError(msg, 409, code);

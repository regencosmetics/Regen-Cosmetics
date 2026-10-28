import pino from 'pino';
import env from '../config/env.js';

export const logger = pino({
  level: env.isTest && !process.env.LOG_TEST ? 'silent' : env.isProd ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]',
      '*.password', '*.passwordHash', '*.token', '*.resetToken', '*.RESEND_API_KEY',
      '*.RAZORPAY_KEY_SECRET', '*.razorpay_signature', '*.accountNumber',
    ],
    censor: '[redacted]',
  },
});
export default logger;

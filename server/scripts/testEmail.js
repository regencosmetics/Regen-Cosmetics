// Sends ONE real email through Resend to verify your key and sender domain:  npm run email:test -- you@example.com
import env from '../src/config/env.js';
import { getClient } from '../src/services/emailService.js';

const to = process.argv[2];
if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { console.error('Usage: npm run email:test -- recipient@example.com'); process.exit(2); }
const rs = getClient();
if (!rs) { console.error('RESEND_API_KEY is not set in server/.env - nothing was sent.'); process.exit(1); }
const { data, error } = await rs.emails.send({
  from: env.EMAIL_FROM, to: [to], subject: 'REGEN Cosmetics: email test',
  html: '<p>This is a test email from your REGEN Cosmetics store. Email delivery through Resend is working.</p>', text: 'Test email from your REGEN Cosmetics store. Email delivery through Resend is working.',
});
if (error) { console.error(`Resend rejected the email: ${error.name}: ${error.message}`); process.exit(1); }
console.log(`Accepted by Resend (id ${data.id}). Check the inbox of ${to} and the Resend dashboard for delivery status.`);

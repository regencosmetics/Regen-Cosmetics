// Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed:admin
// Idempotent: never creates a second admin for the same email and never overwrites an existing password unless --reset-password is passed.
import bcrypt from 'bcryptjs';
import env from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { User } from '../src/models/index.js';
import { password as passwordSchema } from '../src/validators/index.js';

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const pass = process.env.ADMIN_PASSWORD || '';
if (!email || !pass) { console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set (environment or server/.env).'); process.exit(1); }
const check = passwordSchema.safeParse(pass);
if (!check.success) { console.error(`ADMIN_PASSWORD is too weak: ${check.error.issues[0].message}`); process.exit(1); }

await connectDb();
const existing = await User.findOne({ email }).select('+passwordHash');
if (existing) {
  if (existing.role !== 'admin') { console.error('A non-admin account already uses this email. Refusing to promote it automatically.'); await disconnectDb(); process.exit(1); }
  if (process.argv.includes('--reset-password')) { existing.passwordHash = await bcrypt.hash(pass, 12); existing.passwordChangedAt = new Date(); await existing.save(); console.log(`Admin password reset for ${email}.`); }
  else console.log(`Admin ${email} already exists. Nothing changed.`);
} else {
  await User.create({ name: env.ADMIN_NAME, email, phone: '9000000000', passwordHash: await bcrypt.hash(pass, 12), role: 'admin' });
  console.log(`Admin created: ${email}`);
}
await disconnectDb();

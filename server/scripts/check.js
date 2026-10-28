// Syntax + import-graph check: imports every server module so missing imports / bad exports fail fast.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/check';
process.env.JWT_SECRET ||= 'check-check-check-check-check';
process.env.COOKIE_SECRET ||= 'check-check-check-check-check';
const root = path.resolve('src');
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') && !p.endsWith('server.js') && files.push(p); } })(root);
let bad = 0;
for (const f of files) { try { await import(pathToFileURL(f)); } catch (e) { bad++; console.error(`FAIL ${path.relative(root, f)}: ${e.message}`); } }
console.log(`${files.length - bad}/${files.length} modules import cleanly`);
process.exit(bad ? 1 : 0);

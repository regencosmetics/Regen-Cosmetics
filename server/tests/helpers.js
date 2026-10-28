import mongoose from 'mongoose';
import request from 'supertest';

export async function startDb() {
  const uri = process.env.TEST_MONGODB_URI;
  if (uri) { await mongoose.connect(uri); await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes())); return null; }
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('regen_test'));
  return mem;
}
export async function stopDb(mem) { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); if (mem) await mem.stop(); }
export async function resetDb() { await mongoose.connection.dropDatabase(); await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes())); }

// supertest agent that keeps cookies and sends the CSRF header like the real client does
export async function client(app) {
  const agent = request.agent(app);
  const r = await agent.get('/api/v1/auth/csrf');
  const token = r.body.data.csrfToken;
  const wrap = {};
  for (const m of ['get', 'delete']) wrap[m] = (url) => agent[m](url).set('X-CSRF-Token', token);
  for (const m of ['post', 'put', 'patch']) wrap[m] = (url, body) => { const t = agent[m](url).set('X-CSRF-Token', token); return body === undefined ? t : t.send(body); };
  wrap.raw = agent; wrap.token = token;
  return wrap;
}

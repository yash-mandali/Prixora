// Requires a real MongoDB: MONGODB_URI_TEST=mongodb://127.0.0.1:27017/pricewatch_test npm run test:integration
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

const uri = process.env.MONGODB_URI_TEST;
const skip = !uri && 'set MONGODB_URI_TEST to run integration tests';
if (uri) {
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = 'y'.repeat(48);
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_PRIVATE_URLS = 'true';
  process.env.MIN_INTERVAL_MINUTES = '1';
}
let request, mongoose, app, claimNextTask, sweepLifecycle, MonitoringTask;

before(async () => {
  if (!uri) return;
  request = (await import('supertest')).default;
  mongoose = (await import('mongoose')).default;
  const { connectDatabase } = await import('../../src/config/database.js');
  await connectDatabase();
  await mongoose.connection.dropDatabase();
  app = (await import('../../src/app.js')).createApp();
  ({ claimNextTask } = await import('../../src/background/task-claimer.js'));
  ({ sweepLifecycle } = await import('../../src/background/lifecycle.sweeper.js'));
  ({ MonitoringTask } = await import('../../src/models/MonitoringTask.js'));
});
after(async () => { if (uri) await mongoose.disconnect(); });

const iso = (h) => new Date(Date.now() + h * 3600e3).toISOString();
const body = () => ({ productUrl: 'https://shop.example.com/p/1', monitoringType: 'TargetPrice', targetPrice: 60000, startDate: iso(-1), endDate: iso(48), intervalMinutes: 60 });
async function signup(email) {
  const r = await request(app).post('/api/auth/register').send({ name: 'Test', email, password: 'password123' });
  assert.equal(r.status, 201);
  return r.body.data.token;
}

test('auth: duplicate email, bad login, missing/invalid JWT', { skip }, async () => {
  await signup('a@test.dev');
  assert.equal((await request(app).post('/api/auth/register').send({ name: 'T', email: 'a@test.dev', password: 'password123' })).status, 409);
  assert.equal((await request(app).post('/api/auth/login').send({ email: 'a@test.dev', password: 'wrong-pass' })).status, 401);
  assert.equal((await request(app).get('/api/auth/me')).status, 401);
  assert.equal((await request(app).get('/api/auth/me').set('Authorization', 'Bearer nope')).status, 401);
});

test('authorization: user B cannot read/update/delete user A task', { skip }, async () => {
  const a = await signup('own@test.dev'); const b = await signup('other@test.dev');
  const created = await request(app).post('/api/monitoring').set('Authorization', `Bearer ${a}`).send(body());
  assert.equal(created.status, 201);
  const id = created.body.data.id;
  for (const [m, p] of [['get', ''], ['put', ''], ['delete', ''], ['post', '/pause'], ['post', '/cancel'], ['get', '/history']]) {
    const r = await request(app)[m](`/api/monitoring/${id}${p}`).set('Authorization', `Bearer ${b}`).send(body());
    assert.equal(r.status, 404, `${m} ${p}`);
  }
});

test('lifecycle: pause -> resume -> cancel; cancelled is never claimable', { skip }, async () => {
  const t = await signup('life@test.dev');
  const H = { Authorization: `Bearer ${t}` };
  const id = (await request(app).post('/api/monitoring').set(H).send(body())).body.data.id;
  assert.equal((await request(app).post(`/api/monitoring/${id}/pause`).set(H)).body.data.status, 'Paused');
  assert.equal((await request(app).post(`/api/monitoring/${id}/pause`).set(H)).status, 409);
  assert.equal((await request(app).post(`/api/monitoring/${id}/resume`).set(H)).body.data.status, 'Running');
  await request(app).post(`/api/monitoring/${id}/cancel`).set(H);
  await MonitoringTask.updateOne({ _id: id }, { $set: { nextCheckAt: new Date(Date.now() - 1000) } });
  assert.equal(await claimNextTask('w1', 60000), null);
});

test('claim is atomic: concurrent workers get each due task exactly once', { skip }, async () => {
  await MonitoringTask.deleteMany({});
  const t = await signup('claim@test.dev');
  const id = (await request(app).post('/api/monitoring').set({ Authorization: `Bearer ${t}` }).send(body())).body.data.id;
  await MonitoringTask.updateOne({ _id: id }, { $set: { nextCheckAt: new Date(Date.now() - 1000) } });
  const results = await Promise.all(Array.from({ length: 8 }, (_, i) => claimNextTask(`w${i}`, 60000)));
  assert.equal(results.filter(Boolean).length, 1);
});

test('lifecycle sweep: expired/completed by end date; paused and pending never run', { skip }, async () => {
  await MonitoringTask.deleteMany({});
  const t = await signup('sweep@test.dev');
  const H = { Authorization: `Bearer ${t}` };
  const running = (await request(app).post('/api/monitoring').set(H).send(body())).body.data.id;
  const paused = (await request(app).post('/api/monitoring').set(H).send(body())).body.data.id;
  await request(app).post(`/api/monitoring/${paused}/pause`).set(H);
  const past = new Date(Date.now() - 1000);
  await MonitoringTask.updateMany({ _id: { $in: [running, paused] } }, { $set: { endDate: past, nextCheckAt: past } });
  assert.equal(await claimNextTask('w', 60000), null); // expired window => not claimable
  await sweepLifecycle();
  assert.equal((await MonitoringTask.findById(running)).status, 'Completed');
  assert.equal((await MonitoringTask.findById(paused)).status, 'Expired');
});

test('validation: bad range, bad dates, unsafe URL', { skip }, async () => {
  const t = await signup('val@test.dev');
  const H = { Authorization: `Bearer ${t}` };
  const bad = (o) => request(app).post('/api/monitoring').set(H).send({ ...body(), ...o });
  assert.equal((await bad({ monitoringType: 'PriceRange', targetPrice: undefined, minimumPrice: 70000, maximumPrice: 60000 })).status, 422);
  assert.equal((await bad({ endDate: iso(-5) })).status, 422);
  assert.equal((await bad({ productUrl: 'ftp://x.com/a' })).status, 422);
  assert.equal((await bad({ monitoringType: 'PercentageDrop' })).status, 422);
});

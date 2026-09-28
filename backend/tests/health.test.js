const request = require('supertest');
const app = require('../src/app');

describe('System Health & Foundation Tests (Phase 0)', () => {
  it('GET /api/v1/health returns system status and headers', async () => {
    const res = await request(app).get('/api/v1/health');

    // Headers check (FR-130 Request ID)
    expect(res.headers['x-request-id']).toBeDefined();

    // Body envelope check (FR-126)
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('service', 'CareerPilot API');
    expect(res.body.data).toHaveProperty('version', '1.0.0');
    expect(res.body.data).toHaveProperty('database');
  });

  it('GET unmapped route returns standard 404 error envelope', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint-test');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body.error).toHaveProperty('requestId');
    expect(typeof res.body.error.message).toBe('string');
  });

  it('POST with malformed JSON returns standard 400 INVALID_JSON envelope', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"invalidJson": ');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'INVALID_JSON');
    expect(res.body.error).toHaveProperty('requestId');
  });
});

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Application = require('../src/models/Application');
const ApplicationHistory = require('../src/models/ApplicationHistory');
const Resume = require('../src/models/Resume');
const Interview = require('../src/models/Interview');
const Notification = require('../src/models/Notification');
const InterviewSession = require('../src/models/InterviewSession');

describe('Module H & Security: Data Management, Hardening and Deletion Tests', () => {
  let userAToken = '';
  let userBToken = '';
  let userAId = '';
  let userBId = '';

  const userAPassword = 'Password123';
  const userAEmail = 'phase8.user.a@test.com';
  const userBEmail = 'phase8.user.b@test.com';

  beforeAll(async () => {
    // Clean up any leftovers
    await User.deleteMany({ email: { $in: [userAEmail, userBEmail] } });

    // Register User A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'User A Security',
        email: userAEmail,
        password: userAPassword,
        passwordConfirmation: userAPassword
      });
    userAToken = resA.body.data.accessToken;
    userAId = resA.body.data.user._id;

    // Register User B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'User B Security',
        email: userBEmail,
        password: userAPassword,
        passwordConfirmation: userAPassword
      });
    userBToken = resB.body.data.accessToken;
    userBId = resB.body.data.user._id;

    // Create applications for User A, including potential CSV formula injection payloads
    await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        companyName: '=SUM(1+1)', // Formula injection test
        jobTitle: '+cmd|calc',   // Formula injection test
        location: '-MinusLocation',
        status: 'applied',
        notes: '@FormulaNote'
      });

    await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        companyName: 'Acme Normal Corp',
        jobTitle: 'Software Engineer',
        location: 'Remote',
        status: 'interview',
        notes: 'Normal plain notes'
      });

    // Create application for User B
    await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        companyName: 'Secret Company B',
        jobTitle: 'Confidential Lead',
        status: 'wishlist'
      });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: [userAEmail, userBEmail] } });
    await Application.deleteMany({ userId: { $in: [userAId, userBId] } });
    await ApplicationHistory.deleteMany({ userId: { $in: [userAId, userBId] } });
    await Resume.deleteMany({ userId: { $in: [userAId, userBId] } });
    await Interview.deleteMany({ userId: { $in: [userAId, userBId] } });
    await Notification.deleteMany({ userId: { $in: [userAId, userBId] } });
    await InterviewSession.deleteMany({ userId: { $in: [userAId, userBId] } });
  });

  // 1. CSV Export for Applications Tests
  describe('GET /api/v1/applications/export/csv', () => {
    it('requires authentication (FR-013)', async () => {
      const res = await request(app).get('/api/v1/applications/export/csv');
      expect(res.status).toBe(401);
    });

    it('returns CSV with text/csv content type and UTF-8 BOM (FR-117, FR-119, FR-125)', async () => {
      const res = await request(app)
        .get('/api/v1/applications/export/csv')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="careerpilot-applications-/);

      // Verify UTF-8 BOM
      expect(res.text.startsWith('\uFEFF')).toBe(true);

      // Verify Headers
      expect(res.text).toContain('Application ID');
      expect(res.text).toContain('Company Name');
      expect(res.text).toContain('Job Title');
      expect(res.text).toContain('Location');
      expect(res.text).toContain('Status');

      // Verify User A applications are present
      expect(res.text).toContain('Acme Normal Corp');
      expect(res.text).toContain('Software Engineer');

      // Verify User B application is NOT present (strict data isolation FR-149)
      expect(res.text).not.toContain('Secret Company B');
    });

    it('neutralizes spreadsheet formula injection by prefixing with a single quote (FR-119)', async () => {
      const res = await request(app)
        .get('/api/v1/applications/export/csv')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);

      // Values starting with =, +, -, @ must be prefixed with single quote (')
      expect(res.text).toContain("'=SUM(1+1)");
      expect(res.text).toContain("'+cmd|calc");
      expect(res.text).toContain("'-MinusLocation");
      expect(res.text).toContain("'@FormulaNote");
    });
  });

  // 2. CSV Export for Status History Tests
  describe('GET /api/v1/applications/export/history-csv', () => {
    it('returns application status history as CSV (FR-118, FR-119)', async () => {
      const res = await request(app)
        .get('/api/v1/applications/export/history-csv')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text.startsWith('\uFEFF')).toBe(true);

      expect(res.text).toContain('Application ID');
      expect(res.text).toContain('Company Name');
      expect(res.text).toContain('Event Type');
      expect(res.text).toContain('From Status');
      expect(res.text).toContain('To Status');
      expect(res.text).toContain('Timestamp');
    });
  });

  // 3. Security Hardening: MongoDB Operator Injection
  describe('Security: MongoDB Operator Injection Sanitization (NFR-SEC-06)', () => {
    it('strips keys starting with $ or containing . from request body', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          headline: 'Valid Headline',
          $where: 'sleep(1000)',
          'user.admin': true
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.headline).toBe('Valid Headline');

      // The malicious keys should not exist anywhere in database document
      const user = await User.findById(userAId).lean();
      expect(user.$where).toBeUndefined();
      expect(user['user.admin']).toBeUndefined();
    });
  });

  // 4. Account Deletion and Cascading Erasure Tests
  describe('DELETE /api/v1/users/me', () => {
    it('rejects deletion with invalid confirmation string (FR-121)', async () => {
      const res = await request(app)
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          password: userAPassword,
          confirmation: 'delete' // lowercase should fail
        });

      expect(res.status).toBe(400);
    });

    it('rejects deletion with wrong password (FR-121)', async () => {
      const res = await request(app)
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          password: 'WrongPassword999',
          confirmation: 'DELETE'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('permanently deletes account and cascades deletion across all collections (FR-121, FR-122, FR-123)', async () => {
      // Create associated test records for User A
      await Interview.create({
        userId: userAId,
        title: 'Cascade Test Interview',
        type: 'interview',
        startAt: new Date(),
        timezone: 'UTC'
      });

      await Notification.create({
        userId: userAId,
        type: 'system',
        title: 'Test Notification',
        message: 'This will be deleted'
      });

      await InterviewSession.create({
        userId: userAId,
        roleTitle: 'Full Stack Engineer',
        experienceLevel: 'senior',
        questionTypes: ['technical'],
        questions: []
      });

      // Confirm documents exist before deletion
      expect(await Application.countDocuments({ userId: userAId })).toBeGreaterThan(0);
      expect(await ApplicationHistory.countDocuments({ userId: userAId })).toBeGreaterThan(0);
      expect(await Interview.countDocuments({ userId: userAId })).toBeGreaterThan(0);
      expect(await Notification.countDocuments({ userId: userAId })).toBeGreaterThan(0);
      expect(await InterviewSession.countDocuments({ userId: userAId })).toBeGreaterThan(0);

      // Perform deletion
      const res = await request(app)
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          password: userAPassword,
          confirmation: 'DELETE'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify User document is deleted
      const deletedUser = await User.findById(userAId);
      expect(deletedUser).toBeNull();

      // Verify cascading erasure across ALL collections (FR-121)
      expect(await Application.countDocuments({ userId: userAId })).toBe(0);
      expect(await ApplicationHistory.countDocuments({ userId: userAId })).toBe(0);
      expect(await Interview.countDocuments({ userId: userAId })).toBe(0);
      expect(await Notification.countDocuments({ userId: userAId })).toBe(0);
      expect(await InterviewSession.countDocuments({ userId: userAId })).toBe(0);

      // User B data remains intact (isolation)
      expect(await Application.countDocuments({ userId: userBId })).toBe(1);

      // Former token can no longer authenticate (FR-123)
      const accessRes = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${userAToken}`);
      expect(accessRes.status).toBe(401);
      expect(accessRes.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});

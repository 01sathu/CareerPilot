const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Application = require('../src/models/Application');
const Resume = require('../src/models/Resume');
const Interview = require('../src/models/Interview');
const InterviewSession = require('../src/models/InterviewSession');
const Notification = require('../src/models/Notification');
const storageService = require('../src/services/storage.service');

describe('Security Audit & Vulnerability Regression Suite', () => {
  let userAToken = '';
  let userBToken = '';
  let userAId = '';
  let userBId = '';
  let userAAppId = '';
  let userAInterviewId = '';

  beforeAll(async () => {
    // 1. Setup User A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Security User A',
        email: 'sec_user_a@example.com',
        password: 'Password123!',
        passwordConfirmation: 'Password123!',
        aiConsent: true
      });
    userAToken = resA.body.data.accessToken;
    userAId = (resA.body.data.user._id || resA.body.data.user.id).toString();

    // 2. Setup User B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Security User B',
        email: 'sec_user_b@example.com',
        password: 'Password123!',
        passwordConfirmation: 'Password123!',
        aiConsent: false
      });
    userBToken = resB.body.data.accessToken;
    userBId = (resB.body.data.user._id || resB.body.data.user.id).toString();

    // 3. Create sample resources for User A
    const appRes = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        companyName: 'Private Corp A',
        jobTitle: 'Security Lead',
        status: 'applied',
        appliedDate: new Date().toISOString()
      });
    userAAppId = appRes.body.data.application._id;

    // Sample interview for User A
    const intRes = await request(app)
      .post('/api/v1/interviews')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        applicationId: userAAppId,
        type: 'interview',
        title: 'User A Confidential Interview',
        startAt: new Date(Date.now() + 86400000).toISOString(),
        endAt: new Date(Date.now() + 90000000).toISOString()
      });
    userAInterviewId = intRes.body.data.interview._id;
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['sec_user_a@example.com', 'sec_user_b@example.com'] } });
    const userIds = [userAId, userBId].filter((id) => mongoose.isValidObjectId(id));
    if (userIds.length > 0) {
      await Application.deleteMany({ userId: { $in: userIds } });
      await Interview.deleteMany({ userId: { $in: userIds } });
      await Resume.deleteMany({ userId: { $in: userIds } });
      await InterviewSession.deleteMany({ userId: { $in: userIds } });
      await Notification.deleteMany({ userId: { $in: userIds } });
    }
  });

  // ==========================================
  // 1. Authentication & JWT Hardening
  // ==========================================
  describe('1. Authentication & JWT Vulnerability Tests', () => {
    it('rejects protected endpoints when no token is supplied (401 UNAUTHORIZED)', async () => {
      const res = await request(app).get('/api/v1/applications');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects cryptographically tampered JWT token (401 INVALID_TOKEN)', async () => {
      const tampered = userAToken.slice(0, -6) + 'abcdef';
      const res = await request(app)
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${tampered}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('rejects malformed authorization header scheme', async () => {
      const res = await request(app)
        .get('/api/v1/applications')
        .set('Authorization', `Basic ${userAToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('enforces CSRF mitigation: rejects refresh token without X-Requested-With header (NFR-SEC-04)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refreshToken=fake_refresh_token_value']);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_ERROR');
    });
  });

  // ==========================================
  // 2. BOLA / IDOR Cross-User Isolation (FR-149, FR-150)
  // ==========================================
  describe('2. BOLA / IDOR Cross-User Isolation Tests', () => {
    it('prevents User B from viewing User A application (responds 404 NOT_FOUND per FR-149)', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${userAAppId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('prevents User B from updating User A application', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${userAAppId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ status: 'rejected' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');

      // Verify original remains untouched
      const original = await Application.findById(userAAppId);
      expect(original.status).toBe('applied');
    });

    it('prevents User B from deleting User A application', async () => {
      const res = await request(app)
        .delete(`/api/v1/applications/${userAAppId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('prevents User B from viewing User A calendar interview', async () => {
      const res = await request(app)
        .get(`/api/v1/interviews/${userAInterviewId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('ignores client-supplied userId in request body to prevent ownership spoofing (FR-150)', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          companyName: 'Spoof Corp',
          jobTitle: 'Engineer',
          status: 'wishlist',
          userId: userAId // Attacker attempting to assign application to User A
        });

      expect(res.status).toBe(201);
      const createdAppId = res.body.data.application._id;

      // Verify in DB that it is owned by User B, not User A
      const createdApp = await Application.findById(createdAppId);
      expect(createdApp.userId.toString()).toBe(userBId);
      await Application.findByIdAndDelete(createdAppId);
    });
  });

  // ==========================================
  // 3. NoSQL Injection & Prototype Pollution (NFR-SEC-06)
  // ==========================================
  describe('3. Injection Defenses & Sanitization Tests', () => {
    it('sanitizes MongoDB query operators ($ne, $gt, $where) in JSON request body', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          companyName: 'Injection Test Inc',
          jobTitle: 'Penetration Tester',
          status: 'applied',
          $where: 'sleep(5000)',
          $ne: 'admin',
          nested: {
            $gt: 0,
            safeField: 'normal value'
          }
        });

      expect(res.status).toBe(201);
      const createdId = res.body.data.application._id;
      const doc = await Application.findById(createdId).lean();
      expect(doc.$where).toBeUndefined();
      expect(doc.$ne).toBeUndefined();
      await Application.findByIdAndDelete(createdId);
    });

    it('sanitizes prototype pollution keys (__proto__, constructor)', async () => {
      const payload = JSON.parse('{"companyName":"ProtoTest","jobTitle":"Engineer","status":"wishlist","__proto__":{"polluted":true}}');
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(Object.prototype.polluted).toBeUndefined();
      await Application.findByIdAndDelete(res.body.data.application._id);
    });

    it('rejects invalid MongoDB ObjectIds with clean 400 INVALID_ID error', async () => {
      const res = await request(app)
        .get('/api/v1/applications/invalid-hex-id-12345')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_ID');
    });
  });

  // ==========================================
  // 4. File Upload & Storage Path Traversal (NFR-SEC-09)
  // ==========================================
  describe('4. File Upload & Storage Path Traversal Defense', () => {
    it('rejects non-PDF executable masquerading as a PDF', async () => {
      const fakeExecutable = Buffer.from('MZ\x90\x00\x03\x00\x00\x00This is a Windows executable');
      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('resume', fakeExecutable, 'exploit.pdf');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
    });

    it('rejects invalid download signature without timing attacks or uncaught exceptions', () => {
      const validToken = storageService.generateSignedDownloadToken(userAId, 'sample/key.pdf', 'resume123');
      const [expiresAt] = validToken.token.split('.');

      // Test truncated signature length
      const shortSigResult = storageService.verifySignedDownloadToken(
        userAId,
        'sample/key.pdf',
        `${expiresAt}.abcd`
      );
      expect(shortSigResult).toBe(false);

      // Test empty signature
      const emptySigResult = storageService.verifySignedDownloadToken(
        userAId,
        'sample/key.pdf',
        `${expiresAt}.`
      );
      expect(emptySigResult).toBe(false);
    });

    it('blocks directory traversal attempts in storage keys', async () => {
      await expect(
        storageService.getFileBuffer('../../../etc/passwd')
      ).rejects.toThrow();
    });
  });

  // ==========================================
  // 5. AI Consent & Data Privacy (FR-063, NFR-SEC-11)
  // ==========================================
  describe('5. AI Consent & Data Privacy Tests', () => {
    it('blocks AI analysis when user has not granted AI consent (FR-063)', async () => {
      // User B has aiConsent: false
      const res = await request(app)
        .post('/api/v1/interview-sessions')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          targetRole: 'Full Stack Engineer',
          totalQuestions: 3
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('AI_CONSENT_REQUIRED');
    });
  });

  // ==========================================
  // 6. CSV Formula Injection Defense (FR-119)
  // ==========================================
  describe('6. CSV Formula Injection Defense', () => {
    it('sanitizes formula injection characters (=, +, -, @) in CSV export', async () => {
      const maliciousApp = await Application.create({
        userId: userAId,
        companyName: '=cmd|"/C calc"!A0',
        jobTitle: '+cmd|"/C notepad"!A0',
        location: '-@formula',
        status: 'applied',
        appliedDate: new Date()
      });

      const res = await request(app)
        .get('/api/v1/applications/export/csv')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);

      // The export must prefix formula characters with a single quote (') per FR-119
      expect(res.text).toContain(`"'=cmd`);
      expect(res.text).toContain(`"'+cmd`);
      expect(res.text).toContain(`"'-@formula"`);

      await Application.findByIdAndDelete(maliciousApp._id);
    });
  });
});

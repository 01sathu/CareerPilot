const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Application = require('../src/models/Application');
const ApplicationHistory = require('../src/models/ApplicationHistory');

describe('Module B: Kanban Board Status Transitions & Column Isolation (FR-036 to FR-040)', () => {
  let userAToken = '';
  let userBToken = '';
  let userAId = '';
  let userBId = '';

  beforeAll(async () => {
    // Register User A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Kanban User A',
        email: 'kanban.a@test.com',
        password: 'Password123',
        passwordConfirmation: 'Password123'
      });
    userAToken = resA.body.data.accessToken;
    userAId = resA.body.data.user._id;

    // Register User B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Kanban User B',
        email: 'kanban.b@test.com',
        password: 'Password123',
        passwordConfirmation: 'Password123'
      });
    userBToken = resB.body.data.accessToken;
    userBId = resB.body.data.user._id;
  });

  afterAll(async () => {
    await Application.deleteMany({ userId: { $in: [userAId, userBId] } });
    await ApplicationHistory.deleteMany({ userId: { $in: [userAId, userBId] } });
    await User.deleteMany({ _id: { $in: [userAId, userBId] } });
  });

  // 1. Column Queries
  describe('Loading applications by status columns (FR-036)', () => {
    let createdApps = {};

    beforeAll(async () => {
      const statuses = ['wishlist', 'applied', 'assessment', 'interview', 'offer', 'rejected'];
      for (const st of statuses) {
        const res = await request(app)
          .post('/api/v1/applications')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            companyName: `Company ${st.toUpperCase()}`,
            jobTitle: `${st} Specialist`,
            status: st
          });
        createdApps[st] = res.body.data.application;
      }
    });

    it('returns only applications belonging to the requested status column', async () => {
      const statuses = ['wishlist', 'applied', 'assessment', 'interview', 'offer', 'rejected'];
      for (const st of statuses) {
        const res = await request(app)
          .get(`/api/v1/applications?status=${st}`)
          .set('Authorization', `Bearer ${userAToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        res.body.data.forEach((appItem) => {
          expect(appItem.status).toBe(st);
        });
      }
    });
  });

  // 2. Moving applications between columns & recording history
  describe('Moving applications across columns (FR-037, FR-040, FR-041)', () => {
    let testAppId = '';

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          companyName: 'Linear Technologies',
          jobTitle: 'Frontend Engineer',
          status: 'wishlist'
        });
      testAppId = res.body.data.application._id;
    });

    it('moves card from wishlist to applied and auto-stamps appliedDate (FR-030, FR-040)', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${testAppId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          status: 'applied',
          statusNote: 'Applied via company portal'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.application.status).toBe('applied');
      expect(res.body.data.application.appliedDate).not.toBeNull();

      // Check ApplicationHistory record
      const history = await ApplicationHistory.find({ applicationId: testAppId }).sort({ timestamp: -1 });
      expect(history.length).toBe(2); // created + status_changed
      const latestHistory = history[0];
      expect(latestHistory.eventType).toBe('status_changed');
      expect(latestHistory.fromStatus).toBe('wishlist');
      expect(latestHistory.toStatus).toBe('applied');
      expect(latestHistory.note).toBe('Applied via company portal');
    });

    it('moves card from applied to interview and records transition (FR-040, FR-041)', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${testAppId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          status: 'interview',
          statusNote: 'Recruiter screen scheduled'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.application.status).toBe('interview');

      const history = await ApplicationHistory.find({ applicationId: testAppId }).sort({ timestamp: -1 });
      expect(history.length).toBe(3);
      expect(history[0].fromStatus).toBe('applied');
      expect(history[0].toStatus).toBe('interview');
    });

    it('allows any status to transition to any other status (FR-040)', async () => {
      // Transition directly from interview to offer
      const res = await request(app)
        .patch(`/api/v1/applications/${testAppId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          status: 'offer'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.application.status).toBe('offer');

      // Then transition from offer to rejected (if offer declined or rescinded)
      const res2 = await request(app)
        .patch(`/api/v1/applications/${testAppId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          status: 'rejected',
          statusNote: 'Declined offer due to remote policy'
        });

      expect(res2.status).toBe(200);
      expect(res2.body.data.application.status).toBe('rejected');
    });
  });

  // 3. Security, Multi-Tenancy Isolation & Error Handling
  describe('Security and validation enforcement during column moves (FR-013, FR-149, FR-129)', () => {
    let userAAppId = '';

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          companyName: 'Private Corp',
          jobTitle: 'Security Analyst',
          status: 'applied'
        });
      userAAppId = res.body.data.application._id;
    });

    it('rejects unauthenticated drag-and-drop status update with 401 UNAUTHORIZED (FR-013)', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${userAAppId}`)
        .send({ status: 'interview' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('enforces multi-tenancy: returns 404 NOT_FOUND when User B attempts to move User A card (FR-149)', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${userAAppId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ status: 'interview' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('rejects invalid status transitions with 400 VALIDATION_ERROR and writes no history (FR-129)', async () => {
      const historyCountBefore = await ApplicationHistory.countDocuments({ applicationId: userAAppId });

      const res = await request(app)
        .patch(`/api/v1/applications/${userAAppId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ status: 'super_hired_status' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      const historyCountAfter = await ApplicationHistory.countDocuments({ applicationId: userAAppId });
      expect(historyCountAfter).toBe(historyCountBefore);
    });
  });
});

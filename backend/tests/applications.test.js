const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Application = require('../src/models/Application');
const ApplicationHistory = require('../src/models/ApplicationHistory');

describe('Module B: Job Application Tracker Integration Tests', () => {
  let userAToken = '';
  let userBToken = '';
  let userAId = '';
  let userBId = '';

  beforeAll(async () => {
    // Register User A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'User A',
        email: 'user.a@test.com',
        password: 'Password123',
        passwordConfirmation: 'Password123'
      });
    userAToken = resA.body.data.accessToken;
    userAId = resA.body.data.user._id;

    // Register User B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'User B',
        email: 'user.b@test.com',
        password: 'Password123',
        passwordConfirmation: 'Password123'
      });
    userBToken = resB.body.data.accessToken;
    userBId = resB.body.data.user._id;
  });

  afterAll(async () => {
    await Application.deleteMany({ userId: { $in: [userAId, userBId] } });
    await ApplicationHistory.deleteMany({ userId: { $in: [userAId, userBId] } });
  });

  let createdAppId = '';

  // 1. Create Application Tests
  describe('POST /api/v1/applications', () => {
    it('creates an application and writes initial history record (FR-024, FR-026, FR-041)', async () => {
      const appData = {
        companyName: 'Acme Corp',
        jobTitle: 'Frontend Engineer',
        location: 'Remote',
        status: 'wishlist',
        salary: {
          min: 90000,
          max: 120000,
          currency: 'USD',
          period: 'yearly'
        },
        jobDescription: 'Build modern user interfaces with React and Tailwind.',
        applicationUrl: 'https://acme.com/jobs/frontend',
        notes: 'Referred by senior engineer.'
      };

      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(appData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application.companyName).toBe('Acme Corp');
      expect(res.body.data.application.jobTitle).toBe('Frontend Engineer');
      expect(res.body.data.application.status).toBe('wishlist');
      expect(res.body.data.application.salary.min).toBe(90000);

      createdAppId = res.body.data.application._id;

      // Verify ApplicationHistory record was created (FR-041)
      const history = await ApplicationHistory.find({ applicationId: createdAppId });
      expect(history.length).toBe(1);
      expect(history[0].eventType).toBe('created');
      expect(history[0].fromStatus).toBeNull();
      expect(history[0].toStatus).toBe('wishlist');
    });

    it('auto-sets appliedDate when created with status applied (FR-030)', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          companyName: 'Stripe',
          jobTitle: 'Backend Engineer',
          status: 'applied'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.application.status).toBe('applied');
      expect(res.body.data.application.appliedDate).toBeDefined();
    });

    it('rejects application creation when required fields are missing (FR-024)', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          location: 'San Francisco'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects salary when min exceeds max (FR-025)', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          companyName: 'TechCorp',
          jobTitle: 'Developer',
          salary: {
            min: 150000,
            max: 100000
          }
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects unauthenticated requests (FR-013)', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .send({
          companyName: 'TechCorp',
          jobTitle: 'Developer'
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // 2. List Applications (Search, Filter, Sort, Pagination)
  describe('GET /api/v1/applications', () => {
    beforeAll(async () => {
      // Seed a few more applications for User A
      const apps = [
        { companyName: 'Google', jobTitle: 'Software Engineer', location: 'Mountain View', status: 'interview' },
        { companyName: 'Amazon', jobTitle: 'Cloud Architect', location: 'Seattle', status: 'applied' },
        { companyName: 'Netflix', jobTitle: 'Full Stack Engineer', location: 'Los Gatos', status: 'offer' },
        { companyName: 'Meta', jobTitle: 'Product Engineer', location: 'Menlo Park', status: 'rejected' }
      ];

      for (const a of apps) {
        await request(app)
          .post('/api/v1/applications')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(a);
      }
    });

    it('lists applications with pagination metadata (FR-032, FR-126)', async () => {
      const res = await request(app)
        .get('/api/v1/applications?page=1&limit=3')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.meta).toHaveProperty('page', 1);
      expect(res.body.meta).toHaveProperty('limit', 3);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(5);
      expect(res.body.meta.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('searches applications by companyName, jobTitle or location (FR-033)', async () => {
      const res = await request(app)
        .get('/api/v1/applications?search=Goo')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].companyName).toBe('Google');
    });

    it('filters applications by status (FR-035)', async () => {
      const res = await request(app)
        .get('/api/v1/applications?status=interview')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((a) => a.status === 'interview')).toBe(true);
    });

    it('sorts applications by companyName ascending (FR-034)', async () => {
      const res = await request(app)
        .get('/api/v1/applications?sortBy=companyName&sortOrder=asc')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      const companies = res.body.data.map((a) => a.companyName);
      const sortedCompanies = [...companies].sort();
      expect(companies).toEqual(sortedCompanies);
    });
  });

  // 3. View Single Application & History Timeline
  describe('GET /api/v1/applications/:id', () => {
    it('returns application details with status history timeline (FR-027, FR-042)', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application._id).toBe(createdAppId);
      expect(Array.isArray(res.body.data.history)).toBe(true);
      expect(res.body.data.history.length).toBeGreaterThanOrEqual(1);
    });

    it('returns 404 NOT_FOUND when User B requests User A application (FR-044, FR-149)', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // 4. Update Application & Status Transition History
  describe('PATCH /api/v1/applications/:id', () => {
    it('updates application status and records ApplicationHistory (FR-028, FR-040, FR-041)', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          status: 'interview',
          statusNote: 'HR phone screen passed. Scheduled technical round.'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.application.status).toBe('interview');

      // Check ApplicationHistory for status change
      const history = await ApplicationHistory.find({
        applicationId: createdAppId,
        eventType: 'status_changed'
      });
      expect(history.length).toBe(1);
      expect(history[0].fromStatus).toBe('wishlist');
      expect(history[0].toStatus).toBe('interview');
      expect(history[0].note).toBe('HR phone screen passed. Scheduled technical round.');
    });

    it('returns 404 when User B attempts to update User A application (FR-149)', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          status: 'offer'
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // 5. Delete Application & Cascade History
  describe('DELETE /api/v1/applications/:id', () => {
    it('returns 404 when User B attempts to delete User A application (FR-149)', async () => {
      const res = await request(app)
        .delete(`/api/v1/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('deletes application and cascade deletes its history records (FR-029)', async () => {
      const res = await request(app)
        .delete(`/api/v1/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify application is removed
      const deletedApp = await Application.findById(createdAppId);
      expect(deletedApp).toBeNull();

      // Verify ApplicationHistory records are cascade deleted (FR-029)
      const remainingHistory = await ApplicationHistory.find({ applicationId: createdAppId });
      expect(remainingHistory.length).toBe(0);
    });
  });
});

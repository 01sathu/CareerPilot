const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Application = require('../src/models/Application');
const ApplicationHistory = require('../src/models/ApplicationHistory');

describe('Module E: Career Analytics Dashboard Integration Tests (FR-080 to FR-088)', () => {
  let userAToken = '';
  let userBToken = '';
  let userAId = '';
  let userBId = '';

  beforeAll(async () => {
    // Register User A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Analytics User A',
        email: 'analytics.a@test.com',
        password: 'Password123',
        passwordConfirmation: 'Password123'
      });
    userAToken = resA.body.data.accessToken;
    userAId = resA.body.data.user._id;

    // Register User B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Analytics User B',
        email: 'analytics.b@test.com',
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

  // 1. Authentication & Query Validation
  describe('GET /api/v1/analytics/overview authentication and validation', () => {
    it('returns 401 UNAUTHORIZED when no token is provided (FR-013, FR-149)', async () => {
      const res = await request(app).get('/api/v1/analytics/overview');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 400 VALIDATION_ERROR on unexpected query parameters (FR-129)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview?unknownParam=true')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 VALIDATION_ERROR on invalid range option (FR-129)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview?range=invalid_range')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // 2. Empty State & Zero Denominator Handling
  describe('Zero data state & zero denominator handling (FR-082, FR-087, AC-E-02, AC-E-04)', () => {
    it('returns null conversion rates and zero counts for a user with no applications', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { counts, conversionRates, trends, progressSummary } = res.body.data;

      // All counts are 0
      expect(counts.total).toBe(0);
      expect(counts.active).toBe(0);
      expect(counts.byStatus).toEqual({
        wishlist: 0,
        applied: 0,
        assessment: 0,
        interview: 0,
        offer: 0,
        rejected: 0
      });

      // FR-082: When denominator is 0, rate shall be returned as null (never divide by zero)
      expect(conversionRates.appliedToInterview).toEqual({
        rate: null,
        percentage: null,
        numerator: 0,
        denominator: 0
      });
      expect(conversionRates.interviewToOffer).toEqual({
        rate: null,
        percentage: null,
        numerator: 0,
        denominator: 0
      });
      expect(conversionRates.overallOfferRate).toEqual({
        rate: null,
        percentage: null,
        numerator: 0,
        denominator: 0
      });

      // Trends should be zero-filled
      expect(trends.weekly).toHaveLength(12);
      trends.weekly.forEach((w) => expect(w.count).toBe(0));

      expect(trends.monthly).toHaveLength(12);
      trends.monthly.forEach((m) => expect(m.count).toBe(0));

      // Progress summary has 0 counts
      expect(progressSummary.appliedLast30Days).toBe(0);
      expect(progressSummary.activeApplications).toBe(0);
      expect(progressSummary.followUpsDue).toBe(0);
      expect(progressSummary.statements).toContain('You submitted 0 applications in the last 30 days.');
    });
  });

  // 3. Populated Deterministic Metrics & Historical Funnel
  describe('Populated Analytics & Funnel Calculations (FR-080, FR-081, FR-082, FR-083, FR-085, AC-E-01, AC-E-02, AC-E-03)', () => {
    beforeAll(async () => {
      const now = new Date();
      const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // Seed 6 deterministic applications for User A:

      // App 1: Applied 10 days ago -> Interview -> Offer (current: offer)
      const res1 = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          companyName: 'Company 1 (Offer)',
          jobTitle: 'Senior Engineer',
          status: 'applied',
          appliedDate: daysAgo(10)
        });
      const app1Id = res1.body.data.application._id;

      await request(app)
        .patch(`/api/v1/applications/${app1Id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ status: 'interview' });

      await request(app)
        .patch(`/api/v1/applications/${app1Id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ status: 'offer' });

      // App 2: Applied 20 days ago -> Interview (current: interview)
      const res2 = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          companyName: 'Company 2 (Interview)',
          jobTitle: 'Backend Engineer',
          status: 'applied',
          appliedDate: daysAgo(20)
        });
      const app2Id = res2.body.data.application._id;

      await request(app)
        .patch(`/api/v1/applications/${app2Id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ status: 'interview' });

      // App 3: Applied 25 days ago -> Assessment (current: assessment)
      const res3 = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          companyName: 'Company 3 (Assessment)',
          jobTitle: 'Full Stack Engineer',
          status: 'applied',
          appliedDate: daysAgo(25),
          followUpDate: daysAgo(2) // past follow-up due
        });
      const app3Id = res3.body.data.application._id;

      await request(app)
        .patch(`/api/v1/applications/${app3Id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ status: 'assessment' });

      // App 4: Applied 45 days ago (current: applied)
      await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          companyName: 'Company 4 (Applied)',
          jobTitle: 'Platform Engineer',
          status: 'applied',
          appliedDate: daysAgo(45)
        });

      // App 5: Applied 60 days ago -> Rejected (current: rejected)
      const res5 = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          companyName: 'Company 5 (Rejected)',
          jobTitle: 'DevOps Engineer',
          status: 'applied',
          appliedDate: daysAgo(60)
        });
      const app5Id = res5.body.data.application._id;

      await request(app)
        .patch(`/api/v1/applications/${app5Id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ status: 'rejected' });

      // App 6: Wishlist (current: wishlist, no appliedDate)
      await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          companyName: 'Company 6 (Wishlist)',
          jobTitle: 'Solutions Architect',
          status: 'wishlist'
        });
    });

    it('computes exact application counts by current status and active pipeline (FR-080, FR-081, AC-E-01)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      const { counts } = res.body.data;

      // 6 total applications
      expect(counts.total).toBe(6);

      // Counts per status
      expect(counts.byStatus.wishlist).toBe(1);
      expect(counts.byStatus.applied).toBe(1);
      expect(counts.byStatus.assessment).toBe(1);
      expect(counts.byStatus.interview).toBe(1);
      expect(counts.byStatus.offer).toBe(1);
      expect(counts.byStatus.rejected).toBe(1);

      // Active pipeline: applied (1) + assessment (1) + interview (1) = 3 (FR-080)
      expect(counts.active).toBe(3);
    });

    it('computes historical conversion rates from ApplicationHistory (FR-082, FR-045, FR-088, AC-E-02)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      const { conversionRates } = res.body.data;

      // Ever reached applied: Apps 1, 2, 3, 4, 5 => 5
      // Ever reached interview: Apps 1, 2 => 2
      // Ever reached offer: App 1 => 1

      // Applied -> Interview: 2 / 5 = 0.4 (40%)
      expect(conversionRates.appliedToInterview).toEqual({
        rate: 0.4,
        percentage: 40,
        numerator: 2,
        denominator: 5
      });

      // Interview -> Offer: 1 / 2 = 0.5 (50%)
      expect(conversionRates.interviewToOffer).toEqual({
        rate: 0.5,
        percentage: 50,
        numerator: 1,
        denominator: 2
      });

      // Overall Offer Rate: 1 / 5 = 0.2 (20%)
      expect(conversionRates.overallOfferRate).toEqual({
        rate: 0.2,
        percentage: 20,
        numerator: 1,
        denominator: 5
      });
    });

    it('returns zero-filled weekly and monthly trends with user timezone (FR-083, AC-E-03)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview?timezone=UTC')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      const { trends, timezone } = res.body.data;

      expect(timezone).toBe('UTC');

      // Weekly trends: exactly 12 buckets
      expect(trends.weekly).toHaveLength(12);
      trends.weekly.forEach((bucket) => {
        expect(bucket).toHaveProperty('period');
        expect(bucket).toHaveProperty('label');
        expect(typeof bucket.count).toBe('number');
      });

      // Monthly trends: exactly 12 buckets
      expect(trends.monthly).toHaveLength(12);
      trends.monthly.forEach((bucket) => {
        expect(bucket).toHaveProperty('period');
        expect(bucket).toHaveProperty('label');
        expect(typeof bucket.count).toBe('number');
      });

      // Sum of counts across all 12 months should match the 5 applied apps
      const totalMonthlyCount = trends.monthly.reduce((sum, b) => sum + b.count, 0);
      expect(totalMonthlyCount).toBe(5);
    });

    it('computes deterministic progress summary (FR-085)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      const { progressSummary } = res.body.data;

      // Apps 1, 2, 3 were applied within last 30 days
      expect(progressSummary.appliedLast30Days).toBe(3);
      // App 3 had followUpDate 2 days ago
      expect(progressSummary.followUpsDue).toBe(1);
      // 3 active pipeline applications
      expect(progressSummary.activeApplications).toBe(3);

      expect(progressSummary.statements).toEqual(
        expect.arrayContaining([
          'You submitted 3 applications in the last 30 days.',
          '1 application currently requires follow-up.',
          '3 applications are active in your pipeline.'
        ])
      );
    });

    it('strictly isolates user analytics data (FR-149, AC-SYS-03)', async () => {
      // User B should still see 0 applications despite User A having 6
      const resB = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data.counts.total).toBe(0);
      expect(resB.body.data.counts.active).toBe(0);
      expect(resB.body.data.conversionRates.appliedToInterview.rate).toBeNull();
    });
  });
});

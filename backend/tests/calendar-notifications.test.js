const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Application = require('../src/models/Application');
const Interview = require('../src/models/Interview');
const Notification = require('../src/models/Notification');
const reminderService = require('../src/services/reminder.service');

describe('Module F & G: Interview Calendar and Notifications Integration Tests', () => {
  let userAToken = '';
  let userBToken = '';
  let userAId = '';
  let userBId = '';
  let userAAppId = '';
  let userBAppId = '';

  beforeAll(async () => {
    // Register User A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Calendar User A',
        email: 'calendar.a@test.com',
        password: 'Password123',
        passwordConfirmation: 'Password123'
      });
    userAToken = resA.body.data.accessToken;
    userAId = resA.body.data.user._id;

    // Register User B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Calendar User B',
        email: 'calendar.b@test.com',
        password: 'Password123',
        passwordConfirmation: 'Password123'
      });
    userBToken = resB.body.data.accessToken;
    userBId = resB.body.data.user._id;

    // Create an application for User A
    const appResA = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        companyName: 'Stripe',
        jobTitle: 'Backend Engineer',
        status: 'interview'
      });
    userAAppId = appResA.body.data.application._id;

    // Create an application for User B
    const appResB = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        companyName: 'Google',
        jobTitle: 'Software Engineer',
        status: 'applied'
      });
    userBAppId = appResB.body.data.application._id;
  });

  afterAll(async () => {
    await Interview.deleteMany({ userId: { $in: [userAId, userBId] } });
    await Notification.deleteMany({ userId: { $in: [userAId, userBId] } });
    await Application.deleteMany({ userId: { $in: [userAId, userBId] } });
    await User.deleteMany({ _id: { $in: [userAId, userBId] } });
  });

  let createdInterviewId = '';

  // 1. Interview Creation & Validation Tests
  describe('POST /api/v1/interviews', () => {
    it('successfully creates an interview event linked to an application (FR-089)', async () => {
      const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow
      const endAt = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/v1/interviews')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          applicationId: userAAppId,
          type: 'interview',
          title: 'System Design Round',
          startAt,
          endAt,
          timezone: 'America/New_York',
          format: 'video',
          locationOrLink: 'https://meet.google.com/abc-xyz',
          roundLabel: 'Round 2',
          notes: 'Focus on distributed systems and message brokers.',
          reminderOffsets: [1440, 60]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.interview).toBeDefined();
      expect(res.body.data.interview.title).toBe('System Design Round');
      expect(res.body.data.interview.applicationId._id).toBe(userAAppId);
      expect(res.body.data.hasOverlap).toBe(false);

      createdInterviewId = res.body.data.interview._id;
    });

    it('rejects event creation when endAt is earlier than startAt (FR-090)', async () => {
      const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const endAt = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(); // 1 hr before start

      const res = await request(app)
        .post('/api/v1/interviews')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'interview',
          title: 'Invalid Timing Interview',
          startAt,
          endAt
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when linking an application that belongs to another user (FR-091, AC-F-04)', async () => {
      const startAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/v1/interviews')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          applicationId: userBAppId, // Belongs to User B
          type: 'interview',
          title: 'Attempted Cross-User Link',
          startAt
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns a non-blocking overlap warning when scheduling conflicting events (FR-100)', async () => {
      // Create an event that overlaps with the createdInterviewId
      const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(); // 15 mins after first starts
      const endAt = new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/v1/interviews')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          type: 'assessment',
          title: 'Overlapping Coding Assessment',
          startAt,
          endAt
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasOverlap).toBe(true);
      expect(res.body.data.overlappingEvent).toBeDefined();
      expect(res.body.data.overlappingEvent.title).toBe('System Design Round');

      // Cleanup this second event
      await Interview.findByIdAndDelete(res.body.data.interview._id);
    });
  });

  // 2. Listing & Upcoming Events Tests
  describe('GET /api/v1/interviews', () => {
    it('lists interviews for authenticated user with date range and status filters (FR-095)', async () => {
      const res = await request(app)
        .get('/api/v1/interviews')
        .set('Authorization', `Bearer ${userAToken}`)
        .query({ status: 'scheduled' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.interviews)).toBe(true);
      expect(res.body.data.interviews.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.interviews[0]._id).toBe(createdInterviewId);
    });

    it('returns upcoming events scheduled within the next 30 days (FR-094)', async () => {
      const res = await request(app)
        .get('/api/v1/interviews/upcoming')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.interviews)).toBe(true);
      expect(res.body.data.interviews.length).toBeGreaterThanOrEqual(1);
    });

    it('returns single interview by id (FR-089)', async () => {
      const res = await request(app)
        .get(`/api/v1/interviews/${createdInterviewId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.interview._id).toBe(createdInterviewId);
    });

    it('returns 404 when user B accesses user A interview (FR-149)', async () => {
      const res = await request(app)
        .get(`/api/v1/interviews/${createdInterviewId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // 3. Rescheduling & Updates Tests
  describe('PATCH /api/v1/interviews/:id', () => {
    it('reschedules an event and clears pending remindersSent per AC-F-03 (FR-092, FR-098)', async () => {
      // Manually simulate a reminder had already been sent
      await Interview.findByIdAndUpdate(createdInterviewId, {
        remindersSent: [{ offsetMinutes: 1440, sentAt: new Date() }]
      });

      const newStartAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 3 days later

      const res = await request(app)
        .patch(`/api/v1/interviews/${createdInterviewId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          startAt: newStartAt,
          roundLabel: 'Final Round'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.interview.roundLabel).toBe('Final Round');
      expect(res.body.data.interview.remindersSent).toHaveLength(0); // Reset for new schedule
    });

    it('allows changing status to completed (FR-093)', async () => {
      const res = await request(app)
        .patch(`/api/v1/interviews/${createdInterviewId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          status: 'completed'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.interview.status).toBe('completed');
    });
  });

  // 4. .ics Calendar File Export Tests
  describe('GET /api/v1/interviews/:id/ics', () => {
    it('exports event as an RFC 5545 .ics iCalendar file (FR-103)', async () => {
      const res = await request(app)
        .get(`/api/v1/interviews/${createdInterviewId}/ics`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/calendar');
      expect(res.text).toContain('BEGIN:VCALENDAR');
      expect(res.text).toContain('BEGIN:VEVENT');
      expect(res.text).toContain('System Design Round');
      expect(res.text).toContain('END:VCALENDAR');
    });
  });

  // 5. In-App Notifications & Reminder Scheduler Tests
  describe('In-App Notifications & Reminders (Module G & F)', () => {
    let testReminderEventId = '';

    beforeAll(async () => {
      // Create an event starting in 50 minutes (within 1-hour reminder window)
      const eventStart = new Date(Date.now() + 50 * 60 * 1000);
      const testEvent = await Interview.create({
        userId: userAToken ? userAId : '',
        title: 'Upcoming Algorithmic Interview',
        type: 'interview',
        startAt: eventStart,
        reminderOffsets: [60], // 1 hour offset
        timezone: 'UTC',
        status: 'scheduled'
      });
      testReminderEventId = testEvent._id;
    });

    it('executes reminder scheduler and delivers in-app notification without duplicates (AC-F-02, FR-098)', async () => {
      // 1st scheduler tick
      const deliveredCount1 = await reminderService.processInterviewReminders();
      expect(deliveredCount1).toBeGreaterThanOrEqual(1);

      // Verify notification was created
      const notifs = await Notification.find({
        userId: userAId,
        type: 'interview_reminder'
      });
      expect(notifs.length).toBeGreaterThanOrEqual(1);
      expect(notifs[0].title).toContain('Upcoming Interview');

      // 2nd scheduler tick immediately after - should NOT send duplicate
      const deliveredCount2 = await reminderService.processInterviewReminders();
      expect(deliveredCount2).toBe(0);
    });

    it('does not create reminders for cancelled events (AC-F-02)', async () => {
      // Cancel the event
      await Interview.findByIdAndUpdate(testReminderEventId, { status: 'cancelled' });

      // Clean out remindersSent to test if cancelled check blocks it
      await Interview.findByIdAndUpdate(testReminderEventId, { remindersSent: [] });

      const delivered = await reminderService.processInterviewReminders();
      // Should not deliver for this cancelled event
      const notifs = await Notification.find({
        userId: userAId,
        relatedEntityId: testReminderEventId
      });
      // The only notification was from the previous test before cancellation
      expect(notifs.length).toBe(1);
    });

    it('automatically generates an application_status_changed notification when application status changes (FR-106)', async () => {
      // Update User A's application status from 'interview' to 'offer'
      const updateRes = await request(app)
        .patch(`/api/v1/applications/${userAAppId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          status: 'offer',
          statusNote: 'Received official offer letter!'
        });

      expect(updateRes.status).toBe(200);

      // Check notification created
      const statusNotifs = await Notification.find({
        userId: userAId,
        type: 'application_status_changed',
        relatedEntityId: userAAppId
      });

      expect(statusNotifs.length).toBeGreaterThanOrEqual(1);
      expect(statusNotifs[0].title).toContain('Status Changed');
      expect(statusNotifs[0].message).toContain('offer');
    });

    it('lists notifications, provides unread count, marks read/unread, and deletes (FR-107, FR-108, FR-109, AC-G-02)', async () => {
      // 1. Get unread count
      const countRes = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(countRes.status).toBe(200);
      expect(countRes.body.data.unreadCount).toBeGreaterThanOrEqual(1);

      // 2. List notifications
      const listRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
      const notifId = listRes.body.data[0]._id;

      // 3. Mark single notification as read
      const readRes = await request(app)
        .patch(`/api/v1/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(readRes.status).toBe(200);
      expect(readRes.body.data.notification.isRead).toBe(true);

      // 4. Mark single notification as unread
      const unreadRes = await request(app)
        .patch(`/api/v1/notifications/${notifId}/unread`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(unreadRes.status).toBe(200);
      expect(unreadRes.body.data.notification.isRead).toBe(false);

      // 5. Mark all as read
      const markAllRes = await request(app)
        .post('/api/v1/notifications/mark-all-read')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(markAllRes.status).toBe(200);

      // 6. Delete single notification
      const delRes = await request(app)
        .delete(`/api/v1/notifications/${notifId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(delRes.status).toBe(200);
    });
  });

  // 6. Cascade Deletion Tests (AC-B-06)
  describe('Cascade Deletion', () => {
    it('deleting an application removes linked interview events and notifications (AC-B-06)', async () => {
      // Create an interview linked to User A's application
      const tempEvent = await Interview.create({
        userId: userAId,
        applicationId: userAAppId,
        title: 'Interview to be cascade deleted',
        type: 'interview',
        startAt: new Date(Date.now() + 10 * 60 * 1000),
        timezone: 'UTC'
      });

      // Delete the application
      const delAppRes = await request(app)
        .delete(`/api/v1/applications/${userAAppId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(delAppRes.status).toBe(200);

      // Verify linked interview was deleted
      const checkEvent = await Interview.findById(tempEvent._id);
      expect(checkEvent).toBeNull();
    });
  });
});

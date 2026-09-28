const Interview = require('../models/Interview');
const Application = require('../models/Application');
const Notification = require('../models/Notification');
const notificationService = require('./notification.service');

class ReminderService {
  /**
   * Helper to format offset into human readable label
   */
  formatOffsetLabel(offsetMinutes) {
    if (offsetMinutes === 15) return '15 minutes';
    if (offsetMinutes === 60) return '1 hour';
    if (offsetMinutes === 1440) return '1 day';
    if (offsetMinutes === 2880) return '2 days';
    if (offsetMinutes < 60) return `${offsetMinutes} minutes`;
    if (offsetMinutes < 1440) return `${Math.round(offsetMinutes / 60)} hours`;
    return `${Math.round(offsetMinutes / 1440)} days`;
  }

  /**
   * Evaluate and deliver due interview reminders (FR-098, FR-099, AC-F-02)
   */
  async processInterviewReminders(referenceTime = new Date()) {
    const now = referenceTime;

    // Find all scheduled events that haven't ended yet
    const events = await Interview.find({
      status: 'scheduled',
      startAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } // Within past 24h to future
    }).populate('applicationId', 'companyName jobTitle');

    let remindersDelivered = 0;

    for (const event of events) {
      const alreadySentOffsets = (event.remindersSent || []).map((r) => r.offsetMinutes);
      const offsetsToProcess = (event.reminderOffsets || []).filter(
        (offset) => !alreadySentOffsets.includes(offset)
      );

      const newlySent = [];

      for (const offset of offsetsToProcess) {
        const triggerTime = new Date(event.startAt.getTime() - offset * 60 * 1000);

        // If trigger time has arrived (and event hasn't started more than 1 hour ago)
        if (triggerTime <= now && event.startAt > new Date(now.getTime() - 60 * 60 * 1000)) {
          const offsetText = this.formatOffsetLabel(offset);
          const company = event.applicationId?.companyName;
          const subject = company ? `${event.title} with ${company}` : event.title;

          const title = `Upcoming ${event.type === 'interview' ? 'Interview' : 'Event'}: ${event.title}`;
          const message = `Your ${event.type} "${subject}" is scheduled in ${offsetText} (at ${event.startAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`;

          await notificationService.createNotification(event.userId, {
            type: 'interview_reminder',
            title,
            message,
            relatedEntityType: 'interview',
            relatedEntityId: event._id,
            metadata: {
              eventId: event._id,
              applicationId: event.applicationId?._id,
              offsetMinutes: offset,
              startAt: event.startAt
            }
          });

          newlySent.push({
            offsetMinutes: offset,
            sentAt: now
          });
          remindersDelivered++;
        }
      }

      if (newlySent.length > 0) {
        await Interview.updateOne(
          { _id: event._id },
          { $push: { remindersSent: { $each: newlySent } } }
        );
      }
    }

    return remindersDelivered;
  }

  /**
   * Process follow-up reminders for applications (FR-101)
   */
  async processFollowUpReminders(referenceTime = new Date()) {
    const now = referenceTime;

    // Find applications with followUpDate set
    const applications = await Application.find({
      followUpDate: { $ne: null }
    }).populate('userId', 'timezone notificationPreferences');

    let followUpsDelivered = 0;

    for (const app of applications) {
      if (!app.userId) continue;

      const userTz = app.userId.timezone || 'UTC';

      // Check current date/time in user's timezone
      let userNow;
      try {
        userNow = new Date(now.toLocaleString('en-US', { timeZone: userTz }));
      } catch {
        userNow = now;
      }

      const followUp = new Date(app.followUpDate);
      const isSameDate =
        followUp.getFullYear() === userNow.getFullYear() &&
        followUp.getMonth() === userNow.getMonth() &&
        followUp.getDate() === userNow.getDate();

      // Trigger if it's the target date and at/past 09:00 in user's timezone (FR-101)
      if (isSameDate && userNow.getHours() >= 9) {
        // Prevent duplicate for today
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const existingNotification = await Notification.findOne({
          userId: app.userId._id,
          type: 'follow_up_reminder',
          relatedEntityId: app._id,
          createdAt: { $gte: startOfDay }
        });

        if (!existingNotification) {
          await notificationService.createNotification(app.userId._id, {
            type: 'follow_up_reminder',
            title: `Follow-up Due: ${app.companyName}`,
            message: `You have a scheduled follow-up today for your "${app.jobTitle}" application at ${app.companyName}.`,
            relatedEntityType: 'application',
            relatedEntityId: app._id,
            metadata: {
              applicationId: app._id,
              companyName: app.companyName,
              jobTitle: app.jobTitle
            }
          });
          followUpsDelivered++;
        }
      }
    }

    return followUpsDelivered;
  }

  /**
   * Main scheduler tick (runs every 5 minutes per FR-098)
   */
  async runSchedulerTick() {
    try {
      const interviewReminders = await this.processInterviewReminders();
      const followUpReminders = await this.processFollowUpReminders();
      // Periodically clean up notifications > 90 days (FR-112)
      await notificationService.cleanExpiredNotifications();
      return { interviewReminders, followUpReminders };
    } catch (err) {
      console.error('[ReminderScheduler Error]:', err.message);
      return { error: err.message };
    }
  }
}

module.exports = new ReminderService();

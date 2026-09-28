const Interview = require('../models/Interview');
const Application = require('../models/Application');
const AppError = require('../utils/AppError');

class InterviewService {
  /**
   * Check if a time interval overlaps with any scheduled events for the user (FR-100)
   */
  async checkOverlap(userId, startAt, endAt, excludeEventId = null) {
    const start = new Date(startAt);
    const end = endAt ? new Date(endAt) : new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour duration if not specified

    const query = {
      userId,
      status: 'scheduled',
      $or: [
        // Existing event starts before requested end and ends after requested start
        {
          startAt: { $lt: end },
          endAt: { $gt: start }
        },
        // Existing event has no endAt, but its default 1-hour window overlaps
        {
          endAt: null,
          startAt: {
            $gte: new Date(start.getTime() - 60 * 60 * 1000),
            $lt: end
          }
        }
      ]
    };

    if (excludeEventId) {
      query._id = { $ne: excludeEventId };
    }

    const overlapping = await Interview.findOne(query).select('title startAt endAt type');
    if (overlapping) {
      return {
        hasOverlap: true,
        overlappingEvent: {
          _id: overlapping._id,
          title: overlapping.title,
          startAt: overlapping.startAt,
          endAt: overlapping.endAt,
          type: overlapping.type
        }
      };
    }

    return { hasOverlap: false, overlappingEvent: null };
  }

  /**
   * Create new interview event (FR-089 - FR-091)
   */
  async createInterview(userId, data) {
    // If applicationId is provided, ensure it belongs to the user (FR-091, AC-F-04)
    if (data.applicationId) {
      const app = await Application.findOne({
        _id: data.applicationId,
        userId
      });
      if (!app) {
        throw new AppError('Linked application not found', 404, 'NOT_FOUND');
      }
    }

    // Check for overlap warning (FR-100)
    const { hasOverlap, overlappingEvent } = await this.checkOverlap(
      userId,
      data.startAt,
      data.endAt
    );

    const interview = await Interview.create({
      ...data,
      userId
    });

    const populated = await Interview.findById(interview._id).populate(
      'applicationId',
      'companyName jobTitle location status'
    );

    return {
      interview: populated,
      hasOverlap,
      overlappingEvent
    };
  }

  /**
   * List interview events with date range and status filtering (FR-095)
   */
  async listInterviews(userId, query = {}) {
    const filter = { userId };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.applicationId) {
      filter.applicationId = query.applicationId;
    }

    if (query.startDate || query.endDate) {
      filter.startAt = {};
      if (query.startDate) {
        filter.startAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.startAt.$lte = new Date(query.endDate);
      }
    }

    const interviews = await Interview.find(filter)
      .populate('applicationId', 'companyName jobTitle location status')
      .sort({ startAt: 1 })
      .lean();

    return interviews;
  }

  /**
   * Get upcoming events in next 30 days (FR-094, FR-101)
   */
  async getUpcomingInterviews(userId) {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const interviews = await Interview.find({
      userId,
      status: 'scheduled',
      startAt: { $gte: now, $lte: thirtyDaysLater }
    })
      .populate('applicationId', 'companyName jobTitle location status')
      .sort({ startAt: 1 })
      .lean();

    return interviews;
  }

  /**
   * Get single interview event by ID (FR-089)
   */
  async getInterviewById(userId, interviewId) {
    const interview = await Interview.findOne({
      _id: interviewId,
      userId
    }).populate('applicationId', 'companyName jobTitle location status');

    if (!interview) {
      throw new AppError('Interview event not found', 404, 'NOT_FOUND');
    }

    return interview;
  }

  /**
   * Update or reschedule interview event (FR-092, FR-093, AC-F-03)
   */
  async updateInterview(userId, interviewId, data) {
    const interview = await Interview.findOne({
      _id: interviewId,
      userId
    });

    if (!interview) {
      throw new AppError('Interview event not found', 404, 'NOT_FOUND');
    }

    // Verify application if updated
    if (data.applicationId && data.applicationId !== String(interview.applicationId)) {
      const app = await Application.findOne({
        _id: data.applicationId,
        userId
      });
      if (!app) {
        throw new AppError('Linked application not found', 404, 'NOT_FOUND');
      }
    }

    // Check overlap if timing changed
    let overlapInfo = { hasOverlap: false, overlappingEvent: null };
    const newStart = data.startAt || interview.startAt;
    const newEnd = data.endAt !== undefined ? data.endAt : interview.endAt;

    if (data.startAt || data.endAt !== undefined) {
      overlapInfo = await this.checkOverlap(userId, newStart, newEnd, interview._id);
    }

    // If start time was rescheduled, reset remindersSent per AC-F-03
    if (data.startAt && new Date(data.startAt).getTime() !== interview.startAt.getTime()) {
      data.remindersSent = [];
      // If endAt was not explicitly provided, preserve duration so endAt remains > startAt
      if (!data.endAt && interview.endAt) {
        const oldDuration = interview.endAt.getTime() - interview.startAt.getTime();
        if (oldDuration > 0) {
          data.endAt = new Date(new Date(data.startAt).getTime() + oldDuration);
        }
      }
    }

    Object.assign(interview, data);
    await interview.save();

    const populated = await Interview.findById(interview._id).populate(
      'applicationId',
      'companyName jobTitle location status'
    );

    return {
      interview: populated,
      hasOverlap: overlapInfo.hasOverlap,
      overlappingEvent: overlapInfo.overlappingEvent
    };
  }

  /**
   * Delete interview event (FR-092)
   */
  async deleteInterview(userId, interviewId) {
    const interview = await Interview.findOneAndDelete({
      _id: interviewId,
      userId
    });

    if (!interview) {
      throw new AppError('Interview event not found', 404, 'NOT_FOUND');
    }

    return { success: true };
  }

  /**
   * Generate RFC 5545 .ics Calendar export for an event (FR-103)
   */
  async generateIcs(userId, interviewId) {
    const interview = await this.getInterviewById(userId, interviewId);

    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    const formatIcsDate = (date) => {
      const d = new Date(date);
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
        d.getUTCHours()
      )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    };

    const startUtc = formatIcsDate(interview.startAt);
    const endUtc = interview.endAt
      ? formatIcsDate(interview.endAt)
      : formatIcsDate(new Date(interview.startAt.getTime() + 60 * 60 * 1000));
    const nowUtc = formatIcsDate(new Date());

    const summary = interview.applicationId
      ? `${interview.title} - ${interview.applicationId.companyName}`
      : interview.title;

    const location = interview.locationOrLink || (interview.format ? `Format: ${interview.format}` : '');
    const description = interview.notes ? interview.notes.replace(/\n/g, '\\n') : '';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CareerPilot//Interview Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:careerpilot-${interview._id}@careerpilot.app`,
      `DTSTAMP:${nowUtc}`,
      `DTSTART:${startUtc}`,
      `DTEND:${endUtc}`,
      `SUMMARY:${summary}`,
      location ? `LOCATION:${location}` : '',
      description ? `DESCRIPTION:${description}` : '',
      `STATUS:${interview.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ]
      .filter(Boolean)
      .join('\r\n');

    return {
      filename: `interview-${interview._id}.ics`,
      content: icsContent
    };
  }
}

module.exports = new InterviewService();

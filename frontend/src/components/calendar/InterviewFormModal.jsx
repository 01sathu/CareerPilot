import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Briefcase,
  Video,
  Phone,
  Building2,
  X,
  AlertTriangle,
  AlertCircle,
  Save,
  RefreshCw
} from 'lucide-react';
import calendarService from '../../services/calendar.service';
import { getApplications } from '../../services/application.service';

export default function InterviewFormModal({
  isOpen,
  onClose,
  initialDate,
  editEvent = null,
  onSaved
}) {
  const [applications, setApplications] = useState([]);
  const [applicationId, setApplicationId] = useState('');
  const [type, setType] = useState('interview');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('11:00');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [format, setFormat] = useState('video');
  const [locationOrLink, setLocationOrLink] = useState('');
  const [roundLabel, setRoundLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [reminderOffsets, setReminderOffsets] = useState([1440, 60]);

  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [overlapWarning, setOverlapWarning] = useState(null);

  // Initialize or reset form fields
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setOverlapWarning(null);

      // Fetch applications for selector
      const fetchApps = async () => {
        setIsLoadingApps(true);
        try {
          const res = await getApplications({ limit: 100 });
          setApplications(res.data || []);
        } catch {
          // Ignore
        } finally {
          setIsLoadingApps(false);
        }
      };
      fetchApps();

      if (editEvent) {
        setApplicationId(editEvent.applicationId?._id || editEvent.applicationId || '');
        setType(editEvent.type || 'interview');
        setTitle(editEvent.title || '');

        const s = new Date(editEvent.startAt);
        setStartDate(s.toISOString().split('T')[0]);
        setStartTime(s.toTimeString().slice(0, 5));

        if (editEvent.endAt) {
          const e = new Date(editEvent.endAt);
          setEndDate(e.toISOString().split('T')[0]);
          setEndTime(e.toTimeString().slice(0, 5));
        } else {
          setEndDate(s.toISOString().split('T')[0]);
          setEndTime('');
        }

        setTimezone(editEvent.timezone || 'UTC');
        setFormat(editEvent.format || 'video');
        setLocationOrLink(editEvent.locationOrLink || '');
        setRoundLabel(editEvent.roundLabel || '');
        setNotes(editEvent.notes || '');
        setReminderOffsets(editEvent.reminderOffsets || [1440, 60]);
      } else {
        // New event
        const defaultDate = initialDate || new Date();
        const dStr = new Date(defaultDate).toISOString().split('T')[0];
        setStartDate(dStr);
        setStartTime('10:00');
        setEndDate(dStr);
        setEndTime('11:00');
        setApplicationId('');
        setType('interview');
        setTitle('');
        setFormat('video');
        setLocationOrLink('');
        setRoundLabel('');
        setNotes('');
        setReminderOffsets([1440, 60]);
      }
    }
  }, [isOpen, editEvent, initialDate]);

  if (!isOpen) return null;

  const toggleOffset = (offset) => {
    setReminderOffsets((prev) =>
      prev.includes(offset) ? prev.filter((o) => o !== offset) : [...prev, offset]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setOverlapWarning(null);

    if (!title.trim()) {
      setError('Event title is required.');
      return;
    }

    if (!startDate || !startTime) {
      setError('Start date and time are required.');
      return;
    }

    const startAt = new Date(`${startDate}T${startTime}:00`).toISOString();
    let endAt = null;
    if (endDate && endTime) {
      const eDate = new Date(`${endDate}T${endTime}:00`);
      if (eDate <= new Date(startAt)) {
        setError('End time must be after start time (FR-090).');
        return;
      }
      endAt = eDate.toISOString();
    }

    const payload = {
      applicationId: applicationId || null,
      type,
      title: title.trim(),
      startAt,
      endAt,
      timezone,
      format,
      locationOrLink: locationOrLink.trim(),
      roundLabel: roundLabel.trim(),
      notes: notes.trim(),
      reminderOffsets
    };

    setIsSubmitting(true);
    try {
      let res;
      if (editEvent) {
        res = await calendarService.updateInterview(editEvent._id, payload);
      } else {
        res = await calendarService.createInterview(payload);
      }

      if (res?.hasOverlap && res?.overlappingEvent) {
        // If overlap detected, notify user but still save per FR-100 non-blocking behavior
        if (onSaved) {
          onSaved(res.interview, res.overlappingEvent);
        }
      } else {
        if (onSaved) {
          onSaved(res.interview, null);
        }
      }
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to save calendar event'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative text-left max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {editEvent ? 'Edit Calendar Event' : 'Schedule New Event'}
            </h2>
            <p className="text-xs text-slate-400">
              Interviews, assessments, and application milestones (FR-089)
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center space-x-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {overlapWarning && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start space-x-2 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Schedule Conflict Notice (FR-100): </span>
              This event overlaps with "{overlapWarning.title}".
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Linked Application Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Link to Job Application (Optional)
            </label>
            <select
              value={applicationId}
              onChange={(e) => {
                setApplicationId(e.target.value);
                // Auto-suggest title if empty
                if (!title && e.target.value) {
                  const selected = applications.find((a) => a._id === e.target.value);
                  if (selected) {
                    setTitle(`Interview with ${selected.companyName}`);
                  }
                }
              }}
              className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="">-- No linked application (Standalone Event) --</option>
              {applications.map((app) => (
                <option key={app._id} value={app._id}>
                  {app.companyName} — {app.jobTitle} ({app.status})
                </option>
              ))}
            </select>
          </div>

          {/* Event Type & Round Label */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Event Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="interview">Interview</option>
                <option value="assessment">Assessment / Coding Test</option>
                <option value="follow_up">Follow-up Call / Check-in</option>
                <option value="other">Other Milestone</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Round / Stage Label (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Technical Round 1, System Design"
                value={roundLabel}
                onChange={(e) => setRoundLabel(e.target.value)}
                maxLength={120}
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder-slate-500"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Event Title *</label>
            <input
              type="text"
              placeholder="e.g. System Design Interview with Stripe"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={120}
              className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder-slate-500"
            />
          </div>

          {/* Start Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Start Time *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* End Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">End Date (Optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">End Time (Optional)</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Format & Link */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="video">Video Call</option>
                <option value="phone">Phone Screen</option>
                <option value="onsite">On-site / Office</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1">
                Meeting Link or Location
              </label>
              <input
                type="text"
                placeholder="e.g. Google Meet URL, Zoom link, or address"
                value={locationOrLink}
                onChange={(e) => setLocationOrLink(e.target.value)}
                maxLength={2048}
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder-slate-500"
              />
            </div>
          </div>

          {/* Reminder Offsets (FR-097) */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Reminder Notifications (FR-097)
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { offset: 15, label: '15 min before' },
                { offset: 60, label: '1 hour before' },
                { offset: 1440, label: '1 day before' },
                { offset: 2880, label: '2 days before' }
              ].map((item) => {
                const checked = reminderOffsets.includes(item.offset);
                return (
                  <button
                    key={item.offset}
                    type="button"
                    onClick={() => toggleOffset(item.offset)}
                    className={`px-3 py-1.5 rounded-xl border font-medium transition flex items-center space-x-1.5 ${
                      checked
                        ? 'bg-brand-600/20 text-brand-300 border-brand-500/40'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{checked ? '✓' : '+'}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Preparation Notes (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Questions to ask, interviewer names, key talking points..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl p-3 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder-slate-500 leading-relaxed font-sans"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20 transition disabled:opacity-50 flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Event...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{editEvent ? 'Update Event' : 'Schedule Event'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

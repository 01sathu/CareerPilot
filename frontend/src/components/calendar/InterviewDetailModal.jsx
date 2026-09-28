import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Briefcase,
  Video,
  Phone,
  Building2,
  Download,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ExternalLink,
  X,
  MapPin,
  FileText
} from 'lucide-react';
import calendarService from '../../services/calendar.service';

export default function InterviewDetailModal({
  isOpen,
  onClose,
  event,
  onEdit,
  onDeleted,
  onStatusUpdated
}) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDownloadingIcs, setIsDownloadingIcs] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !event) return null;

  const handleStatusChange = async (newStatus) => {
    setIsUpdatingStatus(true);
    setError(null);
    try {
      const res = await calendarService.updateInterview(event._id, { status: newStatus });
      if (onStatusUpdated) {
        onStatusUpdated(res.interview);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update event status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDownloadIcs = async () => {
    setIsDownloadingIcs(true);
    try {
      await calendarService.downloadIcs(event._id);
    } catch {
      setError('Failed to download .ics calendar file');
    } finally {
      setIsDownloadingIcs(false);
    }
  };

  const getFormatIcon = (fmt) => {
    switch (fmt) {
      case 'video':
        return <Video className="w-4 h-4 text-sky-400" />;
      case 'phone':
        return <Phone className="w-4 h-4 text-emerald-400" />;
      case 'onsite':
        return <Building2 className="w-4 h-4 text-amber-400" />;
      default:
        return <Calendar className="w-4 h-4 text-brand-400" />;
    }
  };

  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-start space-x-3 mb-5 pr-8">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
            {getFormatIcon(event.format)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white tracking-tight leading-snug">
                {event.title}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
              <span className="capitalize px-2 py-0.5 rounded-md bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">
                {event.type}
              </span>
              {event.roundLabel && (
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                  {event.roundLabel}
                </span>
              )}
              <span
                className={`capitalize px-2 py-0.5 rounded-md font-semibold border ${
                  event.status === 'completed'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : event.status === 'cancelled'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                }`}
              >
                {event.status}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Event Body Details */}
        <div className="space-y-3.5 text-xs text-slate-300">
          {/* Time & Duration */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-start space-x-3">
            <Clock className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">
                {start.toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                {end ? `– ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}{' '}
                ({event.timezone || 'UTC'})
              </p>
            </div>
          </div>

          {/* Location or Meeting Link */}
          {event.locationOrLink && (
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-start space-x-3">
              <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="overflow-hidden">
                <p className="font-semibold text-white">Location / Meeting Link</p>
                {event.locationOrLink.startsWith('http') ? (
                  <a
                    href={event.locationOrLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-sky-400 hover:text-sky-300 underline break-all inline-flex items-center space-x-1 mt-0.5"
                  >
                    <span>{event.locationOrLink}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 ml-1" />
                  </a>
                ) : (
                  <p className="text-[11px] text-slate-300 mt-0.5">{event.locationOrLink}</p>
                )}
              </div>
            </div>
          )}

          {/* Linked Job Application */}
          {event.applicationId && (
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex items-start space-x-3">
              <Briefcase className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Linked Job Application</p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  <span className="font-bold text-white">{event.applicationId.companyName}</span> —{' '}
                  {event.applicationId.jobTitle}
                  {event.applicationId.location ? ` (${event.applicationId.location})` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
              <p className="font-semibold text-white mb-1 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Notes &amp; Preparation</span>
              </p>
              <p className="text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                {event.notes}
              </p>
            </div>
          )}
        </div>

        {/* Status Actions */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            {event.status === 'scheduled' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleStatusChange('completed')}
                  disabled={isUpdatingStatus}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Completed</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={isUpdatingStatus}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition flex items-center space-x-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel Event</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleStatusChange('scheduled')}
                disabled={isUpdatingStatus}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-sky-300 hover:text-sky-200 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen Event</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* .ics export */}
            <button
              type="button"
              onClick={handleDownloadIcs}
              disabled={isDownloadingIcs}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
              title="Download .ics Calendar file (FR-103)"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Edit */}
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onEdit) onEdit(event);
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
              title="Edit event"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={async () => {
                if (window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
                  try {
                    await calendarService.deleteInterview(event._id);
                    if (onDeleted) onDeleted(event._id);
                    onClose();
                  } catch (err) {
                    setError(err.response?.data?.error?.message || 'Failed to delete event');
                  }
                }
              }}
              className="p-2 rounded-xl text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 transition"
              title="Delete event"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

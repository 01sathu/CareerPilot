import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Calendar, 
  ExternalLink, 
  Clock, 
  Edit3, 
  Trash2, 
  History, 
  CheckCircle2, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { ALL_STATUSES, STATUS_CONFIG } from '../../utils/statusColors';

export default function ApplicationDetailModal({
  isOpen,
  applicationData,
  onClose,
  onEdit,
  onDelete,
  onStatusChange
}) {
  if (!isOpen || !applicationData) return null;

  const { application, history = [] } = applicationData;

  const [selectedStatus, setSelectedStatus] = useState(application.status);
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const formatDisplayDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '—';
    }
  };

  const formatTimestamp = (d) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const handleStatusUpdate = async () => {
    if (selectedStatus === application.status) return;

    setIsUpdatingStatus(true);
    setUpdateError('');
    try {
      await onStatusChange(application._id, selectedStatus, statusNote);
      setStatusNote('');
    } catch (err) {
      setUpdateError(err.response?.data?.error?.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-brand-400 font-bold text-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {application.companyName}
                </h2>
                <StatusBadge status={application.status} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                {application.jobTitle} {application.location ? `• ${application.location}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(application)}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 transition"
              title="Edit application"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(application)}
              className="p-2 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl border border-rose-500/20 transition"
              title="Delete application"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto pr-1 py-5 space-y-6 flex-1">
          {/* Quick Status Bar (FR-040) */}
          <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl">
            <span className="text-xs font-semibold text-slate-300 block mb-2">
              Update Current Status
            </span>
            {updateError && (
              <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{updateError}</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50 capitalize"
              >
                {ALL_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    Move to: {STATUS_CONFIG[st].label}
                  </option>
                ))}
              </select>

              {selectedStatus !== application.status && (
                <>
                  <input
                    type="text"
                    placeholder="Optional note for status transition..."
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    maxLength={500}
                    className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                  <button
                    onClick={handleStatusUpdate}
                    disabled={isUpdatingStatus}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl text-xs transition shadow-lg shadow-brand-500/20 disabled:opacity-50"
                  >
                    {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-800/30 border border-slate-800 rounded-xl">
              <span className="text-[11px] text-slate-400 block mb-0.5">Applied Date</span>
              <span className="text-xs font-semibold text-white">
                {formatDisplayDate(application.appliedDate)}
              </span>
            </div>

            <div className="p-3 bg-slate-800/30 border border-slate-800 rounded-xl">
              <span className="text-[11px] text-slate-400 block mb-0.5">Follow-up Date</span>
              <span className="text-xs font-semibold text-white">
                {formatDisplayDate(application.followUpDate)}
              </span>
            </div>

            <div className="p-3 bg-slate-800/30 border border-slate-800 rounded-xl">
              <span className="text-[11px] text-slate-400 block mb-0.5">Deadline</span>
              <span className="text-xs font-semibold text-white">
                {formatDisplayDate(application.deadlineDate)}
              </span>
            </div>

            <div className="p-3 bg-slate-800/30 border border-slate-800 rounded-xl">
              <span className="text-[11px] text-slate-400 block mb-0.5">Compensation</span>
              <span className="text-xs font-semibold text-white">
                {application.salary?.min || application.salary?.max
                  ? `${application.salary.currency || 'USD'} ${application.salary.min ? application.salary.min.toLocaleString() : '0'} - ${application.salary.max ? application.salary.max.toLocaleString() : 'Negotiable'} / ${application.salary.period}`
                  : 'Not specified'}
              </span>
            </div>
          </div>

          {/* External Link */}
          {application.applicationUrl && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400">Job URL:</span>
              <a
                href={application.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-brand-400 hover:text-brand-300 hover:underline break-all"
              >
                <span>{application.applicationUrl}</span>
                <ExternalLink className="w-3 h-3 flex-shrink-0 ml-0.5" />
              </a>
            </div>
          )}

          {/* Notes (FR-031: Plain text rendering) */}
          {application.notes && (
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Personal Notes
              </h3>
              <div className="p-3.5 bg-slate-800/50 border border-slate-800 rounded-xl text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {application.notes}
              </div>
            </div>
          )}

          {/* Job Description */}
          {application.jobDescription && (
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Job Description
              </h3>
              <div className="p-3.5 bg-slate-800/50 border border-slate-800 rounded-xl text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-mono text-[11px]">
                {application.jobDescription}
              </div>
            </div>
          )}

          {/* Chronological Status & Activity History Timeline (FR-041, FR-042, FR-114) */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <History className="w-3.5 h-3.5 text-brand-400" />
              <span>Status &amp; Activity Timeline</span>
            </h3>

            {history.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No activity recorded yet.</p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {history.map((event) => (
                  <div key={event._id} className="relative">
                    {/* Timeline bullet */}
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-slate-900" />

                    <div className="bg-slate-800/40 border border-slate-800/80 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-white capitalize">
                          {event.eventType === 'created' && 'Application Created'}
                          {event.eventType === 'status_changed' && (
                            <span className="inline-flex items-center space-x-1.5">
                              <span>Status Changed</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({event.fromStatus ? STATUS_CONFIG[event.fromStatus]?.label : 'None'}
                                <ArrowRight className="w-2.5 h-2.5 inline mx-1" />
                                {STATUS_CONFIG[event.toStatus]?.label})
                              </span>
                            </span>
                          )}
                          {event.eventType === 'updated' && `Details Updated (${event.changedFields?.join(', ') || 'Fields'})`}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>

                      {event.note && (
                        <p className="text-xs text-slate-300 mt-1 italic bg-slate-900/40 p-2 rounded-lg border border-slate-800/60">
                          "{event.note}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

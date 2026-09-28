import React, { useState } from 'react';
import {
  Video,
  Phone,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  Download,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  Plus
} from 'lucide-react';
import { calendarService } from '../../services/calendar.service';

export default function CalendarListView({
  events,
  onSelectEvent,
  onOpenCreateModal,
  onRefresh
}) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownloadIcs = async (e, eventId) => {
    e.stopPropagation();
    try {
      setDownloadingId(eventId);
      await calendarService.downloadIcs(eventId);
    } catch (err) {
      console.error('Failed to download .ics', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleQuickStatusChange = async (e, ev, newStatus) => {
    e.stopPropagation();
    try {
      await calendarService.updateInterview(ev._id, { status: newStatus });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (filterStatus !== 'all' && ev.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ev.title?.toLowerCase().includes(q);
      const matchRound = ev.roundLabel?.toLowerCase().includes(q);
      const matchNotes = ev.notes?.toLowerCase().includes(q);
      const matchApp =
        ev.applicationId?.companyName?.toLowerCase().includes(q) ||
        ev.applicationId?.jobTitle?.toLowerCase().includes(q);
      if (!matchTitle && !matchRound && !matchNotes && !matchApp) return false;
    }
    return true;
  });

  // Group filtered events by: Today, Tomorrow, Upcoming, Past
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrowStart = todayStart + 86400000;
  const dayAfterTomorrow = tomorrowStart + 86400000;

  const grouped = {
    today: [],
    tomorrow: [],
    upcoming: [],
    past: []
  };

  filteredEvents.forEach((ev) => {
    const evTime = new Date(ev.startAt).getTime();
    if (evTime < todayStart) {
      grouped.past.push(ev);
    } else if (evTime >= todayStart && evTime < tomorrowStart) {
      grouped.today.push(ev);
    } else if (evTime >= tomorrowStart && evTime < dayAfterTomorrow) {
      grouped.tomorrow.push(ev);
    } else {
      grouped.upcoming.push(ev);
    }
  });

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
            Scheduled
          </span>
        );
    }
  };

  const renderSection = (title, items, isPast = false) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <h3
            className={`text-sm font-bold uppercase tracking-wider ${
              isPast ? 'text-slate-500' : 'text-slate-300'
            }`}
          >
            {title}
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {items.length}
          </span>
        </div>

        <div className="space-y-3">
          {items.map((ev) => {
            const startDate = new Date(ev.startAt);
            const endDate = new Date(ev.endAt);

            return (
              <div
                key={ev._id}
                onClick={() => onSelectEvent(ev)}
                className={`bg-slate-900/90 border border-slate-800 hover:border-brand-500/50 rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-brand-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isPast || ev.status === 'cancelled' ? 'opacity-75' : ''
                }`}
              >
                {/* Left: Date & Info */}
                <div className="flex items-start space-x-4">
                  {/* Date square */}
                  <div className="shrink-0 w-14 h-14 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {startDate.toLocaleDateString(undefined, { month: 'short' })}
                    </span>
                    <span className="text-lg font-bold text-white leading-none">
                      {startDate.getDate()}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {startDate.toLocaleDateString(undefined, { weekday: 'short' })}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="p-1 rounded bg-slate-800">{getFormatIcon(ev.format)}</span>
                      <h4 className="text-base font-semibold text-white hover:text-brand-300 transition">
                        {ev.title}
                      </h4>
                      {ev.roundLabel && (
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {ev.roundLabel}
                        </span>
                      )}
                    </div>

                    {/* Linked application / company */}
                    {ev.applicationId && (
                      <div className="text-xs text-brand-400 font-medium">
                        {ev.applicationId.companyName}{' '}
                        <span className="text-slate-500">•</span> {ev.applicationId.jobTitle}
                      </div>
                    )}

                    {/* Time & Location */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                          - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </span>

                      {ev.locationOrLink && (
                        <span className="flex items-center space-x-1 max-w-[200px] truncate text-slate-400">
                          {ev.locationOrLink.startsWith('http') ? (
                            <a
                              href={ev.locationOrLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-sky-400 hover:underline flex items-center space-x-1 truncate"
                            >
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{ev.locationOrLink}</span>
                            </a>
                          ) : (
                            <span className="truncate">{ev.locationOrLink}</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Status badge & Actions */}
                <div className="flex items-center space-x-3 shrink-0 self-end md:self-center">
                  {getStatusBadge(ev.status)}

                  {/* Export iCal button */}
                  <button
                    type="button"
                    onClick={(e) => handleDownloadIcs(e, ev._id)}
                    disabled={downloadingId === ev._id}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/60"
                    title="Export .ics file"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Quick status actions */}
                  {ev.status === 'scheduled' && (
                    <button
                      type="button"
                      onClick={(e) => handleQuickStatusChange(e, ev, 'completed')}
                      className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition border border-emerald-500/20"
                      title="Mark as Completed"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const hasAny =
    grouped.today.length > 0 ||
    grouped.tomorrow.length > 0 ||
    grouped.upcoming.length > 0 ||
    grouped.past.length > 0;

  return (
    <div className="space-y-6 text-left">
      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search interviews, companies..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none transition"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            {['all', 'scheduled', 'completed', 'cancelled'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg capitalize transition font-medium ${
                  filterStatus === st
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grouped lists */}
      {!hasAny ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300">No interviews found</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1 mb-6">
            {searchQuery || filterStatus !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Keep track of your scheduled interviews, tech assessments, and HR screenings.'}
          </p>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition shadow-lg shadow-brand-500/20 inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule First Interview</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {renderSection('Today', grouped.today)}
          {renderSection('Tomorrow', grouped.tomorrow)}
          {renderSection('Upcoming', grouped.upcoming)}
          {renderSection('Past Interviews', grouped.past, true)}
        </div>
      )}
    </div>
  );
}

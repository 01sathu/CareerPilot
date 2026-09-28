import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/layout/Navbar';
import CalendarMonthView from '../../components/calendar/CalendarMonthView';
import CalendarWeekView from '../../components/calendar/CalendarWeekView';
import CalendarListView from '../../components/calendar/CalendarListView';
import InterviewFormModal from '../../components/calendar/InterviewFormModal';
import InterviewDetailModal from '../../components/calendar/InterviewDetailModal';
import { calendarService } from '../../services/calendar.service';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Video,
  Phone,
  Building2,
  CalendarDays,
  LayoutList,
  Columns
} from 'lucide-react';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('careerpilot_calendar_view') || 'month';
    } catch {
      return 'month';
    }
  });

  const [events, setEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialDate, setFormInitialDate] = useState(null);
  const [formEditEvent, setFormEditEvent] = useState(null);
  const [detailModalEvent, setDetailModalEvent] = useState(null);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('careerpilot_calendar_view', mode);
    } catch {
      // Ignore
    }
  };

  // Fetch interviews based on view and month
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Calculate date range covering active month +/- 15 days for seamless month/week transitions
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month + 2, 0, 23, 59, 59).toISOString();

      const [interviewsRes, upcomingRes] = await Promise.all([
        calendarService.getInterviews({ startDate, endDate, limit: 100 }),
        calendarService.getUpcomingInterviews()
      ]);

      const eventsList = Array.isArray(interviewsRes) ? interviewsRes : (interviewsRes?.data || interviewsRes?.interviews || []);
      const upcomingList = Array.isArray(upcomingRes) ? upcomingRes : (upcomingRes?.data || upcomingRes?.interviews || []);

      setEvents(eventsList);
      setUpcomingEvents(upcomingList);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load calendar events');
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Date Navigation
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Header Title
  const getHeaderDateTitle = () => {
    if (viewMode === 'month' || viewMode === 'list') {
      return currentDate.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric'
      });
    }

    if (viewMode === 'week') {
      const d = new Date(currentDate);
      const day = d.getDay();
      const start = new Date(d);
      start.setDate(d.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const sameMonth = start.getMonth() === end.getMonth();
      const sameYear = start.getFullYear() === end.getFullYear();

      if (sameMonth) {
        return `${start.toLocaleDateString(undefined, {
          month: 'short'
        })} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
      }
      if (sameYear) {
        return `${start.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        })} – ${end.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        })}, ${start.getFullYear()}`;
      }
      return `${start.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })} – ${end.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}`;
    }
  };

  // Event creation handlers
  const handleOpenCreateModal = (date = null) => {
    setFormInitialDate(date || new Date());
    setFormEditEvent(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (ev) => {
    setDetailModalEvent(null);
    setFormEditEvent(ev);
    setFormInitialDate(null);
    setIsFormOpen(true);
  };

  const handleSelectEvent = (ev) => {
    setDetailModalEvent(ev);
  };

  const getFormatIcon = (fmt) => {
    switch (fmt) {
      case 'video':
        return <Video className="w-3.5 h-3.5 text-sky-400" />;
      case 'phone':
        return <Phone className="w-3.5 h-3.5 text-emerald-400" />;
      case 'onsite':
        return <Building2 className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <CalendarIcon className="w-3.5 h-3.5 text-brand-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
              <span>Interview Calendar</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Schedule interview rounds, track preparation, and keep your pipeline on schedule.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => handleOpenCreateModal(null)}
              className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Event</span>
            </button>
          </div>
        </div>

        {/* Calendar Controls Bar: Nav + Date Title + View Switcher */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          {/* Navigation Controls */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handlePrev}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition"
              >
                Today
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-white px-2">
              {getHeaderDateTitle()}
            </h2>
          </div>

          {/* View Switcher: Month | Week | List */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 self-stretch sm:self-auto justify-center">
            <button
              type="button"
              onClick={() => handleViewModeChange('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                viewMode === 'month'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Month</span>
            </button>

            <button
              type="button"
              onClick={() => handleViewModeChange('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                viewMode === 'week'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Week</span>
            </button>

            <button
              type="button"
              onClick={() => handleViewModeChange('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                viewMode === 'list'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Agenda</span>
            </button>
          </div>
        </div>

        {/* Main Grid: Calendar Content + Upcoming Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Calendar Display Area (3 cols on lg) */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-96 bg-slate-900/40 rounded-3xl border border-slate-800">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-400 text-sm">Loading schedule...</p>
                </div>
              </div>
            ) : error ? (
              <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm text-center">
                {error}
              </div>
            ) : (
              <>
                {viewMode === 'month' && (
                  <CalendarMonthView
                    currentDate={currentDate}
                    events={events}
                    onSelectEvent={handleSelectEvent}
                    onAddEventOnDate={(d) => handleOpenCreateModal(d)}
                  />
                )}

                {viewMode === 'week' && (
                  <CalendarWeekView
                    currentDate={currentDate}
                    events={events}
                    onSelectEvent={handleSelectEvent}
                    onAddEventOnDate={(d) => handleOpenCreateModal(d)}
                  />
                )}

                {viewMode === 'list' && (
                  <CalendarListView
                    events={events}
                    onSelectEvent={handleSelectEvent}
                    onOpenCreateModal={() => handleOpenCreateModal(null)}
                    onRefresh={loadData}
                  />
                )}
              </>
            )}
          </div>

          {/* Right Sidebar: Upcoming Events Widget (FR-094) */}
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl text-left">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-brand-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                    Next 30 Days
                  </h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {upcomingEvents.length}
                </span>
              </div>

              <div className="mt-4 space-y-3 overflow-y-auto max-h-[520px] pr-1">
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">
                    No interviews scheduled in the next 30 days.
                  </p>
                ) : (
                  upcomingEvents.map((ev) => {
                    const start = new Date(ev.startAt);
                    return (
                      <div
                        key={ev._id}
                        onClick={() => handleSelectEvent(ev)}
                        className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-brand-500/40 cursor-pointer transition group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white group-hover:text-brand-300 transition line-clamp-1">
                            {ev.title}
                          </h4>
                          <span className="shrink-0 p-1 rounded bg-slate-900">
                            {getFormatIcon(ev.format)}
                          </span>
                        </div>

                        {ev.applicationId && (
                          <p className="text-[11px] text-brand-400 truncate mt-0.5">
                            {ev.applicationId.companyName}
                          </p>
                        )}

                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-2">
                          <CalendarIcon className="w-3 h-3 text-slate-500" />
                          <span>
                            {start.toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            })}
                            {' at '}
                            {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Interview Form Modal (Create / Edit) */}
      <InterviewFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialDate={formInitialDate}
        editEvent={formEditEvent}
        onSaved={() => {
          loadData();
        }}
      />

      {/* Interview Details Modal */}
      <InterviewDetailModal
        isOpen={!!detailModalEvent}
        onClose={() => setDetailModalEvent(null)}
        event={detailModalEvent}
        onEdit={(ev) => handleOpenEditModal(ev)}
        onDeleted={() => {
          setDetailModalEvent(null);
          loadData();
        }}
        onStatusUpdated={(updated) => {
          setDetailModalEvent(updated);
          loadData();
        }}
      />
    </div>
  );
}

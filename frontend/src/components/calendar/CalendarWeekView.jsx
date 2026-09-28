import React from 'react';
import { Video, Phone, Building2, Calendar, Plus, Clock } from 'lucide-react';

export default function CalendarWeekView({
  currentDate,
  events,
  onSelectEvent,
  onAddEventOnDate
}) {
  // Determine start of the week (Sunday)
  const current = new Date(currentDate);
  const dayOfWeek = current.getDay(); // 0 is Sunday
  const startOfWeek = new Date(current);
  startOfWeek.setDate(current.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  // Generate 7 days of the week
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const today = new Date();
  const isToday = (d) =>
    today.getDate() === d.getDate() &&
    today.getMonth() === d.getMonth() &&
    today.getFullYear() === d.getFullYear();

  // Hours to show (e.g. 8 AM to 9 PM)
  const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 to 21:00

  const getFormatIcon = (fmt) => {
    switch (fmt) {
      case 'video':
        return <Video className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
      case 'phone':
        return <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'onsite':
        return <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      default:
        return <Calendar className="w-3.5 h-3.5 text-brand-400 shrink-0" />;
    }
  };

  const getStatusClasses = (status) => {
    switch (status) {
      case 'completed':
        return 'border-emerald-500/80 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25';
      case 'cancelled':
        return 'border-rose-500/80 bg-rose-500/15 text-rose-300 line-through opacity-70 hover:bg-rose-500/25';
      default:
        return 'border-brand-500/80 bg-brand-500/15 text-brand-200 hover:bg-brand-500/25';
    }
  };

  // Find events for each day
  const getEventsForDayAndHour = (day, hour) => {
    return events.filter((ev) => {
      const evDate = new Date(ev.startAt);
      const isSameDay =
        evDate.getFullYear() === day.getFullYear() &&
        evDate.getMonth() === day.getMonth() &&
        evDate.getDate() === day.getDate();
      return isSameDay && evDate.getHours() === hour;
    });
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl text-left flex flex-col">
      {/* Week Header */}
      <div className="grid grid-cols-8 border-b border-slate-800 bg-slate-950/70 text-center py-3 text-xs font-semibold text-slate-400 sticky top-0 z-10">
        <div className="flex items-center justify-center text-slate-500 font-mono text-[11px]">
          Time
        </div>
        {weekDays.map((day, idx) => {
          const isCurr = isToday(day);
          return (
            <div key={idx} className="flex flex-col items-center">
              <span className="uppercase tracking-wider text-[11px] text-slate-400">
                {day.toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
              <span
                className={`mt-1 text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition ${
                  isCurr
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                    : 'text-slate-200'
                }`}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Hourly Scrollable Grid */}
      <div className="overflow-y-auto max-h-[620px] divide-y divide-slate-800/60">
        {hours.map((hour) => {
          const hourLabel = `${hour === 12 ? 12 : hour % 12}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
          return (
            <div key={hour} className="grid grid-cols-8 min-h-[70px]">
              {/* Hour Label */}
              <div className="border-r border-slate-800/60 p-2 text-right text-[11px] font-mono text-slate-500 select-none">
                {hourLabel}
              </div>

              {/* 7 Day slots */}
              {weekDays.map((day, dayIdx) => {
                const slotEvents = getEventsForDayAndHour(day, hour);
                const slotDate = new Date(day);
                slotDate.setHours(hour, 0, 0, 0);

                return (
                  <div
                    key={dayIdx}
                    onClick={() => onAddEventOnDate(slotDate)}
                    className="border-r border-slate-800/40 p-1.5 transition hover:bg-slate-800/30 cursor-pointer relative group flex flex-col justify-start space-y-1.5"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddEventOnDate(slotDate);
                      }}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition z-10"
                      title={`Schedule at ${hourLabel}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>

                    {slotEvents.map((ev) => (
                      <div
                        key={ev._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        className={`border-l-2 p-1.5 rounded-lg text-xs shadow-sm cursor-pointer transition ${getStatusClasses(
                          ev.status
                        )}`}
                      >
                        <div className="flex items-center space-x-1.5 font-semibold leading-tight">
                          {getFormatIcon(ev.format)}
                          <span className="truncate">{ev.title}</span>
                        </div>
                        {ev.roundLabel && (
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {ev.roundLabel}
                          </div>
                        )}
                        <div className="flex items-center space-x-1 text-[10px] text-slate-400 mt-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>
                            {new Date(ev.startAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            {' - '}
                            {new Date(ev.endAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

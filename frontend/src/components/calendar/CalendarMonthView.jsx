import React from 'react';
import { Video, Phone, Building2, Calendar, Plus } from 'lucide-react';

export default function CalendarMonthView({
  currentDate,
  events,
  onSelectEvent,
  onAddEventOnDate
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of month & days in month
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;

  const today = new Date();
  const isToday = (d, m, y) =>
    today.getDate() === d && today.getMonth() === m && today.getFullYear() === y;

  // Map events to date strings (YYYY-MM-DD)
  const eventsByDate = {};
  events.forEach((ev) => {
    const d = new Date(ev.startAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(ev);
  });

  const getFormatIcon = (fmt) => {
    switch (fmt) {
      case 'video':
        return <Video className="w-3 h-3 text-sky-400" />;
      case 'phone':
        return <Phone className="w-3 h-3 text-emerald-400" />;
      case 'onsite':
        return <Building2 className="w-3 h-3 text-amber-400" />;
      default:
        return <Calendar className="w-3 h-3 text-brand-400" />;
    }
  };

  const getStatusBorder = (status) => {
    switch (status) {
      case 'completed':
        return 'border-l-2 border-emerald-500 bg-emerald-500/10 text-emerald-300';
      case 'cancelled':
        return 'border-l-2 border-rose-500 bg-rose-500/10 text-rose-300 line-through opacity-70';
      default:
        return 'border-l-2 border-brand-500 bg-brand-500/10 text-brand-300';
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl text-left">
      {/* Day Headers (Sun - Sat) */}
      <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/60 text-center py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Grid Cells */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/60">
        {Array.from({ length: totalCells }).map((_, index) => {
          let dayNumber;
          let cellMonth = month;
          let cellYear = year;
          let isCurrentMonth = true;

          if (index < firstDayIndex) {
            // Previous month
            dayNumber = daysInPrevMonth - firstDayIndex + index + 1;
            cellMonth = month - 1;
            isCurrentMonth = false;
          } else if (index >= firstDayIndex + daysInMonth) {
            // Next month
            dayNumber = index - (firstDayIndex + daysInMonth) + 1;
            cellMonth = month + 1;
            isCurrentMonth = false;
          } else {
            // Current month
            dayNumber = index - firstDayIndex + 1;
          }

          const cellDate = new Date(cellYear, cellMonth, dayNumber);
          const dateKey = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(
            2,
            '0'
          )}-${String(cellDate.getDate()).padStart(2, '0')}`;
          const dayEvents = eventsByDate[dateKey] || [];
          const isCurrentDay = isToday(dayNumber, cellMonth, cellYear);

          return (
            <div
              key={index}
              onClick={() => onAddEventOnDate(cellDate)}
              className={`min-h-[110px] p-2 transition group relative flex flex-col justify-between cursor-pointer ${
                isCurrentMonth ? 'bg-slate-900/40 hover:bg-slate-800/40' : 'bg-slate-950/40 text-slate-600'
              }`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition ${
                    isCurrentDay
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                      : isCurrentMonth
                      ? 'text-slate-300'
                      : 'text-slate-600'
                  }`}
                >
                  {dayNumber}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddEventOnDate(cellDate);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition"
                  title="Schedule event on this date"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Event Pills */}
              <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px] scrollbar-none">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev._id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(ev);
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-medium truncate flex items-center space-x-1.5 cursor-pointer hover:brightness-125 transition ${getStatusBorder(
                      ev.status
                    )}`}
                    title={`${ev.title} (${new Date(ev.startAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })})`}
                  >
                    {getFormatIcon(ev.format)}
                    <span className="truncate">{ev.title}</span>
                  </div>
                ))}

                {dayEvents.length > 3 && (
                  <div className="text-[9px] text-slate-500 font-semibold px-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

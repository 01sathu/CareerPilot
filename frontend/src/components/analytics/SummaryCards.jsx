import React from 'react';
import { 
  Briefcase, 
  Clock, 
  MessageSquare, 
  Award, 
  XCircle,
  HelpCircle
} from 'lucide-react';

/**
 * Metric Summary Cards Component (FR-080, FR-081)
 * Displays overview counts: total, active pipeline, interviews, offers, and rejections
 */
export default function SummaryCards({ counts }) {
  const { total = 0, active = 0, byStatus = {} } = counts || {};

  const cards = [
    {
      id: 'total',
      label: 'Total Applications',
      value: total,
      subtext: 'All tracked roles',
      icon: Briefcase,
      colorClasses: 'from-blue-600/20 to-sky-500/20 text-blue-400 border-blue-500/30'
    },
    {
      id: 'active',
      label: 'Active Pipeline',
      value: active,
      subtext: 'Applied, assessment & interview',
      icon: Clock,
      colorClasses: 'from-amber-600/20 to-yellow-500/20 text-amber-400 border-amber-500/30'
    },
    {
      id: 'interviews',
      label: 'Interviews',
      value: byStatus.interview || 0,
      subtext: 'Currently interviewing',
      icon: MessageSquare,
      colorClasses: 'from-purple-600/20 to-indigo-500/20 text-purple-400 border-purple-500/30'
    },
    {
      id: 'offers',
      label: 'Offers',
      value: byStatus.offer || 0,
      subtext: 'Job offers received',
      icon: Award,
      colorClasses: 'from-emerald-600/20 to-teal-500/20 text-emerald-400 border-emerald-500/30'
    },
    {
      id: 'rejections',
      label: 'Rejections',
      value: byStatus.rejected || 0,
      subtext: 'Not selected',
      icon: XCircle,
      colorClasses: 'from-rose-600/20 to-red-500/20 text-rose-400 border-rose-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur flex flex-col justify-between hover:border-slate-600/80 transition group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400">
                {card.label}
              </span>
              <div
                className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${card.colorClasses} border flex items-center justify-center`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {card.value}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                {card.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

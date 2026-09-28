import React from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, Calendar, Send } from 'lucide-react';

/**
 * Career Progress Summary Component (FR-085)
 * Non-AI deterministic insights and action items computed from user's application data
 */
export default function ProgressSummary({ progressSummary }) {
  const {
    appliedLast30Days = 0,
    followUpsDue = 0,
    upcomingFollowUpsNext7Days = 0,
    activeApplications = 0,
    statements = []
  } = progressSummary || {};

  return (
    <div className="bg-gradient-to-r from-slate-800/80 via-slate-800/60 to-slate-900/80 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-700/60">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Progress & Action Insights
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic progress summary based on recent activity (FR-085)
            </p>
          </div>
        </div>

        {/* Highlight Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
            <Send className="w-3.5 h-3.5" />
            <span>{appliedLast30Days} sent in 30d</span>
          </div>

          {followUpsDue > 0 ? (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{followUpsDue} follow-up{followUpsDue > 1 ? 's' : ''} due</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Follow-ups clear</span>
            </div>
          )}
        </div>
      </div>

      {/* Deterministic Statements */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {statements.map((statement, idx) => (
          <div
            key={idx}
            className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-slate-300"
          >
            <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
            <p className="leading-relaxed font-medium">{statement}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

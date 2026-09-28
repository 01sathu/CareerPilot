import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Briefcase, TrendingUp, BarChart3 } from 'lucide-react';

/**
 * Empty Analytics State Component (FR-087, AC-E-04)
 * Displayed when user has 0 applications, prompting them to add their first application
 */
export default function EmptyAnalyticsState() {
  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-8 shadow-xl backdrop-blur">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600/30 to-sky-400/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-6 shadow-inner text-brand-400">
        <BarChart3 className="w-8 h-8" />
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
        No Job Applications Tracked Yet
      </h2>

      <p className="text-sm text-slate-300 mt-3 max-w-md mx-auto leading-relaxed">
        Your career analytics dashboard will come alive once you begin tracking your job search. Monitor active pipelines, weekly volume trends, and interview conversion funnels.
      </p>

      {/* Feature teaser pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-8 text-left">
        <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3.5">
          <div className="flex items-center space-x-2 text-brand-400 text-xs font-semibold mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Volume Trends</span>
          </div>
          <p className="text-[12px] text-slate-400">
            Track 12-week and 12-month application activity.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3.5">
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold mb-1">
            <Briefcase className="w-4 h-4" />
            <span>Pipeline Tracking</span>
          </div>
          <p className="text-[12px] text-slate-400">
            Monitor wishlist, applied, assessment, interview, and offer stages.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3.5">
          <div className="flex items-center space-x-2 text-purple-400 text-xs font-semibold mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Conversion Funnels</span>
          </div>
          <p className="text-[12px] text-slate-400">
            Understand your applied-to-interview and interview-to-offer rates.
          </p>
        </div>
      </div>

      <Link
        to="/applications?action=new"
        className="inline-flex items-center space-x-2 bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-lg shadow-brand-500/25 transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900"
      >
        <PlusCircle className="w-4 h-4" />
        <span>Add Your First Application</span>
      </Link>
    </div>
  );
}

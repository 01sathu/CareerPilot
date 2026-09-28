import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../../components/layout/Navbar';
import { useAuth } from '../../hooks/useAuth';
import analyticsService from '../../services/analytics.service';
import calendarService from '../../services/calendar.service';
import SummaryCards from '../../components/analytics/SummaryCards';
import TrendChart from '../../components/analytics/TrendChart';
import StatusDistributionChart from '../../components/analytics/StatusDistributionChart';
import ConversionFunnel from '../../components/analytics/ConversionFunnel';
import ProgressSummary from '../../components/analytics/ProgressSummary';
import EmptyAnalyticsState from '../../components/analytics/EmptyAnalyticsState';
import { 
  CheckCircle2, 
  BarChart3, 
  RefreshCw, 
  AlertCircle, 
  ArrowRight,
  Plus,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [analyticsData, upcomingData] = await Promise.all([
        analyticsService.getOverview(),
        calendarService.getUpcomingInterviews().catch(() => [])
      ]);
      setAnalytics(analyticsData);
      setUpcomingInterviews(Array.isArray(upcomingData) ? upcomingData : (upcomingData?.interviews || []));
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to load analytics data.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const totalApplications = analytics?.counts?.total || 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-brand-900/60 via-slate-800/80 to-slate-800/60 border border-slate-700/80 rounded-2xl p-6 sm:p-8 mb-8 shadow-2xl backdrop-blur relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 mb-3">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Phase 6 Calendar & Notifications Active</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-xl leading-relaxed">
                {user?.headline || 'Monitor your job application pipelines, interview rates, and search activity.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  to="/applications"
                  className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg shadow-brand-500/25 transition"
                >
                  <span>Open Job Tracker</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/calendar"
                  className="inline-flex items-center space-x-1 text-xs text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3.5 py-2 rounded-xl border border-slate-700 transition"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Interview Calendar</span>
                </Link>
                <Link
                  to="/applications?action=new"
                  className="inline-flex items-center space-x-1 text-xs text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3.5 py-2 rounded-xl border border-slate-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Application</span>
                </Link>
              </div>
            </div>

            <div className="flex sm:flex-col items-start sm:items-end justify-between border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-700/60 text-xs">
              <span className="text-slate-400 capitalize">
                Level: <span className="font-semibold text-white">{user?.experienceLevel || 'Fresher'}</span>
              </span>
              <span className="text-slate-400 font-mono mt-1">
                Timezone: <span className="text-slate-200">{analytics?.timezone || user?.timezone || 'UTC'}</span>
              </span>
              <button
                type="button"
                onClick={fetchAnalytics}
                disabled={loading}
                className="inline-flex items-center space-x-1 mt-3 text-xs text-brand-400 hover:text-brand-300 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Metrics</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && !analytics && (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-28 bg-slate-800/60 rounded-2xl border border-slate-700/50" />
              ))}
            </div>
            <div className="h-24 bg-slate-800/60 rounded-2xl border border-slate-700/50" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80 bg-slate-800/60 rounded-2xl border border-slate-700/50" />
              <div className="h-80 bg-slate-800/60 rounded-2xl border border-slate-700/50" />
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-rose-900/20 border border-rose-500/40 rounded-2xl p-6 text-center my-6">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-rose-200">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="mt-4 px-4 py-2 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-200 text-xs font-semibold rounded-xl transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Upcoming Interviews Banner (FR-094) */}
        {upcomingInterviews.length > 0 && (
          <div className="bg-gradient-to-r from-sky-950/60 via-slate-900 to-slate-900 border border-sky-500/30 rounded-2xl p-4 sm:p-5 mb-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    Upcoming Interview
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 font-mono">
                    {upcomingInterviews.length} scheduled
                  </span>
                </div>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {upcomingInterviews[0].title}{' '}
                  {upcomingInterviews[0].applicationId && (
                    <span className="text-slate-400 font-normal">
                      at {upcomingInterviews[0].applicationId.companyName}
                    </span>
                  )}
                  <span className="text-sky-300 font-mono text-xs ml-2">
                    ({new Date(upcomingInterviews[0].startAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {new Date(upcomingInterviews[0].startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </span>
                </p>
              </div>
            </div>
            <Link
              to="/calendar"
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 transition flex items-center space-x-1.5 self-start sm:self-center shrink-0"
            >
              <span>Open Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Analytics Content */}
        {!loading && analytics && (
          <>
            {totalApplications === 0 ? (
              /* FR-087: Empty state when user has 0 applications */
              <EmptyAnalyticsState />
            ) : (
              <div>
                {/* 1. Metric Summary Cards (FR-080, FR-081) */}
                <SummaryCards counts={analytics.counts} />

                {/* 2. Deterministic Career Progress Summary (FR-085) */}
                <ProgressSummary progressSummary={analytics.progressSummary} />

                {/* 3. Trend & Status Charts Grid (FR-083, FR-084) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                  {/* Left Column: Trend Chart (8 cols on lg) */}
                  <div className="lg:col-span-7">
                    <TrendChart
                      trends={analytics.trends}
                      timezone={analytics.timezone}
                    />
                  </div>

                  {/* Right Column: Status Distribution (5 cols on lg) */}
                  <div className="lg:col-span-5">
                    <StatusDistributionChart counts={analytics.counts} />
                  </div>
                </div>

                {/* 4. Conversion Funnel (FR-082, FR-088) */}
                <div className="mb-8">
                  <ConversionFunnel
                    conversionRates={analytics.conversionRates}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

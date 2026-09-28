import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Calendar, Table, BarChart2 } from 'lucide-react';

/**
 * Custom Recharts Tooltip for Dark Theme
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
        <p className="font-semibold text-white">{label}</p>
        <p className="text-brand-400 mt-1">
          <span className="font-medium">Applications: </span>
          <span className="font-bold">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

/**
 * Application Volume Trend Chart Component (FR-083, FR-084, FR-086, AC-E-03, AC-E-05)
 */
export default function TrendChart({ trends, timezone }) {
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' | 'monthly' | 'daily'
  const [showTable, setShowTable] = useState(false);

  const dataMap = {
    weekly: trends?.weekly || [],
    monthly: trends?.monthly || [],
    daily: trends?.daily30d || []
  };

  const currentData = dataMap[viewMode] || [];

  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur flex flex-col justify-between">
      {/* Header with Title and Mode Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-brand-400" />
            <span>Application Volume Trends</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Bucketed in your timezone ({timezone || 'UTC'})
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Range Selection Toggle (FR-086) */}
          <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-700/60 flex items-center text-xs">
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                viewMode === 'weekly'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              aria-pressed={viewMode === 'weekly'}
            >
              12 Weeks
            </button>
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                viewMode === 'monthly'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              aria-pressed={viewMode === 'monthly'}
            >
              12 Months
            </button>
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                viewMode === 'daily'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              aria-pressed={viewMode === 'daily'}
            >
              30 Days
            </button>
          </div>

          {/* Accessible Table View Toggle (FR-084, AC-E-05) */}
          <button
            type="button"
            onClick={() => setShowTable(!showTable)}
            className="p-2 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={showTable ? 'Switch to Chart' : 'Switch to Accessible Table'}
            aria-label={showTable ? 'Switch to Chart view' : 'Switch to Table view'}
          >
            {showTable ? <BarChart2 className="w-4 h-4" /> : <Table className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Chart View or Accessible Table Alternative */}
      {showTable ? (
        <div className="overflow-x-auto my-2 border border-slate-700/60 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <caption className="sr-only">
              Application volume trends table for {viewMode} range
            </caption>
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700/60">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Period / Timeframe
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">
                  Applications Submitted
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {currentData.map((row) => (
                <tr key={row.period} className="hover:bg-slate-800/40">
                  <td className="px-4 py-2.5 font-medium text-white">{row.label}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-brand-400">
                    {row.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-64 sm:h-72 w-full mt-2">
          {/* Accessible off-screen table for screen readers (WCAG 2.1 AA) */}
          <div className="sr-only">
            <table>
              <caption>Application volume trends: {viewMode}</caption>
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">Applications</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((row) => (
                  <tr key={`sr-${row.period}`}>
                    <td>{row.label}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={currentData}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis
                dataKey="label"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
                interval={viewMode === 'daily' ? 4 : 0}
                angle={viewMode === 'monthly' ? -25 : 0}
                textAnchor={viewMode === 'monthly' ? 'end' : 'middle'}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="count"
                fill="#0284c7"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import { PieChart as PieIcon, Table, BarChart2 } from 'lucide-react';

const STATUS_CONFIG = {
  wishlist: { label: 'Wishlist', color: '#64748b' },
  applied: { label: 'Applied', color: '#0284c7' },
  assessment: { label: 'Assessment', color: '#d97706' },
  interview: { label: 'Interview', color: '#9333ea' },
  offer: { label: 'Offer', color: '#10b981' },
  rejected: { label: 'Rejected', color: '#f43f5e' }
};

/**
 * Custom Tooltip for Status Pie Chart
 */
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
        <p className="font-semibold text-white">{data.name}</p>
        <p className="text-slate-300 mt-1">
          <span className="font-medium">Applications: </span>
          <span className="font-bold text-white">{data.value}</span>
        </p>
      </div>
    );
  }
  return null;
};

/**
 * Status Distribution Chart Component (FR-080, FR-084, AC-E-05)
 */
export default function StatusDistributionChart({ counts }) {
  const [showTable, setShowTable] = useState(false);
  const byStatus = counts?.byStatus || {};

  const chartData = Object.entries(byStatus)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: STATUS_CONFIG[status]?.label || status,
      value: count,
      color: STATUS_CONFIG[status]?.color || '#94a3b8',
      rawStatus: status
    }));

  const total = counts?.total || 0;

  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
            <PieIcon className="w-4 h-4 text-purple-400" />
            <span>Pipeline Distribution</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Current status of all {total} tracked applications
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="p-2 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title={showTable ? 'Switch to Donut Chart' : 'Switch to Accessible Table'}
          aria-label={showTable ? 'Switch to Donut Chart' : 'Switch to Accessible Table'}
        >
          {showTable ? <BarChart2 className="w-4 h-4" /> : <Table className="w-4 h-4" />}
        </button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto my-2 border border-slate-700/60 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <caption className="sr-only">
              Current status distribution of job applications
            </caption>
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700/60">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">
                  Count
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-right">
                  Share
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {Object.entries(byStatus).map(([status, count]) => {
                const share = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                return (
                  <tr key={status} className="hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-medium text-white flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: STATUS_CONFIG[status]?.color }}
                      />
                      <span>{STATUS_CONFIG[status]?.label || status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-white">
                      {count}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-400">
                      {share}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-60 flex items-center justify-center text-xs text-slate-500">
          No application status data available
        </div>
      ) : (
        <div className="h-60 sm:h-64 w-full relative">
          {/* Accessible off-screen table */}
          <div className="sr-only">
            <table>
              <caption>Status distribution</caption>
              <thead>
                <tr>
                  <th scope="col">Status</th>
                  <th scope="col">Count</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((d) => (
                  <tr key={`sr-pie-${d.rawStatus}`}>
                    <td>{d.name}</td>
                    <td>{d.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#1e293b" />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                formatter={(val) => (
                  <span className="text-xs text-slate-300 font-medium">{val}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { GitCommit, ArrowRight, Info, Award, MessageSquare, CheckCircle2 } from 'lucide-react';

/**
 * Historical Conversion Funnel Component (FR-082, FR-088, AC-E-02)
 * Displays stages computed from ApplicationHistory with percentage and counts ("3 of 12")
 */
export default function ConversionFunnel({ conversionRates }) {
  const { appliedToInterview, interviewToOffer, overallOfferRate } = conversionRates || {};

  const funnelStages = [
    {
      id: 'appliedToInterview',
      title: 'Applied → Interview',
      description: 'Applications that advanced to the interview stage',
      icon: MessageSquare,
      color: 'from-blue-600 to-indigo-500',
      barColor: 'bg-blue-500',
      data: appliedToInterview
    },
    {
      id: 'interviewToOffer',
      title: 'Interview → Offer',
      description: 'Interviews that resulted in an official offer',
      icon: Award,
      color: 'from-purple-600 to-pink-500',
      barColor: 'bg-purple-500',
      data: interviewToOffer
    },
    {
      id: 'overallOfferRate',
      title: 'Overall Offer Rate',
      description: 'Total offers received relative to total applications submitted',
      icon: CheckCircle2,
      color: 'from-emerald-600 to-teal-500',
      barColor: 'bg-emerald-500',
      data: overallOfferRate
    }
  ];

  return (
    <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-brand-400 mb-1">
          <GitCommit className="w-4 h-4" />
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Conversion Funnel & Rates
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Derived from immutable status history records (FR-045, FR-082)
        </p>
      </div>

      {/* Funnel Stage Cards */}
      <div className="space-y-4 my-5">
        {funnelStages.map((stage) => {
          const Icon = stage.icon;
          const { rate, percentage, numerator = 0, denominator = 0 } = stage.data || {};
          const isZeroDenominator = rate === null || denominator === 0;

          return (
            <div
              key={stage.id}
              className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 transition hover:border-slate-600"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${stage.color} flex items-center justify-center text-white shadow-sm`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-white">
                      {stage.title}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {stage.description}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base sm:text-lg font-extrabold text-white">
                    {isZeroDenominator ? (
                      <span className="text-slate-500 font-mono">—</span>
                    ) : (
                      `${percentage}%`
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {/* Display raw count: "3 of 12" (FR-088) */}
                    <span className="font-semibold text-slate-200">{numerator}</span> of{' '}
                    <span>{denominator}</span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-3 border border-slate-700/60">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${stage.barColor}`}
                  style={{
                    width: isZeroDenominator ? '0%' : `${Math.min(percentage, 100)}%`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Mandatory Disclaimer (FR-088) */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 flex items-start space-x-2.5 text-[11px] text-slate-400 leading-relaxed">
        <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold text-slate-300">Personal statistics: </span>
          Rates reflect your own tracked application history and sample sizes. They do not represent industry benchmarks or hiring outcome predictions.
        </p>
      </div>
    </div>
  );
}

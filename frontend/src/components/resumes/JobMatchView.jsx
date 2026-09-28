import React from 'react';
import { 
  Target, 
  Award, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Info, 
  Lightbulb, 
  Building2,
  FileCheck
} from 'lucide-react';

/**
 * Job Match Analysis View Component (FR-056, FR-057, FR-058)
 */
export default function JobMatchView({ analysis }) {
  const data = analysis?.jobMatch || {};
  const {
    overallScore = 0,
    componentScores = {},
    matchedSkills = [],
    missingSkills = [],
    improvementSuggestions = []
  } = data;

  const {
    skills = { score: 0, rationale: '' },
    experience = { score: 0, rationale: '' },
    education = { score: 0, rationale: '' },
    keywords = { score: 0, rationale: '' }
  } = componentScores;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 60) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  const getBarColor = (score) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-6 text-left">
      {/* Target Application / Job Banner */}
      {(analysis.companyName || analysis.jobTitle) && (
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Target Role</p>
              <h3 className="text-sm font-bold text-white">
                {analysis.jobTitle || 'Custom Role'}{' '}
                {analysis.companyName ? `at ${analysis.companyName}` : ''}
              </h3>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {new Date(analysis.createdAt).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Top Banner: Overall Score & Mandatory Notice (FR-057) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800/90 to-purple-950/40 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            {/* Score Ring */}
            <div
              className={`w-20 h-20 rounded-2xl border-2 flex flex-col items-center justify-center shadow-inner ${getScoreColor(
                overallScore
              )}`}
            >
              <span className="text-3xl font-black font-mono tracking-tight">
                {overallScore}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider -mt-1">
                / 100
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  Job Match Score
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                  AI Alignment
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-md">
                Estimated overall alignment between your resume and the target requirements.
              </p>
            </div>
          </div>
        </div>

        {/* Mandatory Disclaimer (FR-057) */}
        <div className="mt-5 p-3.5 bg-slate-900/80 border border-slate-700/80 rounded-xl flex items-start space-x-2.5 text-xs text-slate-400 leading-relaxed">
          <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold text-slate-200">Notice (FR-057): </span>
            Scores and evaluations are AI-generated automated estimates. They are not objectively accurate measurements and do not predict hiring outcomes or employer interview decisions.
          </p>
        </div>
      </div>

      {/* Component Scores Breakdown (FR-056, FR-057) */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
          <Award className="w-4 h-4 text-brand-400" />
          <span>Component Alignment Breakdown</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { id: 'skills', title: 'Skills Alignment', data: skills },
            { id: 'experience', title: 'Experience Level', data: experience },
            { id: 'education', title: 'Education & Credentials', data: education },
            { id: 'keywords', title: 'Industry Keywords', data: keywords }
          ].map((comp) => (
            <div
              key={comp.id}
              className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-white">{comp.title}</h4>
                  <span className="text-xs font-mono font-bold text-brand-400">
                    {comp.data?.score || 0} / 100
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-3 border border-slate-700/50">
                  <div
                    className={`h-full rounded-full ${getBarColor(comp.data?.score || 0)}`}
                    style={{ width: `${comp.data?.score || 0}%` }}
                  />
                </div>

                {/* Specific Rationale (FR-057) */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {comp.data?.rationale || 'Alignment evaluated against job requirements.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Matched & Missing Skills Grid (FR-056) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Matched Skills */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Matched Skills ({matchedSkills.length})</span>
          </h3>

          <div className="flex flex-wrap gap-1.5">
            {matchedSkills.length > 0 ? (
              matchedSkills.map((sk, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium"
                >
                  ✓ {sk}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500 italic">No direct skill matches detected</span>
            )}
          </div>
        </div>

        {/* Missing Skills */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
          <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-3 flex items-center space-x-2">
            <XCircle className="w-4 h-4" />
            <span>Missing / Target Skills ({missingSkills.length})</span>
          </h3>

          <div className="flex flex-wrap gap-2">
            {missingSkills.length > 0 ? (
              missingSkills.map((item, idx) => {
                const isRequired = item.category === 'required';
                return (
                  <span
                    key={idx}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium inline-flex items-center space-x-1.5 ${
                      isRequired
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <span>{item.skill}</span>
                    <span
                      className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                        isRequired
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {item.category}
                    </span>
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-slate-500 italic">All target skills detected</span>
            )}
          </div>
        </div>
      </div>

      {/* Prioritized Improvement Suggestions (FR-058) */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>Prioritized Improvement Suggestions ({improvementSuggestions.length})</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            3–10 targeted recommendations (FR-058)
          </span>
        </div>

        <div className="space-y-3">
          {improvementSuggestions.map((sug, idx) => (
            <div
              key={idx}
              className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3.5 flex items-start space-x-3.5 hover:border-slate-600 transition"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 font-mono">
                {sug.priority || idx + 1}
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {sug.text}
                </p>
                {sug.type && (
                  <span className="inline-block mt-1.5 text-[10px] uppercase font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                    Type: {sug.type}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

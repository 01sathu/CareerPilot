import React from 'react';
import { 
  Sparkles, 
  Clock, 
  GraduationCap, 
  Briefcase, 
  CheckCircle2, 
  AlertTriangle, 
  Layers,
  Wrench,
  Users
} from 'lucide-react';

/**
 * General Resume Analysis View Component (FR-054)
 */
export default function GeneralAnalysisView({ analysis }) {
  const data = analysis?.general || {};
  const {
    categorizedSkills = {},
    education = [],
    experienceSummary = [],
    estimatedYearsExperience = 0,
    structureFeedback = {}
  } = data;

  const { technical = [], tools = [], soft = [] } = categorizedSkills;
  const { strengths = [], improvements = [], formattingNotes = '' } = structureFeedback;

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner: Estimated Experience */}
      <div className="bg-gradient-to-r from-brand-900/50 via-slate-800/80 to-slate-800/50 border border-brand-500/30 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl sm:text-2xl font-black text-white font-mono">
                ~{estimatedYearsExperience} Years
              </span>
              {/* Labeled as estimate (FR-054) */}
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                AI Estimated
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Derived from stated role durations in resume text.
            </p>
          </div>
        </div>
      </div>

      {/* Categorized Skills (FR-054) */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-brand-400" />
          <span>Categorized Skills</span>
        </h3>

        <div className="space-y-4">
          {/* Technical Skills */}
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-sky-400 mb-2">
              <span>Technical Skills</span>
              <span className="text-[10px] text-slate-500">({technical.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {technical.length > 0 ? (
                technical.map((sk, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/20 text-xs font-medium"
                  >
                    {sk}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">None detected</span>
              )}
            </div>
          </div>

          {/* Tools & Platforms */}
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 mb-2">
              <Wrench className="w-3.5 h-3.5" />
              <span>Tools &amp; Platforms</span>
              <span className="text-[10px] text-slate-500">({tools.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tools.length > 0 ? (
                tools.map((tl, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium"
                  >
                    {tl}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">None detected</span>
              )}
            </div>
          </div>

          {/* Soft Skills */}
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-purple-400 mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>Soft Skills</span>
              <span className="text-[10px] text-slate-500">({soft.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {soft.length > 0 ? (
                soft.map((sf, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-medium"
                  >
                    {sf}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">None detected</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Experience Timeline Summary (FR-054) */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
          <Briefcase className="w-4 h-4 text-amber-400" />
          <span>Professional Experience Timeline</span>
        </h3>

        {experienceSummary.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No experience entries parsed</p>
        ) : (
          <div className="space-y-3.5">
            {experienceSummary.map((exp, idx) => (
              <div
                key={idx}
                className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3.5 hover:border-slate-600 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <h4 className="font-bold text-xs text-white">
                    {exp.role} <span className="text-slate-400 font-normal">at</span> {exp.organization}
                  </h4>
                  <span className="text-[11px] font-mono text-brand-400">
                    {exp.duration}
                  </span>
                </div>
                {exp.description && (
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Education Entries (FR-054) */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
          <GraduationCap className="w-4 h-4 text-emerald-400" />
          <span>Education</span>
        </h3>

        {education.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No education entries parsed</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {education.map((edu, idx) => (
              <div
                key={idx}
                className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3.5"
              >
                <h4 className="font-bold text-xs text-white">{edu.degree}</h4>
                <p className="text-xs text-slate-300 mt-0.5">{edu.institution}</p>
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  {edu.fieldOfStudy ? `${edu.fieldOfStudy} • ` : ''}
                  {edu.graduationYear || 'Completed'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Structural Feedback & Formatting */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Resume Structure &amp; Formatting Feedback</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          <div className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-3.5">
            <h4 className="text-xs font-semibold text-emerald-400 flex items-center space-x-1.5 mb-2.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Identified Strengths</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {strengths.map((str, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Improvements */}
          <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-3.5">
            <h4 className="text-xs font-semibold text-amber-400 flex items-center space-x-1.5 mb-2.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Areas for Improvement</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {improvements.map((imp, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {formattingNotes && (
          <div className="mt-4 p-3 bg-slate-900/40 border border-slate-700/60 rounded-xl text-xs text-slate-300">
            <span className="font-semibold text-white">Formatting Notes: </span>
            {formattingNotes}
          </div>
        )}
      </div>
    </div>
  );
}

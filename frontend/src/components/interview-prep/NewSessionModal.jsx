import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Briefcase,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Play
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import interviewSessionService from '../../services/interviewSession.service';
import { getApplications } from '../../services/application.service';
import resumeService from '../../services/resume.service';
import AiConsentModal from '../resumes/AiConsentModal';

export default function NewSessionModal({ isOpen, onClose, onCreated }) {
  const { user, updateUser } = useAuth();

  const [roleTitle, setRoleTitle] = useState('');
  const [experienceLevel, setExperienceLevel] = useState(user?.experienceLevel || 'mid');
  const [mode, setMode] = useState('practice'); // 'practice' | 'mock'
  const [questionTypes, setQuestionTypes] = useState(['technical', 'behavioral']);
  const [count, setCount] = useState(10);
  const [applicationId, setApplicationId] = useState('');
  const [resumeId, setResumeId] = useState('');

  const [applications, setApplications] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [loadingContext, setLoadingContext] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);

  // Initialize defaults and load user applications and resumes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setRoleTitle(user?.targetRoles?.[0] || '');
      setExperienceLevel(user?.experienceLevel || 'mid');
      setMode('practice');
      setQuestionTypes(['technical', 'behavioral']);
      setCount(10);
      setApplicationId('');
      setResumeId('');

      const fetchContext = async () => {
        setLoadingContext(true);
        try {
          const [appRes, resRes] = await Promise.all([
            getApplications({ limit: 50 }).catch(() => ({ data: [] })),
            resumeService.getResumes().catch(() => ({ data: { resumes: [] } }))
          ]);
          setApplications(appRes.data || []);
          setResumes(resRes.data?.resumes || []);
        } finally {
          setLoadingContext(false);
        }
      };

      fetchContext();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const toggleQuestionType = (t) => {
    if (questionTypes.includes(t)) {
      if (questionTypes.length > 1) {
        setQuestionTypes(questionTypes.filter((item) => item !== t));
      }
    } else {
      setQuestionTypes([...questionTypes, t]);
    }
  };

  const handleApplicationSelect = (e) => {
    const selectedAppId = e.target.value;
    setApplicationId(selectedAppId);
    if (selectedAppId) {
      const app = applications.find((a) => a._id === selectedAppId);
      if (app && app.jobTitle && !roleTitle) {
        setRoleTitle(app.jobTitle);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roleTitle.trim()) {
      setError('Please provide a target role title.');
      return;
    }

    if (questionTypes.length === 0) {
      setError('Please select at least one question type.');
      return;
    }

    // Check AI consent
    if (!user?.aiConsentAcceptedAt) {
      setIsConsentModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        roleTitle: roleTitle.trim(),
        experienceLevel,
        mode,
        questionTypes,
        count: Number(count),
        applicationId: applicationId || null,
        resumeId: resumeId || null
      };

      const session = await interviewSessionService.createSession(payload);
      if (onCreated) {
        onCreated(session);
      }
      onClose();
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.error?.code === 'AI_CONSENT_REQUIRED') {
        setIsConsentModalOpen(true);
      } else {
        setError(err.response?.data?.error?.message || 'Failed to generate interview questions.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
        <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative text-left max-h-[90vh] overflow-y-auto">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute right-5 top-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/25 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Prepare Interview Session
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate high-signal questions tailored by role, skills, and target job requirements.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Mode Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Session Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('practice')}
                  className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                    mode === 'practice'
                      ? 'border-brand-500 bg-brand-500/10 text-white shadow-md shadow-brand-500/10'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white">Practice Mode</span>
                    {mode === 'practice' && <CheckCircle2 className="w-4 h-4 text-brand-400" />}
                  </div>
                  <span className="text-[11px] leading-relaxed text-slate-400">
                    Self-paced exploratory practice. Unlock reference sample answers and on-demand AI ratings.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('mock')}
                  className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                    mode === 'mock'
                      ? 'border-brand-500 bg-brand-500/10 text-white shadow-md shadow-brand-500/10'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white">Mock Interview</span>
                    {mode === 'mock' && <CheckCircle2 className="w-4 h-4 text-brand-400" />}
                  </div>
                  <span className="text-[11px] leading-relaxed text-slate-400">
                    Simulate real-world conditions. One question at a time, skip, stopwatch, and final performance review.
                  </span>
                </button>
              </div>
            </div>

            {/* Role Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Target Role Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Senior Backend Engineer, Product Manager"
                maxLength={120}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>

            {/* Experience Level & Count Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Seniority Level
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none capitalize"
                >
                  <option value="fresher">Fresher (Entry Level)</option>
                  <option value="junior">Junior (1-2 years)</option>
                  <option value="mid">Mid-Level (3-5 years)</option>
                  <option value="senior">Senior (6-8 years)</option>
                  <option value="lead">Lead / Principal (8+ years)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Question Count ({count})
                </label>
                <input
                  type="range"
                  min={5}
                  max={15}
                  step={1}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full accent-brand-500 mt-2"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>5 (Quick)</span>
                  <span>10 (Standard)</span>
                  <span>15 (Comprehensive)</span>
                </div>
              </div>
            </div>

            {/* Question Categories */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Question Categories <span className="text-slate-500 font-normal lowercase">(at least one)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'technical', label: 'Technical & Architecture' },
                  { id: 'behavioral', label: 'Behavioral & Leadership' },
                  { id: 'hr', label: 'HR & Culture Fit' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleQuestionType(t.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition ${
                      questionTypes.includes(t.id)
                        ? 'border-brand-500 bg-brand-500/20 text-brand-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Tailoring: Job Application & Resume */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <Layers className="w-3.5 h-3.5 text-brand-400" />
                <span>Context Tailoring (Optional)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Link Target Application
                  </label>
                  <select
                    value={applicationId}
                    onChange={handleApplicationSelect}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="">No specific application</option>
                    {applications.map((app) => (
                      <option key={app._id} value={app._id}>
                        {app.companyName} — {app.jobTitle}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Link Candidate Resume
                  </label>
                  <select
                    value={resumeId}
                    onChange={(e) => setResumeId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="">No specific resume</option>
                    {resumes.map((res) => (
                      <option key={res._id} value={res._id}>
                        {res.originalFilename || 'Uploaded Resume'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !roleTitle.trim() || questionTypes.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white font-bold text-sm shadow-lg shadow-brand-500/25 transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating Tailored Questions with AI...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Generate & Start Session</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* AI Consent Modal fallback */}
      <AiConsentModal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        onConsentSuccess={(updatedUser) => {
          if (updateUser) updateUser(updatedUser);
          setIsConsentModalOpen(false);
        }}
      />
    </>
  );
}

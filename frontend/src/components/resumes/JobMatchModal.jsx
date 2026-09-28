import React, { useState, useEffect } from 'react';
import { Target, X, AlertCircle, RefreshCw, Briefcase, FileText, CheckCircle2 } from 'lucide-react';
import { getApplications } from '../../services/application.service';
import resumeService from '../../services/resume.service';

/**
 * Job Match Modal Component (FR-055)
 * Allows candidate to initiate match analysis against an existing application or pasted text
 */
export default function JobMatchModal({
  isOpen,
  onClose,
  resume,
  onMatchSuccess
}) {
  const [mode, setMode] = useState('application'); // 'application' | 'custom'
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [customJobDescription, setCustomJobDescription] = useState('');
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      // Fetch applications with job descriptions
      const fetchApps = async () => {
        setIsLoadingApps(true);
        try {
          const res = await getApplications({ limit: 100, sortBy: 'updatedAt', sortOrder: 'desc' });
          const appsWithJd = (res.data || []).filter(
            (app) => app.jobDescription && app.jobDescription.trim().length >= 50
          );
          setApplications(appsWithJd);
          if (appsWithJd.length > 0) {
            setSelectedAppId(appsWithJd[0]._id);
          } else {
            setMode('custom');
          }
        } catch {
          // If fails to load apps, fallback to custom text
          setMode('custom');
        } finally {
          setIsLoadingApps(false);
        }
      };
      fetchApps();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const payload = {};
    if (mode === 'application') {
      if (!selectedAppId) {
        setError('Please select an application to match against.');
        return;
      }
      payload.applicationId = selectedAppId;
    } else {
      const text = customJobDescription.trim();
      if (text.length < 50 || text.length > 10000) {
        setError('Job description text must be between 50 and 10,000 characters (FR-055).');
        return;
      }
      payload.jobDescription = text;
    }

    setIsSubmitting(true);
    try {
      const result = await resumeService.matchResume(resume._id, payload);
      if (onMatchSuccess) {
        onMatchSuccess(result.analysis);
      }
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to execute job match analysis'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 flex-shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Match Resume Against Job
            </h2>
            <p className="text-xs text-slate-400">
              Target role comparison for: <span className="text-white font-medium">{resume?.originalFilename}</span>
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 mb-5 text-xs">
          <button
            type="button"
            onClick={() => setMode('application')}
            disabled={applications.length === 0}
            className={`py-2 px-3 rounded-lg font-medium transition flex items-center justify-center space-x-1.5 ${
              mode === 'application'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Tracked Application ({applications.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`py-2 px-3 rounded-lg font-medium transition flex items-center justify-center space-x-1.5 ${
              mode === 'custom'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste Job Description</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'application' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Select Tracked Job Application
              </label>
              {isLoadingApps ? (
                <div className="p-3 bg-slate-800/60 rounded-xl text-xs text-slate-400 flex items-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                  <span>Loading applications...</span>
                </div>
              ) : applications.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No applications with a stored job description (&ge;50 characters) found. Please paste the job description directly instead.
                </p>
              ) : (
                <select
                  value={selectedAppId}
                  onChange={(e) => setSelectedAppId(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {applications.map((app) => (
                    <option key={app._id} value={app._id}>
                      {app.companyName} — {app.jobTitle}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Target Job Description Text
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  {customJobDescription.length} / 10,000
                </span>
              </div>
              <textarea
                rows={6}
                value={customJobDescription}
                onChange={(e) => setCustomJobDescription(e.target.value)}
                placeholder="Paste the target job description, requirements, or responsibilities here (minimum 50 characters)..."
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-500 leading-relaxed font-sans"
              />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white shadow-lg shadow-purple-500/25 transition disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating Alignment...</span>
                </>
              ) : (
                <>
                  <Target className="w-3.5 h-3.5" />
                  <span>Run Match Analysis</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

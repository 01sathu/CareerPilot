import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/layout/Navbar';
import NewSessionModal from '../../components/interview-prep/NewSessionModal';
import PracticeSessionView from '../../components/interview-prep/PracticeSessionView';
import MockInterviewView from '../../components/interview-prep/MockInterviewView';
import interviewSessionService from '../../services/interviewSession.service';
import {
  Sparkles,
  Plus,
  Play,
  RotateCcw,
  Trash2,
  Bookmark,
  Award,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  HelpCircle,
  BarChart3,
  Flame,
  ArrowRight
} from 'lucide-react';

export default function InterviewPrepPage() {
  const [sessions, setSessions] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'practice' | 'mock'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Session state
  const [activeSession, setActiveSession] = useState(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { limit: 20 };
      if (filterMode !== 'all') {
        params.mode = filterMode;
      }
      const data = await interviewSessionService.getSessions(params);
      setSessions(data.sessions || []);
      setMeta(data.meta || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load interview sessions');
    } finally {
      setIsLoading(false);
    }
  }, [filterMode]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleOpenSession = async (sessionSummary) => {
    try {
      setIsLoading(true);
      const fullSession = await interviewSessionService.getSession(sessionSummary._id);
      setActiveSession(fullSession);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to open interview session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this interview preparation session?')) {
      return;
    }

    try {
      setDeletingId(sessionId);
      await interviewSessionService.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
      if (activeSession?._id === sessionId) {
        setActiveSession(null);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete session');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSessionUpdated = (updatedSession) => {
    setActiveSession(updatedSession);
    setSessions((prev) =>
      prev.map((s) => (s._id === updatedSession._id ? { ...s, ...updatedSession } : s))
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Render Active Session if one is selected */}
        {activeSession ? (
          activeSession.mode === 'mock' ? (
            <MockInterviewView
              session={activeSession}
              onUpdateSession={handleSessionUpdated}
              onBack={() => {
                setActiveSession(null);
                fetchSessions();
              }}
              onSwitchToPractice={() => {
                setActiveSession({ ...activeSession, mode: 'practice' });
              }}
            />
          ) : (
            <PracticeSessionView
              session={activeSession}
              onUpdateSession={handleSessionUpdated}
              onBack={() => {
                setActiveSession(null);
                fetchSessions();
              }}
            />
          )
        ) : (
          /* Main Prep Hub View */
          <div className="space-y-8 text-left">
            {/* Hero Header */}
            <div className="bg-gradient-to-r from-brand-950/70 via-slate-900/90 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center space-x-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Phase 7 AI Interview Preparation Active</span>
                </div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">
                  AI Interview Preparation & Mock Sessions
                </h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Generate technical, behavioral, and HR questions calibrated to your role and
                  seniority. Practice answer structure, explore reference sample responses, and receive
                  instant feedback with 1–5 objective rating rubrics.
                </p>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(true)}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white font-bold text-sm shadow-xl shadow-brand-500/25 transition flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start New Session</span>
                </button>
              </div>
            </div>

            {/* Mode Quick Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                onClick={() => setIsNewModalOpen(true)}
                className="bg-slate-900/70 border border-slate-800 hover:border-brand-500/40 rounded-3xl p-6 shadow-xl cursor-pointer transition group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-300 font-semibold border border-brand-500/20">
                    Self-Paced
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition">
                  Practice Mode
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Draft responses with rich character counting, reveal expert sample answers, bookmark
                  difficult topics, and obtain structured AI evaluations on demand.
                </p>
              </div>

              <div
                onClick={() => setIsNewModalOpen(true)}
                className="bg-slate-900/70 border border-slate-800 hover:border-sky-500/40 rounded-3xl p-6 shadow-xl cursor-pointer transition group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-300 font-semibold border border-sky-500/20">
                    Simulation
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition">
                  Mock Interview Simulation
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Experience a step-by-step interview runner with an on-screen timer. Skip or answer,
                  pause anytime, and view a comprehensive performance review upon completion.
                </p>
              </div>
            </div>

            {/* Filter Tabs & History List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                    Session History
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                    {sessions.length}
                  </span>
                </div>

                <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                  {['all', 'practice', 'mock'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFilterMode(m)}
                      className={`px-3 py-1.5 rounded-lg capitalize font-medium transition ${
                        filterMode === m
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center h-64 bg-slate-900/40 rounded-3xl border border-slate-800">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm">Loading interview sessions...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm text-center">
                  {error}
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800 p-8 space-y-4">
                  <Briefcase className="w-12 h-12 text-slate-600 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-300">
                      No preparation sessions yet
                    </h3>
                    <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
                      Start your first tailored interview session to practice questions and evaluate
                      your responses with AI.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs transition inline-flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Session</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sessions.map((sess) => {
                    const dateStr = new Date(sess.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                    const isCompleted = sess.status === 'completed';

                    return (
                      <div
                        key={sess._id}
                        onClick={() => handleOpenSession(sess)}
                        className="bg-slate-900/80 border border-slate-800 hover:border-brand-500/50 rounded-2xl p-5 shadow-lg hover:shadow-brand-500/5 transition cursor-pointer flex flex-col justify-between space-y-4 group"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                                sess.mode === 'mock'
                                  ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                                  : 'bg-brand-500/10 text-brand-300 border-brand-500/20'
                              }`}
                            >
                              {sess.mode === 'mock' ? 'Mock Simulation' : 'Practice Mode'}
                            </span>

                            <div className="flex items-center space-x-2">
                              {isCompleted ? (
                                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                  Completed
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                  In Progress
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSession(e, sess._id)}
                                disabled={deletingId === sess._id}
                                className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                                title="Delete session"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <h3 className="text-base font-bold text-white group-hover:text-brand-300 transition">
                            {sess.roleTitle}
                          </h3>

                          {sess.applicationId && (
                            <p className="text-xs text-brand-400 font-medium">
                              {sess.applicationId.companyName}{' '}
                              {sess.applicationId.jobTitle && `• ${sess.applicationId.jobTitle}`}
                            </p>
                          )}
                        </div>

                        {/* Session stats & footer */}
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                          <div className="flex items-center space-x-3">
                            <span className="font-mono">
                              {sess.answeredCount} / {sess.questionCount} Answered
                            </span>
                            {sess.revisitCount > 0 && (
                              <span className="text-amber-400 font-semibold flex items-center space-x-1">
                                <Bookmark className="w-3 h-3 fill-amber-400" />
                                <span>{sess.revisitCount}</span>
                              </span>
                            )}
                          </div>

                          <span className="text-[11px] text-slate-500">{dateStr}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* New Session Setup Modal */}
      <NewSessionModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={(newSession) => {
          setActiveSession(newSession);
          fetchSessions();
        }}
      />
    </div>
  );
}

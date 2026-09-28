import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Award,
  Sparkles,
  BarChart3,
  HelpCircle
} from 'lucide-react';
import interviewSessionService from '../../services/interviewSession.service';

export default function MockInterviewView({
  session,
  onUpdateSession,
  onBack,
  onSwitchToPractice
}) {
  const [currentIndex, setCurrentIndex] = useState(session.currentQuestionIndex || 0);
  const [currentAnswer, setCurrentAnswer] = useState(
    session.questions[currentIndex]?.userAnswer || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Timer state (optional non-blocking stopwatch per FR-073)
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Completed summary state
  const [isCompleted, setIsCompleted] = useState(session.status === 'completed');

  const activeQuestion = session.questions[currentIndex];

  // Update answer text when question index changes
  useEffect(() => {
    if (session.questions[currentIndex]) {
      setCurrentAnswer(session.questions[currentIndex].userAnswer || '');
    }
  }, [currentIndex, session.questions]);

  // Stopwatch effect
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && !isCompleted) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, isCompleted]);

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleNextOrFinish = async (skip = false) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const isLast = currentIndex === session.questions.length - 1;
      const nextIndex = isLast ? currentIndex : currentIndex + 1;

      // Save answer or skipped state
      const res = await interviewSessionService.saveAnswer(
        session._id,
        activeQuestion._id,
        {
          userAnswer: skip ? '' : currentAnswer,
          isSkipped: skip,
          currentQuestionIndex: nextIndex
        }
      );

      if (onUpdateSession && res.session) {
        onUpdateSession(res.session);
      }

      if (isLast) {
        // Complete mock interview (FR-077)
        const completedSession = await interviewSessionService.completeSession(session._id);
        setIsCompleted(true);
        if (onUpdateSession) {
          onUpdateSession(completedSession);
        }
      } else {
        setCurrentIndex(nextIndex);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to advance question');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndExit = async () => {
    setIsSubmitting(true);
    try {
      await interviewSessionService.saveAnswer(session._id, activeQuestion._id, {
        userAnswer: currentAnswer,
        currentQuestionIndex: currentIndex
      });
      onBack();
    } catch {
      onBack();
    }
  };

  const handleToggleRevisit = async () => {
    const nextRevisit = !activeQuestion.revisit;
    try {
      const res = await interviewSessionService.saveAnswer(
        session._id,
        activeQuestion._id,
        {
          revisit: nextRevisit
        }
      );
      activeQuestion.revisit = nextRevisit;
      if (onUpdateSession && res.session) {
        onUpdateSession(res.session);
      }
    } catch (err) {
      setError('Failed to bookmark question');
    }
  };

  // If session is completed, render summary screen (FR-077)
  if (isCompleted && session.summary) {
    const {
      totalQuestions = session.questions.length,
      answeredCount = 0,
      skippedCount = 0,
      revisitCount = 0,
      averageRatings
    } = session.summary;

    const revisitQuestions = session.questions.filter((q) => q.revisit);

    return (
      <div className="max-w-3xl mx-auto space-y-6 text-left animate-fadeIn">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white mx-auto shadow-xl shadow-brand-500/25">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Mock Interview Completed!
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Performance breakdown for {session.roleTitle} ({session.experienceLevel})
            </p>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Total Questions
              </span>
              <p className="text-2xl font-extrabold text-white mt-1">{totalQuestions}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-emerald-400">
                Answered
              </span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">{answeredCount}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Skipped
              </span>
              <p className="text-2xl font-extrabold text-slate-300 mt-1">{skippedCount}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-amber-400">
                To Revisit
              </span>
              <p className="text-2xl font-extrabold text-amber-400 mt-1">{revisitCount}</p>
            </div>
          </div>

          {/* Average Feedback Score (if available) */}
          {averageRatings && averageRatings.overall > 0 && (
            <div className="p-5 rounded-2xl bg-brand-500/10 border border-brand-500/30 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-300">
                  Evaluated Answers Average Rating
                </span>
                <span className="text-lg font-extrabold text-white font-mono">
                  {averageRatings.overall} / 5.0
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300">
                <div>Relevance: {averageRatings.relevance} / 5</div>
                <div>Structure: {averageRatings.structure} / 5</div>
                <div>Clarity: {averageRatings.clarity} / 5</div>
                <div>Specificity: {averageRatings.specificity} / 5</div>
              </div>
            </div>
          )}

          {/* Questions marked for revisit (FR-077) */}
          {revisitQuestions.length > 0 && (
            <div className="text-left space-y-3 pt-2 border-t border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                <Bookmark className="w-3.5 h-3.5 fill-amber-400" />
                <span>Questions Marked for Revisit ({revisitQuestions.length})</span>
              </h3>
              <div className="space-y-2">
                {revisitQuestions.map((q, idx) => (
                  <div
                    key={q._id || idx}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300"
                  >
                    <span className="font-semibold text-white mr-2">Q:</span>
                    {q.questionText}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={onSwitchToPractice}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition shadow-lg shadow-brand-500/20 flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Review in Practice Mode</span>
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition"
            >
              Back to Preparation Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active question runner
  const progressPercent = Math.round(((currentIndex + 1) / session.questions.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      {/* Top Header with Progress & Timer */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleSaveAndExit}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
              title="Pause and Exit (FR-073)"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {session.roleTitle}
                </h2>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20">
                  Mock Interview
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Question {currentIndex + 1} of {session.questions.length}
              </span>
            </div>
          </div>

          {/* Optional on-screen stopwatch (FR-073) */}
          <div className="flex items-center space-x-3 self-end sm:self-center">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300">
              <Clock className="w-3.5 h-3.5 text-brand-400" />
              <span>{formatTimer(timerSeconds)}</span>
              <button
                type="button"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="text-slate-500 hover:text-white ml-1"
                title={isTimerRunning ? 'Pause timer' : 'Resume timer'}
              >
                {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveAndExit}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
            >
              Save & Exit
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-sky-400 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Badges & Revisit bookmark */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 capitalize font-medium">
              {activeQuestion.type}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 capitalize font-medium">
              {activeQuestion.difficulty}
            </span>
            {activeQuestion.focusTopic && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-950 text-slate-400 border border-slate-800 font-mono">
                {activeQuestion.focusTopic}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleToggleRevisit}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              activeQuestion.revisit
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            {activeQuestion.revisit ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 fill-amber-400" />
                <span>Bookmarked</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                <span>Bookmark</span>
              </>
            )}
          </button>
        </div>

        {/* Question Prompt */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-400">
            Prompt
          </span>
          <h3 className="text-2xl font-bold text-white tracking-tight mt-1 leading-snug">
            {activeQuestion.questionText}
          </h3>
        </div>

        {/* Answer Workspace */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <label className="font-bold uppercase tracking-wider text-slate-300">
              Your Response
            </label>
            <span className="text-slate-500 font-mono">
              {currentAnswer.length} / 5,000 characters
            </span>
          </div>

          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Structure your response clearly. Take your time to think through the problem or situation..."
            rows={8}
            maxLength={5000}
            className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-2xl p-4 text-sm text-white placeholder-slate-500 outline-none transition leading-relaxed resize-y"
          />

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => handleNextOrFinish(true)}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition flex items-center space-x-1.5 disabled:opacity-50"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>Skip Question</span>
          </button>

          <button
            type="button"
            onClick={() => handleNextOrFinish(false)}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-lg shadow-brand-500/20 transition flex items-center space-x-1.5 disabled:opacity-50"
          >
            {currentIndex === session.questions.length - 1 ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit & Complete Interview</span>
              </>
            ) : (
              <>
                <span>Save & Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

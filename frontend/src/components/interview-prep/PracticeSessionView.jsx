import React, { useState } from 'react';
import {
  Sparkles,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Clock,
  HelpCircle,
  Eye,
  EyeOff,
  Send,
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ThumbsUp,
  AlertTriangle
} from 'lucide-react';
import interviewSessionService from '../../services/interviewSession.service';

export default function PracticeSessionView({
  session,
  onUpdateSession,
  onBack
}) {
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(
    session.currentQuestionIndex || 0
  );
  const [answers, setAnswers] = useState(() => {
    const map = {};
    session.questions.forEach((q, idx) => {
      map[idx] = q.userAnswer || '';
    });
    return map;
  });

  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [isRequestingFeedback, setIsRequestingFeedback] = useState(false);
  const [isLoadingSampleAnswer, setIsLoadingSampleAnswer] = useState(false);
  const [showSampleAnswer, setShowSampleAnswer] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  const activeQuestion = session.questions[activeQuestionIndex];
  const currentAnswer = answers[activeQuestionIndex] ?? '';

  const handleAnswerChange = (val) => {
    setAnswers({
      ...answers,
      [activeQuestionIndex]: val
    });
    setError(null);
  };

  const handleSaveAnswer = async () => {
    setIsSavingAnswer(true);
    setError(null);
    setSaveSuccessMsg(null);
    try {
      const res = await interviewSessionService.saveAnswer(
        session._id,
        activeQuestion._id,
        {
          userAnswer: currentAnswer,
          currentQuestionIndex: activeQuestionIndex
        }
      );
      if (onUpdateSession && res.session) {
        onUpdateSession(res.session);
      }
      setSaveSuccessMsg('Answer saved successfully');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save answer');
    } finally {
      setIsSavingAnswer(false);
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
      if (onUpdateSession && res.session) {
        onUpdateSession(res.session);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to toggle bookmark');
    }
  };

  const handleRevealSampleAnswer = async () => {
    if (activeQuestion.exampleAnswer) {
      setShowSampleAnswer(!showSampleAnswer);
      return;
    }

    setIsLoadingSampleAnswer(true);
    setError(null);
    try {
      const res = await interviewSessionService.getExampleAnswer(
        session._id,
        activeQuestion._id
      );
      // Update local question representation
      activeQuestion.exampleAnswer = res.exampleAnswer;
      setShowSampleAnswer(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load reference answer');
    } finally {
      setIsLoadingSampleAnswer(false);
    }
  };

  const handleRequestFeedback = async () => {
    if (currentAnswer.trim().length < 20) {
      setError('Answer must be at least 20 characters long to receive AI feedback (FR-075).');
      return;
    }

    setIsRequestingFeedback(true);
    setError(null);
    try {
      const res = await interviewSessionService.evaluateAnswer(
        session._id,
        activeQuestion._id,
        currentAnswer
      );
      // Update question feedback in parent state
      activeQuestion.feedback = res.feedback;
      activeQuestion.userAnswer = currentAnswer;
      if (onUpdateSession) {
        onUpdateSession({ ...session });
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to generate AI feedback');
    } finally {
      setIsRequestingFeedback(false);
    }
  };

  const handleCompleteSession = async () => {
    try {
      const updated = await interviewSessionService.completeSession(session._id);
      if (onUpdateSession) {
        onUpdateSession(updated);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to complete session');
    }
  };

  const getDifficultyBadge = (diff) => {
    switch (diff) {
      case 'easy':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'hard':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  const renderRatingBar = (label, value) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400 capitalize">{label}</span>
        <span className="font-bold text-white font-mono">{value} / 5</span>
      </div>
      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            value >= 4 ? 'bg-emerald-500' : value === 3 ? 'bg-amber-500' : 'bg-rose-500'
          }`}
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 text-left">
      {/* Top Session Action Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Back to Sessions"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {session.roleTitle}
              </h2>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20">
                {session.experienceLevel}
              </span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                Practice Mode
              </span>
            </div>
            {session.applicationId && (
              <p className="text-xs text-brand-400 mt-0.5">
                Tailored for {session.applicationId.companyName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 self-end md:self-center">
          <span className="text-xs text-slate-400 font-mono">
            Question {activeQuestionIndex + 1} of {session.questions.length}
          </span>
          {session.status !== 'completed' && (
            <button
              type="button"
              onClick={handleCompleteSession}
              className="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition"
            >
              Finish & Mark Complete
            </button>
          )}
        </div>
      </div>

      {/* Main Practice Workspace: Left Question Navigator + Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Question Navigator (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
              Questions Checklist ({session.questions.length})
            </h3>

            <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
              {session.questions.map((q, idx) => {
                const isCurrent = idx === activeQuestionIndex;
                const isAnswered = q.userAnswer && q.userAnswer.trim().length > 0;
                const hasFeedback = !!q.feedback;

                return (
                  <button
                    key={q._id || idx}
                    type="button"
                    onClick={() => {
                      setActiveQuestionIndex(idx);
                      setShowSampleAnswer(false);
                      setError(null);
                    }}
                    className={`w-full p-3 rounded-2xl border text-left transition flex items-start space-x-3 ${
                      isCurrent
                        ? 'border-brand-500 bg-brand-500/10 text-white shadow-md shadow-brand-500/10'
                        : 'border-slate-800/80 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                        isCurrent
                          ? 'bg-brand-500 text-white'
                          : isAnswered
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 line-clamp-2 leading-snug">
                        {q.questionText}
                      </p>

                      <div className="flex items-center space-x-2 mt-1.5 text-[10px]">
                        <span className="capitalize text-slate-500 font-mono">
                          {q.type}
                        </span>
                        {q.revisit && (
                          <span className="text-amber-400 font-semibold flex items-center space-x-0.5">
                            <Bookmark className="w-2.5 h-2.5 fill-amber-400" />
                            <span>Revisit</span>
                          </span>
                        )}
                        {hasFeedback && (
                          <span className="text-sky-400 font-semibold flex items-center space-x-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Evaluated</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active Question Workspace (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            {/* Question Header & Tags */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 capitalize font-medium">
                  {activeQuestion.type}
                </span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border capitalize font-semibold ${getDifficultyBadge(
                    activeQuestion.difficulty
                  )}`}
                >
                  {activeQuestion.difficulty}
                </span>
                {activeQuestion.focusTopic && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-950 text-slate-400 border border-slate-800 font-mono">
                    {activeQuestion.focusTopic}
                  </span>
                )}
              </div>

              {/* Bookmark for revisit */}
              <button
                type="button"
                onClick={handleToggleRevisit}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                  activeQuestion.revisit
                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                }`}
                title="Mark question to revisit later (FR-079)"
              >
                {activeQuestion.revisit ? (
                  <>
                    <BookmarkCheck className="w-3.5 h-3.5 fill-amber-400" />
                    <span>Bookmarked for Revisit</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Bookmark for Revisit</span>
                  </>
                )}
              </button>
            </div>

            {/* Question Text */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-400">
                Question {activeQuestionIndex + 1}
              </span>
              <h3 className="text-xl font-bold text-white tracking-tight mt-1 leading-relaxed">
                {activeQuestion.questionText}
              </h3>
            </div>

            {/* Reference Sample Answer Toggle (FR-071) */}
            <div className="border border-slate-800 rounded-2xl bg-slate-950/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Reference Model Answer (Sample)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRevealSampleAnswer}
                  disabled={isLoadingSampleAnswer}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
                >
                  {isLoadingSampleAnswer ? (
                    <span>Generating sample...</span>
                  ) : showSampleAnswer ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide Sample</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Reveal Sample Answer</span>
                    </>
                  )}
                </button>
              </div>

              {showSampleAnswer && activeQuestion.exampleAnswer && (
                <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line animate-fadeIn">
                  <div className="mb-2 inline-block px-2 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-300 font-mono">
                    Sample reference model (not the only correct response, FR-071)
                  </div>
                  <p>{activeQuestion.exampleAnswer}</p>
                </div>
              )}
            </div>

            {/* User Answer Textarea (FR-072) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold uppercase tracking-wider text-slate-300">
                  Your Answer
                </label>
                <span
                  className={`font-mono ${
                    currentAnswer.length > 4800 ? 'text-rose-400' : 'text-slate-500'
                  }`}
                >
                  {currentAnswer.length} / 5,000 characters
                </span>
              </div>

              <textarea
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(e.target.value)}
                placeholder="Draft your answer here using clear technical reasoning or the STAR method (Situation, Task, Action, Result)..."
                rows={7}
                maxLength={5000}
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-2xl p-4 text-sm text-white placeholder-slate-500 outline-none transition leading-relaxed resize-y"
              />

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveAnswer}
                  disabled={isSavingAnswer}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {isSavingAnswer ? 'Saving...' : 'Save Draft'}
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleRequestFeedback}
                    disabled={isRequestingFeedback || currentAnswer.trim().length < 20}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white text-xs font-bold shadow-lg shadow-brand-500/20 transition disabled:opacity-50 flex items-center space-x-1.5"
                    title={
                      currentAnswer.trim().length < 20
                        ? 'Answer must be at least 20 characters to evaluate'
                        : 'Get multi-dimensional AI scoring and critique'
                    }
                  >
                    {isRequestingFeedback ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Evaluating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Request AI Feedback</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* AI Feedback Panel (FR-074, FR-076) */}
            {activeQuestion.feedback && (
              <div className="border border-brand-500/30 bg-gradient-to-br from-brand-950/40 via-slate-950 to-slate-950 rounded-2xl p-6 shadow-xl space-y-5 animate-fadeIn">
                {/* Non-objectivity notice (FR-076) */}
                <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl text-[11px] text-brand-300 flex items-start space-x-2 leading-relaxed">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-brand-400" />
                  <span>
                    <strong>Notice (FR-076):</strong> AI feedback is an automated, subjective
                    assessment to aid structured preparation and does not constitute an objective
                    evaluation or guarantee of interview performance.
                  </span>
                </div>

                {/* Rating meters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-2 border-b border-slate-800">
                  {renderRatingBar('Relevance', activeQuestion.feedback.ratings.relevance)}
                  {renderRatingBar('Structure', activeQuestion.feedback.ratings.structure)}
                  {renderRatingBar('Clarity', activeQuestion.feedback.ratings.clarity)}
                  {renderRatingBar('Specificity', activeQuestion.feedback.ratings.specificity)}
                </div>

                {/* Summary */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Assessment Summary
                  </h4>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {activeQuestion.feedback.summary}
                  </p>
                </div>

                {/* Strengths & Improvements Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Observed Strengths</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {activeQuestion.feedback.strengths.map((str, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Areas to Improve */}
                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Areas for Improvement</span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {activeQuestion.feedback.areasToImprove.map((imp, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <span className="text-amber-400 font-bold">•</span>
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (activeQuestionIndex > 0) {
                    setActiveQuestionIndex(activeQuestionIndex - 1);
                    setShowSampleAnswer(false);
                  }
                }}
                disabled={activeQuestionIndex === 0}
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40 transition flex items-center space-x-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Question</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeQuestionIndex < session.questions.length - 1) {
                    setActiveQuestionIndex(activeQuestionIndex + 1);
                    setShowSampleAnswer(false);
                  }
                }}
                disabled={activeQuestionIndex === session.questions.length - 1}
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40 transition flex items-center space-x-1.5"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

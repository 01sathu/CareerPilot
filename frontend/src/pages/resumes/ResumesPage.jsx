import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/layout/Navbar';
import ResumeUploadModal from '../../components/resumes/ResumeUploadModal';
import AiConsentModal from '../../components/resumes/AiConsentModal';
import JobMatchModal from '../../components/resumes/JobMatchModal';
import GeneralAnalysisView from '../../components/resumes/GeneralAnalysisView';
import JobMatchView from '../../components/resumes/JobMatchView';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
import resumeService from '../../services/resume.service';
import {
  FileText,
  UploadCloud,
  Sparkles,
  Target,
  Download,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Eye,
  EyeOff,
  Building2,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function ResumesPage() {
  const { user, checkAuth } = useAuth();

  // State
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [selectedResume, setSelectedResume] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [activeAnalysisId, setActiveAnalysisId] = useState(null);

  // Modals & Pending Actions
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'analyze' | 'match'
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Confirm Deletion
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: 'resume', // 'resume' | 'analysis'
    targetId: null,
    analysisId: null,
    title: '',
    message: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Load resumes list (FR-051)
  const fetchResumes = useCallback(async () => {
    try {
      setError(null);
      const data = await resumeService.listResumes();
      setResumes(data);
      // Auto-select first resume if none selected
      if (data.length > 0 && !selectedResumeId) {
        setSelectedResumeId(data[0]._id);
      } else if (data.length === 0) {
        setSelectedResumeId(null);
        setSelectedResume(null);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load resumes');
    } finally {
      setIsLoading(false);
    }
  }, [selectedResumeId]);

  // Load detailed resume data when selectedResumeId changes
  const fetchResumeDetails = useCallback(async (id) => {
    if (!id) {
      setSelectedResume(null);
      return;
    }
    setIsLoadingDetails(true);
    setActionError(null);
    try {
      const fullResume = await resumeService.getResume(id);
      setSelectedResume(fullResume);
      // Set active analysis to latest if available
      if (fullResume?.analyses?.length > 0) {
        setActiveAnalysisId(fullResume.analyses[0]._id);
      } else {
        setActiveAnalysisId(null);
      }
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Failed to load resume details');
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  useEffect(() => {
    if (selectedResumeId) {
      fetchResumeDetails(selectedResumeId);
    }
  }, [selectedResumeId, fetchResumeDetails]);

  // Verify consent before proceeding with AI actions (FR-063)
  const ensureConsent = (action) => {
    if (!user?.aiConsentAcceptedAt) {
      setPendingAction(action);
      setIsConsentOpen(true);
      return false;
    }
    return true;
  };

  const handleConsentSuccess = async () => {
    if (checkAuth) {
      await checkAuth();
    }
    const action = pendingAction;
    setPendingAction(null);
    if (action === 'analyze') {
      runGeneralAnalysis();
    } else if (action === 'match') {
      setIsMatchModalOpen(true);
    }
  };

  // Run general AI analysis (FR-054)
  const runGeneralAnalysis = async () => {
    if (!selectedResume) return;
    if (!ensureConsent('analyze')) return;

    setIsAnalyzing(true);
    setActionError(null);
    try {
      const result = await resumeService.analyzeResume(selectedResume._id);
      // Refresh details to view newly added analysis
      await fetchResumeDetails(selectedResume._id);
      await fetchResumes();
      if (result?.analysis?._id) {
        setActiveAnalysisId(result.analysis._id);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'General analysis failed';
      setActionError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Trigger Match Modal
  const handleOpenMatchModal = () => {
    if (!selectedResume) return;
    if (!ensureConsent('match')) return;
    setIsMatchModalOpen(true);
  };

  // Match Success callback
  const handleMatchSuccess = async (newAnalysis) => {
    await fetchResumeDetails(selectedResume._id);
    await fetchResumes();
    if (newAnalysis?._id) {
      setActiveAnalysisId(newAnalysis._id);
    }
  };

  // Download PDF via 5-min signed token (FR-052)
  const handleDownload = async () => {
    if (!selectedResume) return;
    try {
      const data = await resumeService.getDownloadToken(selectedResume._id);
      if (data?.downloadUrl) {
        // Open download url in new window or trigger download
        window.open(data.downloadUrl, '_blank');
      }
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Failed to generate download link');
    }
  };

  // Delete Resume (FR-053)
  const promptDeleteResume = (resume) => {
    setConfirmDialog({
      isOpen: true,
      type: 'resume',
      targetId: resume._id,
      title: `Delete "${resume.originalFilename}"?`,
      message: 'This will permanently remove the resume file, extracted text, and all associated AI analyses. This action cannot be undone (FR-053).'
    });
  };

  // Delete Individual Analysis (FR-062)
  const promptDeleteAnalysis = (analysisId) => {
    setConfirmDialog({
      isOpen: true,
      type: 'analysis',
      targetId: selectedResume._id,
      analysisId,
      title: 'Delete Analysis Record?',
      message: 'This analysis will be permanently deleted from this resume history.'
    });
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setActionError(null);
    try {
      if (confirmDialog.type === 'resume') {
        await resumeService.deleteResume(confirmDialog.targetId);
        setConfirmDialog({ isOpen: false, type: 'resume', targetId: null, analysisId: null, title: '', message: '' });
        setSelectedResumeId(null);
        setSelectedResume(null);
        await fetchResumes();
      } else if (confirmDialog.type === 'analysis') {
        await resumeService.deleteAnalysis(confirmDialog.targetId, confirmDialog.analysisId);
        setConfirmDialog({ isOpen: false, type: 'resume', targetId: null, analysisId: null, title: '', message: '' });
        await fetchResumeDetails(confirmDialog.targetId);
        await fetchResumes();
      }
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Deletion failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const activeAnalysis = selectedResume?.analyses?.find((a) => a._id === activeAnalysisId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-brand-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                AI Resume Analyzer
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Extract skills and experience, evaluate structure, and calculate AI job match alignment against target roles.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400 font-medium px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="font-bold text-white">{resumes.length}</span> / 10 Resumes
            </span>

            <button
              onClick={() => setIsUploadOpen(true)}
              disabled={resumes.length >= 10}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-2"
              title={resumes.length >= 10 ? 'Maximum 10 resumes limit reached (FR-050)' : 'Upload new PDF'}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Resume</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center space-x-3 text-xs">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Error Banner */}
        {actionError && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center space-x-3 text-xs">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Notice: </span>
              {actionError}
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-amber-400 hover:text-white font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content Layout */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-400 mb-3" />
            <p className="text-xs text-slate-400">Loading your resumes...</p>
          </div>
        ) : resumes.length === 0 ? (
          /* Empty State */
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto my-12 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-white">No Resumes Uploaded Yet</h2>
            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              Upload your PDF resume (up to 5 MB, max 10 pages). We'll automatically parse text, extract your skills, and let you run AI-powered alignment analyses.
            </p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="mt-6 px-5 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20 transition inline-flex items-center space-x-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload First Resume</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Resumes Sidebar List */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Uploaded Resumes
                </span>
                <span className="text-[11px] text-slate-500">
                  Select to view analysis
                </span>
              </div>

              <div className="space-y-2.5">
                {resumes.map((item) => {
                  const isSelected = item._id === selectedResumeId;
                  const isCompleted = item.extractionStatus === 'completed';
                  return (
                    <div
                      key={item._id}
                      onClick={() => setSelectedResumeId(item._id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left relative ${
                        isSelected
                          ? 'bg-slate-900 border-brand-500/60 shadow-lg shadow-brand-500/10 ring-1 ring-brand-500/40'
                          : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-3 overflow-hidden">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              isSelected
                                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <FileText className="w-4 h-4" />
                          </div>

                          <div className="overflow-hidden">
                            <h3 className="text-xs font-bold text-white truncate max-w-[190px]">
                              {item.originalFilename}
                            </h3>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                              <span>{(item.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                              <span>•</span>
                              <span>{item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-1">
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                              isCompleted
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {item.extractionStatus}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {item.analysisCount || 0} analyses
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Selected Resume Details & Analyses */}
            <div className="lg:col-span-8 space-y-6">
              {isLoadingDetails ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-16 flex flex-col items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-brand-400 mb-3" />
                  <p className="text-xs text-slate-400">Loading resume details...</p>
                </div>
              ) : selectedResume ? (
                <>
                  {/* Selected Resume Header Card */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h2 className="text-lg font-bold text-white truncate max-w-md">
                            {selectedResume.originalFilename}
                          </h2>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              selectedResume.extractionStatus === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {selectedResume.extractionStatus}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Uploaded on {new Date(selectedResume.createdAt).toLocaleDateString()} •{' '}
                          {(selectedResume.fileSize / 1024 / 1024).toFixed(2)} MB •{' '}
                          {selectedResume.pageCount} {selectedResume.pageCount === 1 ? 'page' : 'pages'}
                        </p>
                      </div>

                      {/* Top Action Buttons */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleDownload}
                          className="px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center space-x-1.5"
                          title="Download original PDF via 5-min signed token (FR-052)"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>

                        <button
                          onClick={() => promptDeleteResume(selectedResume)}
                          className="p-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition"
                          title="Delete resume & analyses (FR-053)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* AI Actions Ribbon */}
                    <div className="pt-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          onClick={runGeneralAnalysis}
                          disabled={isAnalyzing || selectedResume.extractionStatus === 'failed'}
                          className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white shadow-lg shadow-brand-500/25 transition disabled:opacity-40 flex items-center space-x-1.5"
                        >
                          {isAnalyzing ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Analyzing Resume...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Run General Analysis</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={handleOpenMatchModal}
                          disabled={selectedResume.extractionStatus === 'failed'}
                          className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25 transition disabled:opacity-40 flex items-center space-x-1.5"
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>Match Against Job</span>
                        </button>
                      </div>

                      {/* Extracted Text Preview Toggle */}
                      <button
                        onClick={() => setShowExtractedText(!showExtractedText)}
                        className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 py-1 px-2 rounded-lg hover:bg-slate-800 transition"
                      >
                        {showExtractedText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showExtractedText ? 'Hide Text' : 'View Extracted Text'}</span>
                      </button>
                    </div>

                    {/* Text Extraction Warning if failed */}
                    {selectedResume.extractionStatus === 'failed' && (
                      <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Text Extraction Incomplete</p>
                          <p className="text-[11px] text-rose-300/80 mt-0.5">
                            Could not extract at least 100 characters of selectable text from this PDF (FR-049). Scanned images or password-protected files cannot be analyzed by AI.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Extracted Text Drawer / Viewer */}
                    {showExtractedText && (
                      <div className="mt-5 p-4 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-300">
                            Parsed PDF Text ({selectedResume.extractedText?.length || 0} chars)
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Capped at 50,000 characters
                          </span>
                        </div>
                        <pre className="font-mono text-[11px] text-slate-400 max-h-56 overflow-y-auto whitespace-pre-wrap bg-slate-900/60 p-3 rounded-xl border border-slate-800 leading-relaxed">
                          {selectedResume.extractedText || 'No text extracted'}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Analysis History & Viewer Section */}
                  {selectedResume.analyses && selectedResume.analyses.length > 0 ? (
                    <div className="space-y-4">
                      {/* Analysis Selection Tabs */}
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Analysis History ({selectedResume.analyses.length} / 20)
                        </h3>
                        <span className="text-[11px] text-slate-500">
                          Capped at 20 most recent (FR-062)
                        </span>
                      </div>

                      {/* Tabs Bar */}
                      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
                        {selectedResume.analyses.map((an) => {
                          const isActive = an._id === activeAnalysisId;
                          const isGeneral = an.type === 'general';
                          return (
                            <div
                              key={an._id}
                              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all flex-shrink-0 cursor-pointer ${
                                isActive
                                  ? isGeneral
                                    ? 'bg-brand-600/20 text-brand-300 border-brand-500/40 shadow-sm'
                                    : 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-sm'
                                  : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                              }`}
                              onClick={() => setActiveAnalysisId(an._id)}
                            >
                              {isGeneral ? (
                                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                              ) : (
                                <Target className="w-3.5 h-3.5 text-purple-400" />
                              )}
                              <span>
                                {isGeneral
                                  ? 'General Analysis'
                                  : an.jobTitle || an.companyName
                                  ? `${an.jobTitle || 'Role'} @ ${an.companyName || 'Target'}`
                                  : 'Job Match'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                ({new Date(an.createdAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' })})
                              </span>

                              {/* Delete Analysis Button (FR-062) */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  promptDeleteAnalysis(an._id);
                                }}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                                title="Delete this analysis (FR-062)"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Active Analysis View */}
                      {activeAnalysis ? (
                        activeAnalysis.type === 'general' ? (
                          <GeneralAnalysisView analysis={activeAnalysis} />
                        ) : (
                          <JobMatchView analysis={activeAnalysis} />
                        )
                      ) : (
                        <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-xs text-slate-400">
                          Select an analysis tab above to view results.
                        </div>
                      )}
                    </div>
                  ) : (
                    /* No Analyses Run Yet */
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-10 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-white">No Analyses Generated Yet</h3>
                      <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">
                        Run a general structural analysis to parse skills and experience, or compare your resume against a specific job posting.
                      </p>
                      <div className="mt-5 flex items-center justify-center space-x-3">
                        <button
                          onClick={runGeneralAnalysis}
                          disabled={isAnalyzing || selectedResume.extractionStatus === 'failed'}
                          className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition flex items-center space-x-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Run General Analysis</span>
                        </button>
                        <button
                          onClick={handleOpenMatchModal}
                          disabled={selectedResume.extractionStatus === 'failed'}
                          className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center space-x-1.5"
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>Match Against Job</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      <ResumeUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={async (newResume) => {
          await fetchResumes();
          if (newResume?._id) {
            setSelectedResumeId(newResume._id);
          }
        }}
      />

      {/* AI Consent Modal (FR-063) */}
      <AiConsentModal
        isOpen={isConsentOpen}
        onClose={() => {
          setIsConsentOpen(false);
          setPendingAction(null);
        }}
        onConsentSuccess={handleConsentSuccess}
      />

      {/* Job Match Modal */}
      <JobMatchModal
        isOpen={isMatchModalOpen}
        onClose={() => setIsMatchModalOpen(false)}
        resume={selectedResume}
        onMatchSuccess={handleMatchSuccess}
      />

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setConfirmDialog({
            isOpen: false,
            type: 'resume',
            targetId: null,
            analysisId: null,
            title: '',
            message: ''
          })
        }
      />
    </div>
  );
}

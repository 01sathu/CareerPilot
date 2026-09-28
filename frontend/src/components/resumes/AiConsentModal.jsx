import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, X, Sparkles, ExternalLink } from 'lucide-react';
import resumeService from '../../services/resume.service';

/**
 * AI Consent Modal Component (FR-063)
 * Requires explicit user acknowledgement before sending resume data to third-party LLM provider
 */
export default function AiConsentModal({ isOpen, onClose, onConsentSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleAccept = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const updatedUser = await resumeService.acceptAiConsent();
      if (onConsentSuccess) {
        onConsentSuccess(updatedUser);
      }
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        'Failed to record AI consent. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              AI Data Processing Disclosure
            </h2>
            <p className="text-xs text-slate-400">
              Required acknowledgement prior to first AI use (FR-063)
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed my-4">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">How your data is processed</p>
              <p className="text-[11px] text-slate-400 mt-1">
                To generate skill analyses, structural suggestions, and job match scores, your extracted resume text and target job descriptions are securely transmitted to Google's Gemini API.
              </p>
            </div>
          </div>

          <ul className="space-y-2 list-disc list-inside text-slate-300 pl-1 text-[11px]">
            <li>Your account credentials, password, and contact phone numbers are never transmitted in AI prompts.</li>
            <li>AI outputs are subjective estimates and do not predict hiring outcomes (FR-057).</li>
            <li>You can review or delete your uploaded resumes and analyses at any time.</li>
          </ul>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center space-x-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white shadow-lg shadow-brand-500/25 transition disabled:opacity-50 flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Recording Consent...' : 'Accept & Enable AI Features'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

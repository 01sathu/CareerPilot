import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, FileText, Database, Trash2, Cpu, ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-brand-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to CareerPilot</span>
          </Link>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-brand-400" />
            <span className="font-semibold text-white tracking-tight">Privacy Notice</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
            SRS FR-124 Compliance
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            CareerPilot Privacy Notice
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Last Updated: September 28, 2026 • Effective Date: September 28, 2026
          </p>
        </div>

        <div className="space-y-8">
          {/* Card 1: Data We Collect & Store */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400">
                <Database className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-white">1. Data We Collect and Store</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              CareerPilot stores only information strictly required to provide career tracking, resume analysis,
              interview preparation, and job application management services:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-slate-400 ml-2">
              <li>
                <strong className="text-slate-200">Account Credentials:</strong> Name, email address, password hash (encrypted with salted bcrypt, cost factor ≥ 12), and time zone preference.
              </li>
              <li>
                <strong className="text-slate-200">Job Application Tracking Data:</strong> Company name, job title, location, salary range, application status, status timeline events, notes, and application URLs.
              </li>
              <li>
                <strong className="text-slate-200">Resume Documents:</strong> Uploaded PDF files (maximum 5 MB, up to 10 pages) stored in private, isolated cloud object storage, and extracted text used for scoring.
              </li>
              <li>
                <strong className="text-slate-200">Interview Calendar & Notes:</strong> Scheduled rounds, links, formats, reminder configurations, and completion status.
              </li>
              <li>
                <strong className="text-slate-200">AI Mock Sessions:</strong> Selected roles, simulated interview questions, your submitted responses, and AI-generated scoring feedback.
              </li>
            </ul>
          </section>

          {/* Card 2: Third-Party LLM Processing */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Cpu className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-white">2. Third-Party AI / LLM Processing</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              To power intelligent resume analysis, job-matching, and mock interview evaluation, CareerPilot transmits
              minimal required content to <strong className="text-white">Google Gemini API</strong>:
            </p>
            <div className="p-4 bg-purple-950/20 border border-purple-800/40 rounded-xl space-y-2 text-xs text-purple-200 mb-4">
              <p>
                • <strong className="text-purple-100">Zero PII in Prompts:</strong> Your account identifier, email address, phone numbers, and authentication credentials are systematically excluded from LLM prompts by design (NFR-SEC-11).
              </p>
              <p>
                • <strong className="text-purple-100">Explicit Consent:</strong> AI features require prior user consent acceptance (FR-063) recorded with a timestamp in your profile.
              </p>
              <p>
                • <strong className="text-purple-100">Zero Direct Browser Calls:</strong> All AI requests are mediated securely through backend APIs. Your API keys are never exposed to frontend code (FR-058, NFR-SEC-10).
              </p>
            </div>
          </section>

          {/* Card 3: Storage Security & Isolation */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-white">3. Security, Token Storage & Access Control</h2>
            </div>
            <ul className="list-disc list-inside space-y-2 text-sm text-slate-400 ml-2">
              <li>
                <strong className="text-slate-200">Strict Data Isolation:</strong> Every database query is strictly scoped by your authenticated user ID. Requests attempting to access unauthorized records return HTTP 404 (FR-149, FR-150).
              </li>
              <li>
                <strong className="text-slate-200">In-Memory Access Tokens:</strong> JWT access tokens are held exclusively in browser memory (never stored in <code className="text-brand-300">localStorage</code>), preventing persistent XSS token theft (NFR-SEC-04).
              </li>
              <li>
                <strong className="text-slate-200">HttpOnly Refresh Cookies:</strong> Session refresh tokens are transmitted inside encrypted, <code className="text-brand-300">HttpOnly</code>, <code className="text-brand-300">SameSite=Lax</code>, and <code className="text-brand-300">Secure</code> cookies.
              </li>
              <li>
                <strong className="text-slate-200">Short-Lived Signed File Links:</strong> Resumes can only be downloaded via cryptographically signed tokens with a 5-minute expiry window (FR-052).
              </li>
            </ul>
          </section>

          {/* Card 4: Retention, Export & Complete Account Deletion */}
          <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-white">4. Data Ownership, Export & Deletion</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              You maintain 100% ownership of your data at all times (FR-117 through FR-123):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
                <div className="font-semibold text-white mb-1 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-brand-400" />
                  <span>Full CSV Export (FR-117, FR-118)</span>
                </div>
                <p className="text-slate-400">
                  Export all your job applications and status timeline history at any time with CSV formula injection neutralization.
                </p>
              </div>
              <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
                <div className="font-semibold text-rose-400 mb-1 flex items-center space-x-1.5">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Complete Account Erasure (FR-121)</span>
                </div>
                <p className="text-slate-400">
                  Requesting deletion permanently wipes your user profile, all applications, history records, uploaded resumes, AI evaluations, calendar events, and notifications.
                </p>
              </div>
            </div>
          </section>

          {/* Contact / Inquiries */}
          <div className="text-center pt-6 text-xs text-slate-500">
            For questions regarding this privacy notice or your data rights, contact privacy@careerpilot.app.
          </div>
        </div>
      </main>
    </div>
  );
}

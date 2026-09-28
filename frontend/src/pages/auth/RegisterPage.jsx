import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import CareerPilotLogo from '../../components/common/CareerPilotLogo';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  TrendingUp,
  FileCheck2,
  CalendarCheck,
  ShieldCheck,
  Check
} from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirmation: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live password requirements evaluation
  const passwordCriteria = {
    hasLength: formData.password.length >= 8 && formData.password.length <= 128,
    hasUpper: /[A-Z]/.test(formData.password),
    hasLower: /[a-z]/.test(formData.password),
    hasNumber: /\d/.test(formData.password),
    matchesConfirm:
      Boolean(formData.password) &&
      Boolean(formData.passwordConfirmation) &&
      formData.password === formData.passwordConfirmation
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateClient = () => {
    const errors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    }
    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = 'Please provide a valid email address';
    }
    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;
    if (!pwdRegex.test(formData.password)) {
      errors.password = 'Must be 8-128 characters with at least 1 uppercase letter, 1 lowercase letter, and 1 digit';
    }
    if (formData.password !== formData.passwordConfirmation) {
      errors.passwordConfirmation = 'Passwords do not match';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateClient()) return;

    setIsSubmitting(true);
    setError('');

    try {
      await register(formData);
      navigate('/', { replace: true });
    } catch (err) {
      const errData = err.response?.data?.error;
      if (errData?.details && Array.isArray(errData.details)) {
        const mapped = {};
        errData.details.forEach((d) => {
          mapped[d.field] = d.message;
        });
        setFieldErrors(mapped);
      }
      setError(errData?.message || 'Registration failed. Please check the form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row selection:bg-brand-500 selection:text-white">
      {/* ================= LEFT SECTION: BRANDING & PLATFORM SHOWCASE ================= */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-5/12 flex-col justify-between p-12 bg-slate-900/50 border-r border-slate-800/80 overflow-hidden">
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Logo */}
        <div className="relative z-10">
          <CareerPilotLogo size="lg" to="/" />
        </div>

        {/* Middle: SaaS Value Proposition & Feature Cards */}
        <div className="relative z-10 my-auto py-8 space-y-8">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI-Powered Career Platform</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-snug">
              Navigate your job search with complete clarity.
            </h1>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-lg">
              Organize your pipeline, evaluate resumes against real job descriptions, and prepare for interviews with structured AI feedback — all in one unified workspace.
            </p>
          </div>

          {/* Interactive Visual Representation of Platform Momentum */}
          <div className="space-y-3 max-w-lg">
            {/* Card 1: Kanban Pipeline Snippet */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-xl backdrop-blur space-y-2.5 transform hover:-translate-y-0.5 transition-transform duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-brand-400" />
                  <span>Application Pipeline</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  3 Offers Received
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                <div className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400">Wishlist (6)</div>
                <div className="p-1.5 rounded-lg bg-blue-950/40 text-blue-300 border border-blue-800/30 font-medium">Applied (14)</div>
                <div className="p-1.5 rounded-lg bg-amber-950/40 text-amber-300 border border-amber-800/30 font-medium">Interview (4)</div>
                <div className="p-1.5 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-800/30 font-medium">Offer (3)</div>
              </div>
            </div>

            {/* Card 2: AI Resume Matching & Interview Snippet */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-lg space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                  <FileCheck2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Resume Match</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">94%</div>
                <p className="text-[11px] text-slate-400 truncate">Senior Full Stack Engineer</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-lg space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                  <CalendarCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Upcoming Round</span>
                </div>
                <div className="text-sm font-bold text-white truncate">System Design</div>
                <p className="text-[11px] text-slate-400 truncate">Tomorrow at 10:00 AM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Trust & Security Indicators */}
        <div className="relative z-10 pt-6 border-t border-slate-800/60 flex items-center space-x-6 text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-400" />
            <span>Bank-grade security</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>100% data ownership</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Check className="w-4 h-4 text-sky-400" />
            <span>Zero prompt PII</span>
          </div>
        </div>
      </div>

      {/* ================= RIGHT SECTION: REGISTRATION FORM ================= */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-12 xl:px-16 py-12 overflow-y-auto">
        {/* Mobile Header (Shown on <lg) */}
        <div className="lg:hidden text-center mb-8">
          <div className="inline-block mb-3">
            <CareerPilotLogo size="md" to="/" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create your account</h2>
          <p className="mt-1 text-xs text-slate-400">
            Start tracking applications, analyzing resumes & preparing with AI
          </p>
        </div>

        {/* Desktop Header within form container */}
        <div className="max-w-md w-full mx-auto">
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl xl:text-3xl font-bold text-white tracking-tight">Get started today</h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Create your account to supercharge your job search workflow.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {error && (
              <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Jane Doe"
                    className="w-full bg-slate-950/80 border border-slate-800 text-white rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition placeholder-slate-500"
                  />
                </div>
                {fieldErrors.name && (
                  <p className="mt-1.5 text-[11px] text-rose-400 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{fieldErrors.name}</span>
                  </p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Work or Personal Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="jane@example.com"
                    className="w-full bg-slate-950/80 border border-slate-800 text-white rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition placeholder-slate-500"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1.5 text-[11px] text-rose-400 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{fieldErrors.email}</span>
                  </p>
                )}
              </div>

              {/* Password with Visibility Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    className="w-full bg-slate-950/80 border border-slate-800 text-white rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1.5 text-[11px] text-rose-400 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{fieldErrors.password}</span>
                  </p>
                )}
              </div>

              {/* Confirm Password with Visibility Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="passwordConfirmation"
                    required
                    value={formData.passwordConfirmation}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    className="w-full bg-slate-950/80 border border-slate-800 text-white rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.passwordConfirmation && (
                  <p className="mt-1.5 text-[11px] text-rose-400 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{fieldErrors.passwordConfirmation}</span>
                  </p>
                )}
              </div>

              {/* Password Requirement Feedback Checklist */}
              {formData.password && (
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5 text-[11px] animate-fadeIn">
                  <div className="font-medium text-slate-400 mb-1">Password strength requirements:</div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className={`flex items-center space-x-1.5 ${passwordCriteria.hasLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                      <span>8+ characters</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${passwordCriteria.hasUpper && passwordCriteria.hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                      <span>Uppercase & lowercase</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${passwordCriteria.hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                      <span>At least 1 number</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${passwordCriteria.matchesConfirm ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                      <span>Passwords match</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Terms and Privacy Notice Link */}
              <p className="text-[11px] text-slate-400 leading-normal pt-1">
                By registering, you agree to CareerPilot's{' '}
                <Link to="/privacy" className="text-brand-400 hover:text-brand-300 underline underline-offset-2">
                  Privacy Notice
                </Link>{' '}
                and zero-retention LLM processing policy.
              </p>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-3 flex items-center justify-center space-x-2 bg-gradient-to-r from-brand-600 via-sky-500 to-brand-500 hover:from-brand-500 hover:to-sky-400 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating your account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Existing user sign in */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300 transition">
                Sign in to CareerPilot
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

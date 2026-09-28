import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import CareerPilotLogo from '../../components/common/CareerPilotLogo';
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  TrendingUp,
  FileCheck2,
  CalendarCheck,
  ShieldCheck,
  Check
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await login(formData.email, formData.password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Login failed. Please check your credentials.';
      setError(msg);
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

        {/* Middle: Value Proposition & Feature Highlights */}
        <div className="relative z-10 my-auto py-8 space-y-8">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Career Momentum Platform</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-snug">
              Welcome back to your career command center.
            </h1>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-lg">
              Pick up right where you left off. Track upcoming interview rounds, review tailored AI mock feedback, and stay in control of your applications.
            </p>
          </div>

          {/* Feature Showcase Cards */}
          <div className="space-y-3 max-w-lg">
            {/* Card 1: Pipeline Snapshot */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-xl backdrop-blur space-y-2.5 transform hover:-translate-y-0.5 transition-transform duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-brand-400" />
                  <span>Pipeline Activity</span>
                </span>
                <span className="text-[11px] font-mono text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-full">
                  Updated Live
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                <div className="p-1.5 rounded-lg bg-slate-800/60 text-slate-400">Wishlist</div>
                <div className="p-1.5 rounded-lg bg-blue-950/40 text-blue-300 border border-blue-800/30 font-medium">Applied</div>
                <div className="p-1.5 rounded-lg bg-amber-950/40 text-amber-300 border border-amber-800/30 font-medium">Interview</div>
                <div className="p-1.5 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-800/30 font-medium">Offers</div>
              </div>
            </div>

            {/* Card 2: Quick Highlights */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-lg space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                  <FileCheck2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>AI Resume Scorer</span>
                </div>
                <div className="text-sm font-semibold text-slate-300">Actionable Insights</div>
                <p className="text-[11px] text-slate-500">Skills, experience & metrics</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-lg space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
                  <CalendarCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Interview Prep</span>
                </div>
                <div className="text-sm font-semibold text-slate-300">Mock Simulations</div>
                <p className="text-[11px] text-slate-500">STAR rubric evaluation</p>
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
            <span>In-memory tokens</span>
          </div>
        </div>
      </div>

      {/* ================= RIGHT SECTION: LOGIN FORM ================= */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-12 xl:px-16 py-12 overflow-y-auto">
        {/* Mobile Header (Shown on <lg) */}
        <div className="lg:hidden text-center mb-8">
          <div className="inline-block mb-3">
            <CareerPilotLogo size="md" to="/" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to CareerPilot</h2>
          <p className="mt-1 text-xs text-slate-400">
            Access your job tracker, resume analyses, and interview calendar
          </p>
        </div>

        {/* Desktop Header within form container */}
        <div className="max-w-md w-full mx-auto">
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl xl:text-3xl font-bold text-white tracking-tight">Sign in to your account</h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Enter your credentials to access your CareerPilot workspace.
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
              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
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
                    placeholder="you@example.com"
                    className="w-full bg-slate-950/80 border border-slate-800 text-white rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Password with Visibility Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-brand-400 hover:text-brand-300 transition"
                  >
                    Forgot password?
                  </Link>
                </div>
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
                    placeholder="Enter your password"
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
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-3 flex items-center justify-center space-x-2 bg-gradient-to-r from-brand-600 via-sky-500 to-brand-500 hover:from-brand-500 hover:to-sky-400 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to CareerPilot</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Create account link */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
              Don't have an account yet?{' '}
              <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300 transition">
                Create a free account
              </Link>
            </div>

            {/* Privacy Notice Link */}
            <div className="mt-4 text-center">
              <Link to="/privacy" className="text-[11px] text-slate-500 hover:text-slate-400 transition">
                Privacy Notice
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

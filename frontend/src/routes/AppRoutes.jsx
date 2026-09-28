import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import GuestRoute from './GuestRoute';

// Code-split pages for optimized bundle loading
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage'));
const ApplicationsPage = lazy(() => import('../pages/applications/ApplicationsPage'));
const ResumesPage = lazy(() => import('../pages/resumes/ResumesPage'));
const CalendarPage = lazy(() => import('../pages/calendar/CalendarPage'));
const InterviewPrepPage = lazy(() => import('../pages/interview-prep/InterviewPrepPage'));
const PrivacyPage = lazy(() => import('../pages/privacy/PrivacyPage'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-mono">Loading CareerPilot...</span>
      </div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Guest Only Routes (SRS FR-005, FR-012) */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Protected Routes (SRS FR-012, FR-013, FR-017, FR-024, FR-046, FR-068, FR-089) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/interview-prep" element={<InterviewPrepPage />} />
          <Route path="/interview-prep/:id" element={<InterviewPrepPage />} />
          <Route path="/resumes" element={<ResumesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Public Routes (FR-124) */}
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* Fallback unknown route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

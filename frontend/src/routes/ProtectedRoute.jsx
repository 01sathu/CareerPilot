import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { RefreshCw } from 'lucide-react';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-500 mb-3" />
        <span className="text-sm font-medium">Verifying session...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save current location for redirect back after login (FR-012)
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

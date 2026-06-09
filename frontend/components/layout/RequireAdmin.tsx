import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Route guard for the /admin route.
 * - Waits for Firebase auth to resolve before deciding.
 * - Not logged in → /login
 * - Logged in but NOT an admin email → / (home)
 * - Logged in AND admin email → renders children
 */
export const RequireAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, isAdmin, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-light-gray dark:bg-neutral-dark">
        <div className="flex flex-col items-center gap-3 text-primary animate-pulse">
          <div className="w-9 h-9 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="font-bold text-[10px] uppercase tracking-widest">Verifying Session…</span>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

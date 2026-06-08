import React from 'react';
import { Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { AppOutletContext } from '../../hooks/useAppOutlet';

/**
 * Route guard for login-only areas (wallet, my bets, profile). Guests can browse
 * matches freely; these screens redirect to /login. KYC is enforced per-action
 * (e.g. placing a bet), not as a wall, so it is not checked here.
 *
 * It forwards the parent layout's Outlet context so nested screens still receive
 * the shared app data (wallet, toasts, theme).
 */
export const RequireAuth: React.FC = () => {
  const { isLoggedIn, authReady } = useAuth();
  const location = useLocation();
  const ctx = useOutletContext<AppOutletContext>();

  // Wait for Firebase to resolve a persisted session before deciding, so a
  // logged-in user refreshing /wallet isn't bounced to /login.
  if (!authReady) {
    return (
      <div className="flex items-center justify-center py-32 text-gray-400">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet context={ctx} />;
};

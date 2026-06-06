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
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  const ctx = useOutletContext<AppOutletContext>();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet context={ctx} />;
};

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Route guard for login-only areas (wallet, my bets, profile). Guests can browse
 * matches freely; these screens redirect to /login. KYC is enforced per-action
 * (e.g. placing a bet), not as a wall, so it is not checked here.
 */
export const RequireAuth: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
};

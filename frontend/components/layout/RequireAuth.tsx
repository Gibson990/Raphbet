import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Route guard for the authenticated area. Redirects to /login when signed out
 * and to /kyc when signed in but not yet verified. Otherwise renders the
 * matched child route via <Outlet/>.
 */
export const RequireAuth: React.FC = () => {
  const { isLoggedIn, isVerified } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!isVerified) {
    return <Navigate to="/kyc" replace />;
  }
  return <Outlet />;
};

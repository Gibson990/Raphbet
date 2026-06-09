import React, { useState, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useVirtualWallet } from './hooks/useVirtualWallet';
import { useDarkMode } from './hooks/useDarkMode';
import { useAuth } from './contexts/AuthContext';
import type { AppOutletContext } from './hooks/useAppOutlet';
import Toast from './components/common/Toast';
import { AppLayout } from './components/layout/AppLayout';
import { RequireAuth } from './components/layout/RequireAuth';
import LoginScreen from './screens/LoginScreen';
import KycScreen from './screens/KycScreen';
import KycSandboxScreen from './screens/KycSandboxScreen';
import LegalScreen from './screens/LegalScreen';
import AdminScreen from './screens/AdminScreen';
import { RequireAdmin } from './components/layout/RequireAdmin';
import HomeScreen from './screens/HomeScreen';
import MyBetsScreen from './screens/MyBetsScreen';
import WalletScreen from './screens/WalletScreen';
import ProfileScreen from './screens/ProfileScreen';
import NotFoundScreen from './screens/NotFoundScreen';

export type ToastMessage = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
};

export default function App() {
  const [isDarkMode, toggleDarkMode] = useDarkMode();
  const { isLoggedIn, isVerified, isAdmin, completeKyc } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const wallet = useVirtualWallet();

  // After login: admins go to the dashboard; everyone else returns to the page
  // they originally tried to open (or home).
  const afterLoginTarget = isAdmin
    ? '/admin'
    : (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(current => [...current, { id, message, type }]);
    setTimeout(() => setToasts(current => current.filter(t => t.id !== id)), 3000);
  }, []);

  const ctx: AppOutletContext = { wallet, addToast, isDarkMode, toggleDarkMode };

  return (
    <>
      <Routes>
        {/* Public auth routes */}
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to={afterLoginTarget} replace /> : <LoginScreen addToast={addToast} />}
        />
        <Route
          path="/kyc"
          element={
            !isLoggedIn ? (
              <Navigate to="/login" replace />
            ) : isVerified ? (
              <Navigate to="/" replace />
            ) : (
              <KycScreen onSubmit={() => { completeKyc(); navigate('/', { replace: true }); }} addToast={addToast} />
            )
          }
        />
        <Route path="/kyc/sandbox" element={<KycSandboxScreen />} />

        {/* Admin dashboard — requires Firebase login with an admin email */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminScreen />
            </RequireAdmin>
          }
        />

        {/* Public legal pages */}
        <Route path="/terms" element={<LegalScreen doc="terms" />} />
        <Route path="/privacy" element={<LegalScreen doc="privacy" />} />
        <Route path="/responsible-gaming" element={<LegalScreen doc="responsible" />} />

        {/* App shell — Matches is public; wallet/bets/profile require login */}
        <Route element={<AppLayout ctx={ctx} />}>
          <Route index element={<HomeScreen />} />
          <Route element={<RequireAuth />}>
            <Route path="bets" element={<MyBetsScreen />} />
            <Route path="wallet" element={<WalletScreen />} />
            <Route path="profile" element={<ProfileScreen />} />
          </Route>
          <Route path="*" element={<NotFoundScreen />} />
        </Route>
      </Routes>

      <div className="fixed top-20 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToasts(ts => ts.filter(t => t.id !== toast.id))} />
        ))}
      </div>
    </>
  );
}

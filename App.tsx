import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useDarkMode } from './hooks/useDarkMode';
import { useVirtualWallet } from './hooks/useVirtualWallet';

// Components
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import Toast from './components/common/Toast';
import { NetworkStatus } from './components/common/NetworkStatus';

// Screens
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ProfileScreen from './screens/ProfileScreen';
import WalletScreen from './screens/WalletScreen';
import MyBetsScreen from './screens/MyBetsScreen';
import KycScreen from './screens/KycScreen';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" />;
};

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const App = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isDarkMode, toggleDarkMode] = useDarkMode();
  const { isLoggedIn, isVerified, completeKyc } = useAuth();
  const wallet = useVirtualWallet(100000); // Initial balance 100,000 TSH

  const removeToast = useCallback((id: string) => {
    setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}`;
    setToasts(currentToasts => [...currentToasts, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  }, [removeToast]);

  const renderToasts = () => (
    <div className="fixed top-4 right-4 z-50">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );

  // Wrap everything in BrowserRouter at the root
  return (
    <BrowserRouter>
      <div className={`min-h-screen relative ${isDarkMode ? 'dark' : ''}`}>
        {!isVerified && isLoggedIn ? (
          <>
            <KycScreen onSubmit={completeKyc} addToast={addToast} />
            {renderToasts()}
          </>
        ) : (
          <>
            {isLoggedIn && <Header balance={wallet.balance} />}
            <NetworkStatus />
            <main className="container mx-auto px-4 py-4 pb-24 min-h-screen">
              <div className="max-w-2xl mx-auto">
                <Routes>
                  {/* Public Routes */}
                <Route path="/" element={
                  isLoggedIn ? <HomeScreen wallet={wallet} addToast={addToast} /> : <Navigate to="/login" />
                } />
                <Route path="/login" element={
                  isLoggedIn ? <Navigate to="/" /> : <LoginScreen addToast={addToast} />
                } />
                <Route path="/signup" element={<SignupScreen addToast={addToast} />} />
                <Route path="/forgot-password" element={<ForgotPasswordScreen addToast={addToast} />} />
                
                {/* Protected Routes */}
                <Route path="/profile" element={
                  <PrivateRoute>
                    <ProfileScreen isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
                  </PrivateRoute>
                } />
                <Route path="/wallet" element={
                  <PrivateRoute>
                    <WalletScreen wallet={wallet} addToast={addToast} />
                  </PrivateRoute>
                } />
                <Route path="/bets" element={
                  <PrivateRoute>
                    <MyBetsScreen bets={wallet?.placedBets} />
                  </PrivateRoute>
                } />

                {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </main>
            {isLoggedIn && <BottomNav betSlipCount={wallet?.betSlip?.length || 0} />}
            {renderToasts()}
          </>
        )}
      </div>
    </BrowserRouter>
  );
};

export default App;
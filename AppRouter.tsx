import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

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

interface AppRouterProps {
  addToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  wallet?: any; // Replace with proper wallet type
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
}

const AppRouter: React.FC<AppRouterProps> = ({
  addToast,
  wallet,
  isDarkMode,
  toggleDarkMode
}) => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomeScreen wallet={wallet} addToast={addToast} />} />
        <Route path="/login" element={<LoginScreen addToast={addToast} />} />
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
        <Route path="/my-bets" element={
          <PrivateRoute>
            <MyBetsScreen bets={wallet?.placedBets} />
          </PrivateRoute>
        } />
        <Route path="/kyc" element={
          <PrivateRoute>
            <KycScreen onSubmit={() => {}} addToast={addToast} />
          </PrivateRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
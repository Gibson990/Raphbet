import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { useVirtualWallet } from './hooks/useVirtualWallet';
import { useDarkMode } from './hooks/useDarkMode';
import { useAuth } from './contexts/AuthContext';
import Toast from './components/common/Toast';
import LoginScreen from './screens/LoginScreen';
import KycScreen from './screens/KycScreen';
import HomeScreen from './screens/HomeScreen';
import MyBetsScreen from './screens/MyBetsScreen';
import WalletScreen from './screens/WalletScreen';
import ProfileScreen from './screens/ProfileScreen';

export type Screen = 'home' | 'bets' | 'wallet' | 'profile';

export type ToastMessage = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
};

export default function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('home');
  const [isDarkMode, toggleDarkMode] = useDarkMode();
  const { user, isLoggedIn, isVerified, completeKyc } = useAuth();
  
  const wallet = useVirtualWallet(1000000); // Initial balance in TSH

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now();
    setToasts(currentToasts => [...currentToasts, { id, message, type }]);
    setTimeout(() => {
      setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
    }, 3000);
  }, []);

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <HomeScreen wallet={wallet} addToast={addToast} />;
      case 'bets':
        return <MyBetsScreen bets={wallet.placedBets} />;
      case 'wallet':
        return <WalletScreen wallet={wallet} addToast={addToast} />;
      case 'profile':
        return <ProfileScreen isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
      default:
        return <HomeScreen wallet={wallet} addToast={addToast} />;
    }
  };

  if (!isLoggedIn) {
    return <LoginScreen addToast={addToast} />;
  }

  if (!isVerified) {
    return <KycScreen onSubmit={completeKyc} addToast={addToast} />;
  }

  return (
    <div className="min-h-screen bg-neutral-light-gray dark:bg-neutral-dark text-neutral-dark dark:text-neutral-light-gray font-sans">
      <div className="relative">
        <Header balance={wallet.balance} />
        <main className="container mx-auto max-w-4xl px-2 sm:px-4 pb-24">
          {renderScreen()}
        </main>
        <BottomNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} betSlipCount={wallet.betSlip.length} />
      </div>
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToasts(ts => ts.filter(t => t.id !== toast.id))} />
        ))}
      </div>
    </div>
  );
}
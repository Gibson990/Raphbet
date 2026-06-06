import React from 'react';
import type { Screen } from '../App';
import { HomeIcon, ReceiptIcon, CreditCardIcon, UserCircleIcon } from './icons';

interface BottomNavProps {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
  betSlipCount: number;
}

const NavButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  badgeCount?: number;
}> = ({ label, icon, isActive, onClick, badgeCount = 0 }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-primary'}`}>
    <div className="relative">
      {icon}
      {badgeCount > 0 && (
        <span className="absolute -top-1 -right-2.5 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
          {badgeCount}
        </span>
      )}
    </div>
    <span className={`text-xs mt-1 ${isActive ? 'font-bold' : ''}`}>{label}</span>
  </button>
);

export const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, setActiveScreen, betSlipCount }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-dark-gray border-t border-gray-200 dark:border-gray-700 shadow-lg z-20">
      <div className="container mx-auto flex justify-around max-w-4xl">
        <NavButton
          label="Home"
          icon={<HomeIcon />}
          isActive={activeScreen === 'home'}
          onClick={() => setActiveScreen('home')}
        />
        <NavButton
          label="My Bets"
          icon={<ReceiptIcon />}
          isActive={activeScreen === 'bets'}
          onClick={() => setActiveScreen('bets')}
          badgeCount={betSlipCount}
        />
        <NavButton
          label="Wallet"
          icon={<CreditCardIcon />}
          isActive={activeScreen === 'wallet'}
          onClick={() => setActiveScreen('wallet')}
        />
        <NavButton
          label="Profile"
          icon={<UserCircleIcon />}
          isActive={activeScreen === 'profile'}
          onClick={() => setActiveScreen('profile')}
        />
      </div>
    </nav>
  );
};
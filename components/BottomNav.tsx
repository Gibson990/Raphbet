import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HomeIcon, ReceiptIcon, CreditCardIcon, UserCircleIcon } from './icons';

interface BottomNavProps {
  betSlipCount: number;
}

const NavButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  badgeCount?: number;
}> = ({ label, icon, isActive, onClick, badgeCount = 0 }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 
      ${isActive ? 'text-primary dark:text-primary' : 'text-gray-600 dark:text-gray-200 hover:text-primary dark:hover:text-primary'}
      hover:bg-gray-50 dark:hover:bg-neutral-dark/50 rounded-lg`}
  >
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

export const BottomNav: React.FC<BottomNavProps> = ({ betSlipCount }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-dark-gray border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 print:hidden w-full">
      <div className="container mx-auto px-4">
        <div className="flex justify-around items-center h-16 max-w-2xl mx-auto">
          <NavButton
            label="Home"
            icon={<HomeIcon />}
            isActive={currentPath === '/'}
            onClick={() => navigate('/')}
          />
          <NavButton
            label="My Bets"
            icon={<ReceiptIcon />}
            isActive={currentPath === '/bets'}
            onClick={() => navigate('/bets')}
            badgeCount={betSlipCount}
          />
          <NavButton
            label="Wallet"
            icon={<CreditCardIcon />}
            isActive={currentPath === '/wallet'}
            onClick={() => navigate('/wallet')}
          />
          <NavButton
            label="Profile"
            icon={<UserCircleIcon />}
            isActive={currentPath === '/profile'}
            onClick={() => navigate('/profile')}
          />
        </div>
      </div>
    </nav>
  );
};
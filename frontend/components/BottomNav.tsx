import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, ReceiptIcon, CreditCardIcon, UserCircleIcon, ChatBubbleIcon } from './icons';

interface BottomNavProps {
  betSlipCount: number;
}

const items = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true, badge: false },
  { to: '/bets', label: 'My Bets', icon: ReceiptIcon, end: false, badge: true },
  { to: '/wallet', label: 'Wallet', icon: CreditCardIcon, end: false, badge: false },
  { to: '/support', label: 'Support', icon: ChatBubbleIcon, end: false, badge: false },
  { to: '/profile', label: 'Profile', icon: UserCircleIcon, end: false, badge: false },
];

export const BottomNav: React.FC<BottomNavProps> = ({ betSlipCount }) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-dark-gray border-t border-gray-200 dark:border-neutral-border shadow-lg z-20">
      <div className="container mx-auto flex justify-around max-w-4xl">
        {items.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors ${
                isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-primary'
              }`
            }
          >
            <div className="relative">
              <Icon className="h-6 w-6" />
              {badge && betSlipCount > 0 && (
                <span className="absolute -top-1 -right-2.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-primary rounded-full">
                  {betSlipCount}
                </span>
              )}
            </div>
            <span className="text-xs mt-1">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

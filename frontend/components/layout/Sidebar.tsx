import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { HomeIcon, ReceiptIcon, CreditCardIcon, UserCircleIcon, ChatBubbleIcon, SunIcon, MoonIcon } from '../icons';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  betSlipCount: number;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const items = [
  { to: '/', label: 'Matches', icon: HomeIcon, end: true },
  { to: '/bets', label: 'My Bets', icon: ReceiptIcon, end: false },
  { to: '/wallet', label: 'Wallet', icon: CreditCardIcon, end: false },
  { to: '/profile', label: 'Profile', icon: UserCircleIcon, end: false },
  { to: '/support', label: 'Support', icon: ChatBubbleIcon, end: false },
];

/** Desktop-only left navigation rail (hidden on mobile, where BottomNav is used). */
export const Sidebar: React.FC<SidebarProps> = ({ betSlipCount, isDarkMode, toggleDarkMode }) => {
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-gray-200 dark:border-neutral-border bg-white dark:bg-neutral-dark-gray">
      <Link to="/" className="block px-6 py-5 active:scale-[0.98] transition-transform" aria-label="Home">
        <BrandLogo />
      </Link>

      <nav className="flex-1 px-3 space-y-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-dark-card'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
            {to === '/bets' && betSlipCount > 0 && (
              <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-primary rounded-full">
                {betSlipCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-neutral-border">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-dark-card transition-colors"
        >
          {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          <span>{isDarkMode ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
    </aside>
  );
};

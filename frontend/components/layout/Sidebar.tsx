import React from 'react';
import type { Screen } from '../../App';
import { HomeIcon, ReceiptIcon, CreditCardIcon, UserCircleIcon, SunIcon, MoonIcon } from '../icons';
import { BrandLogo } from './BrandLogo';

interface SidebarProps {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
  betSlipCount: number;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const items: { id: Screen; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
  { id: 'home', label: 'Matches', icon: HomeIcon },
  { id: 'bets', label: 'My Bets', icon: ReceiptIcon },
  { id: 'wallet', label: 'Wallet', icon: CreditCardIcon },
  { id: 'profile', label: 'Profile', icon: UserCircleIcon },
];

/** Desktop-only left navigation rail (hidden on mobile, where BottomNav is used). */
export const Sidebar: React.FC<SidebarProps> = ({ activeScreen, setActiveScreen, betSlipCount, isDarkMode, toggleDarkMode }) => {
  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-gray-200 dark:border-neutral-border bg-white dark:bg-neutral-dark-gray">
      <div className="px-6 py-5">
        <BrandLogo />
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {items.map(({ id, label, icon: Icon }) => {
          const active = activeScreen === id;
          return (
            <button
              key={id}
              onClick={() => setActiveScreen(id)}
              className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-dark-card'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
              {id === 'bets' && betSlipCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-primary rounded-full">
                  {betSlipCount}
                </span>
              )}
            </button>
          );
        })}
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

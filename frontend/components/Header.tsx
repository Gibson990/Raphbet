import React from 'react';
import { WalletIcon } from './icons';
import { BrandLogo } from './layout/BrandLogo';

interface HeaderProps {
  balance: number;
  onDeposit: () => void;
}

export const Header: React.FC<HeaderProps> = ({ balance, onDeposit }) => {
  return (
    <header className="bg-white/90 dark:bg-neutral-dark-gray/90 backdrop-blur border-b border-gray-200 dark:border-neutral-border sticky top-0 z-30">
      <div className="px-4 sm:px-6 h-16 flex justify-between items-center gap-3">
        {/* Brand shows only on mobile; on desktop the sidebar carries it */}
        <div className="lg:hidden">
          <BrandLogo size="sm" />
        </div>
        <div className="hidden lg:block text-sm font-semibold text-gray-400">FIFA World Cup 2026</div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-neutral-dark-card px-3 py-2 rounded-xl">
            <WalletIcon className="h-5 w-5 text-accent" />
            <span className="font-bold text-sm sm:text-base text-neutral-dark dark:text-white tabular-nums">
              {balance.toLocaleString('en-US')}
            </span>
            <span className="text-xs text-gray-400 font-medium">Tsh</span>
          </div>
          <button
            onClick={onDeposit}
            className="bg-primary hover:bg-primary-dark text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
          >
            Deposit
          </button>
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from './layout/BrandLogo';
import { CurrencySelect } from './CurrencySelect';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';

interface HeaderProps {
  balance: number;
  onDeposit: () => void;
}

export const Header: React.FC<HeaderProps> = ({ balance, onDeposit }) => {
  const { isLoggedIn } = useAuth();
  const { format } = useCurrency();
  const navigate = useNavigate();

  return (
    <header className="bg-white/90 dark:bg-neutral-dark-gray/90 backdrop-blur border-b border-gray-200 dark:border-neutral-border sticky top-0 z-30">
      <div className="px-4 sm:px-6 h-16 flex justify-between items-center gap-3">
        <div className="lg:hidden">
          <BrandLogo size="sm" />
        </div>
        <div className="hidden lg:block text-sm font-semibold text-gray-400">FIFA World Cup 2026</div>

        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <CurrencySelect />
          {isLoggedIn ? (
            <>
              <button onClick={onDeposit} className="flex items-center gap-1.5 bg-gray-100 dark:bg-neutral-dark-card pl-2.5 pr-2 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-dark transition-colors min-w-0" aria-label="Balance — tap to deposit">
                <span className="font-bold text-xs sm:text-sm text-neutral-dark dark:text-white tabular-nums whitespace-nowrap truncate">{format(balance)}</span>
              </button>
              <button onClick={onDeposit} className="bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors whitespace-nowrap">
                Deposit
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className="text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-dark-card transition-colors">
                Log in
              </button>
              <button onClick={() => navigate('/login')} className="bg-primary hover:bg-primary-dark text-white text-sm font-bold px-3 sm:px-4 py-2 rounded-xl transition-colors">
                Register
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

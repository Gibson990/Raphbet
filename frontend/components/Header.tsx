import React from 'react';
import { SoccerBallIcon, WalletIcon } from './icons';

interface HeaderProps {
  balance: number;
}

export const Header: React.FC<HeaderProps> = ({ balance }) => {
  return (
    <header className="bg-white dark:bg-neutral-dark-gray shadow-md sticky top-0 z-30">
      <div className="container mx-auto max-w-4xl px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <SoccerBallIcon className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-neutral-dark dark:text-neutral-light tracking-wider">
            Raph <span className="text-primary">Bet</span>
          </h1>
        </div>
        <div className="flex items-center space-x-2 bg-neutral-light-gray dark:bg-neutral-gray p-2 rounded-lg">
          <WalletIcon className="h-6 w-6 text-accent" />
          <span className="text-neutral-dark dark:text-neutral-light font-semibold text-lg">
            {balance.toLocaleString('en-US')} Tsh
          </span>
        </div>
      </div>
    </header>
  );
};
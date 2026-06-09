import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { BottomNav } from '../BottomNav';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import type { AppOutletContext } from '../../hooks/useAppOutlet';

/** The authenticated app chrome: desktop sidebar, header, mobile bottom-nav.
 *  Shared app data is forwarded to the routed screens via the Outlet context. */
export const AppLayout: React.FC<{ ctx: AppOutletContext }> = ({ ctx }) => {
  const navigate = useNavigate();
  const { wallet, isDarkMode, toggleDarkMode } = ctx;
  const betSlipCount = wallet.betSlip.length;

  return (
    <div className="min-h-screen bg-neutral-light-gray dark:bg-neutral-dark text-neutral-dark dark:text-neutral-light-gray font-sans overflow-x-clip">
      <div className="lg:flex">
        <Sidebar betSlipCount={betSlipCount} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
        <div className="flex-1 min-w-0">
          <Header balance={wallet.balance} onDeposit={() => navigate('/wallet')} />
          <main className="px-4 sm:px-6 py-5 max-w-6xl mx-auto w-full">
            <Outlet context={ctx} />
          </main>
          <Footer />
          <div className="h-16 lg:hidden" aria-hidden="true" />
        </div>
      </div>
      <BottomNav betSlipCount={betSlipCount} />
    </div>
  );
};

import React, { useState } from 'react';
import { UseVirtualWalletReturn } from '../hooks/useVirtualWallet';
import { ChevronUpIcon, ChevronDownIcon } from '../components/icons';
import type { Transaction } from '../types';
import { ToastMessage } from '../App';
import TopUpModal from '../components/wallet/TopUpModal';
import WithdrawModal from '../components/wallet/WithdrawModal';

interface WalletScreenProps {
  wallet: UseVirtualWalletReturn;
  addToast: (message: string, type: ToastMessage['type']) => void;
}

const TransactionRow: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
  const isCredit = transaction.type === 'Payout' || transaction.type === 'Top-up';
  
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-full ${isCredit ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
            {isCredit ? <ChevronUpIcon className="h-5 w-5 text-green-500" /> : <ChevronDownIcon className="h-5 w-5 text-red-500" />}
        </div>
        <div>
            <p className="font-semibold text-sm">{transaction.description}</p>
            <p className="text-xs text-gray-500 dark:text-white/70">{new Date(transaction.date).toLocaleString()}</p>
        </div>
      </div>
      <p className={`font-bold text-sm ${isCredit ? 'text-green-500' : 'text-red-500'}`}>
        {isCredit ? '+' : ''}{transaction.amount.toLocaleString('en-US')} Tsh
      </p>
    </div>
  );
}

const WalletScreen: React.FC<WalletScreenProps> = ({ wallet, addToast }) => {
  const { balance, transactions, topUpWallet, withdrawFromWallet } = wallet;
  const [isTopUpOpen, setTopUpOpen] = useState(false);
  const [isWithdrawOpen, setWithdrawOpen] = useState(false);

  return (
    <>
      <div className="py-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Wallet</h1>

        <div className="bg-gradient-to-br from-primary to-accent text-white p-6 rounded-xl shadow-lg mb-6">
          <p className="text-lg opacity-80">Virtual Balance</p>
          <p className="text-4xl font-bold tracking-tight">
              {balance.toLocaleString('en-US')} Tsh
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
            <button onClick={() => setTopUpOpen(true)} className="bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2">
                <ChevronUpIcon />
                <span>Top Up</span>
            </button>
            <button onClick={() => setWithdrawOpen(true)} className="bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2">
                <ChevronDownIcon />
                <span>Withdraw</span>
            </button>
        </div>


        <div>
          <h2 className="text-xl font-bold mb-3">Recent Transactions</h2>
          <div className="bg-white dark:bg-neutral-dark-gray rounded-xl shadow-lg p-2 sm:p-4">
              {transactions.length > 0 ? (
                  <div>
                      {transactions.map(t => <TransactionRow key={t.id} transaction={t} />)}
                  </div>
              ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                      <p>No transactions yet.</p>
                  </div>
              )}
          </div>
        </div>
      </div>
      <TopUpModal isOpen={isTopUpOpen} onClose={() => setTopUpOpen(false)} onTopUp={topUpWallet} addToast={addToast} />
      <WithdrawModal isOpen={isWithdrawOpen} onClose={() => setWithdrawOpen(false)} onWithdraw={withdrawFromWallet} addToast={addToast} balance={balance} />
    </>
  );
};

export default WalletScreen;
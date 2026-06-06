import React, { useState } from 'react';
import { ChevronUpIcon, ChevronDownIcon, WalletIcon } from '../components/icons';
import { MpesaIcon, AirtelMoneyIcon, StripeIcon } from '../components/icons';
import type { Transaction } from '../types';
import { useAppOutlet } from '../hooks/useAppOutlet';
import { useCurrency } from '../contexts/CurrencyContext';
import { CurrencySelect } from '../components/CurrencySelect';
import TopUpModal from '../components/wallet/TopUpModal';
import WithdrawModal from '../components/wallet/WithdrawModal';

const TransactionRow: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
  const { format } = useCurrency();
  const isCredit = transaction.type === 'Payout' || transaction.type === 'Top-up';
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-neutral-border last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`p-2 rounded-full shrink-0 ${isCredit ? 'bg-success/10' : 'bg-danger/10'}`}>
          {isCredit ? <ChevronUpIcon className="h-4 w-4 text-success" /> : <ChevronDownIcon className="h-4 w-4 text-danger" />}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{transaction.description}</p>
          <p className="text-xs text-gray-400">{new Date(transaction.date).toLocaleString()}</p>
        </div>
      </div>
      <p className={`font-bold text-sm tabular-nums shrink-0 ${isCredit ? 'text-success' : 'text-danger'}`}>
        {isCredit ? '+' : ''}{format(transaction.amount)}
      </p>
    </div>
  );
};

const WalletScreen: React.FC = () => {
  const { wallet, addToast } = useAppOutlet();
  const { format } = useCurrency();
  const { balance, transactions, topUpWallet, withdrawFromWallet } = wallet;
  const [isTopUpOpen, setTopUpOpen] = useState(false);
  const [isWithdrawOpen, setWithdrawOpen] = useState(false);

  return (
    <>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl sm:text-3xl font-extrabold">Wallet</h1>
          <CurrencySelect />
        </div>

        {/* Balance card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent text-white p-6 rounded-2xl shadow-lg">
          <div className="absolute -right-8 -top-8 opacity-20">
            <WalletIcon className="h-40 w-40" />
          </div>
          <p className="text-sm font-medium opacity-90">Available balance</p>
          <p className="text-4xl font-extrabold tracking-tight mt-1 tabular-nums">{format(balance)}</p>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button onClick={() => setTopUpOpen(true)} className="bg-white text-primary font-bold py-2.5 rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
              <ChevronUpIcon className="h-5 w-5" /> Top Up
            </button>
            <button onClick={() => setWithdrawOpen(true)} className="bg-black/20 text-white font-bold py-2.5 rounded-xl hover:bg-black/30 transition-colors flex items-center justify-center gap-2">
              <ChevronDownIcon className="h-5 w-5" /> Withdraw
            </button>
          </div>
        </div>

        {/* Accepted methods */}
        <div className="mt-5 bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-3">We accept</p>
          <div className="flex flex-wrap items-center gap-3">
            <MpesaIcon />
            <AirtelMoneyIcon />
            <StripeIcon />
            <div className="flex items-center justify-center h-8 px-3 bg-amber-500 rounded-md">
              <span className="text-white font-extrabold text-sm">Crypto</span>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-3">Recent transactions</h2>
          <div className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl p-2 sm:p-4">
            {transactions.length > 0 ? (
              transactions.map(t => <TransactionRow key={t.id} transaction={t} />)
            ) : (
              <div className="text-center text-gray-400 py-12">
                <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-neutral-dark flex items-center justify-center mx-auto mb-3">
                  <WalletIcon className="h-6 w-6 text-gray-400" />
                </div>
                <p className="font-semibold text-gray-600 dark:text-gray-300">No transactions yet</p>
                <p className="text-sm">Top up your wallet to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {isTopUpOpen && <TopUpModal onClose={() => setTopUpOpen(false)} onTopUp={topUpWallet} addToast={addToast} />}
      {isWithdrawOpen && <WithdrawModal onClose={() => setWithdrawOpen(false)} onWithdraw={withdrawFromWallet} addToast={addToast} balance={balance} />}
    </>
  );
};

export default WalletScreen;

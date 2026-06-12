import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronUpIcon, ChevronDownIcon, WalletIcon, LockIcon, EyeIcon, EyeSlashIcon, ClockIcon, TicketIcon } from '../components/icons';
import type { Transaction } from '../types';
import { useAppOutlet } from '../hooks/useAppOutlet';
import { useCurrency } from '../contexts/CurrencyContext';
import { CurrencySelect } from '../components/CurrencySelect';
import TopUpModal from '../components/wallet/TopUpModal';
import WithdrawModal from '../components/wallet/WithdrawModal';
import { downloadTransactionReceipt } from '../services/receipt';
import { fetchWithdrawals, type Withdrawal } from '../services/wallet';
import { useAuth } from '../contexts/AuthContext';

const CryptoBadge: React.FC<{ label: string }> = ({ label }) => (
  <div className="h-9 inline-flex items-center justify-center rounded-lg px-3 font-bold text-xs bg-gray-100 dark:bg-neutral-dark border border-gray-200 dark:border-neutral-border">
    {label}
  </div>
);

const usdt = (cents: number) => (cents / 100).toFixed(2);

const HIDDEN = '••••••';

type TxFilter = 'all' | 'deposits' | 'withdrawals' | 'wagers' | 'payouts';

const TX_FILTERS: { key: TxFilter; label: string; types: Transaction['type'][] }[] = [
  { key: 'all', label: 'All', types: ['Wager', 'Payout', 'Top-up', 'Withdrawal'] },
  { key: 'deposits', label: 'Deposits', types: ['Top-up'] },
  { key: 'payouts', label: 'Payouts', types: ['Payout'] },
  { key: 'wagers', label: 'Wagers', types: ['Wager'] },
  { key: 'withdrawals', label: 'Withdrawals', types: ['Withdrawal'] },
];

const WithdrawalStatusBadge: React.FC<{ status: Withdrawal['status'] }> = ({ status }) => {
  const map = {
    PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    PAID: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  } as const;
  const label = { PENDING: 'Pending review', PAID: 'Paid', REJECTED: 'Rejected' }[status];
  return <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${map[status]}`}>{label}</span>;
};

const StatTile: React.FC<{ icon: React.ReactNode; label: string; value: string; hint?: string }> = ({ icon, label, value, hint }) => (
  <div className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 min-w-0 text-center sm:text-left" title={hint}>
    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary hidden sm:flex items-center justify-center shrink-0">{icon}</div>
    <div className="min-w-0 w-full">
      <p className="text-sm font-extrabold tabular-nums truncate">{value}</p>
      <p className="text-[10px] sm:text-[11px] text-gray-400 font-semibold uppercase truncate">{label}</p>
    </div>
  </div>
);

const TransactionRow: React.FC<{ transaction: Transaction; hidden: boolean; playerName?: string; onDownloadFail: () => void }> = ({ transaction, hidden, playerName, onDownloadFail }) => {
  const { format } = useCurrency();
  const isCredit = transaction.type === 'Payout' || transaction.type === 'Top-up';
  const download = () => { if (!downloadTransactionReceipt(transaction, format, playerName)) onDownloadFail(); };
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-neutral-border last:border-b-0 group">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`p-2 rounded-full shrink-0 ${isCredit ? 'bg-success/10' : 'bg-danger/10'}`}>
          {isCredit ? <ChevronUpIcon className="h-4 w-4 text-success" /> : <ChevronDownIcon className="h-4 w-4 text-danger" />}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{transaction.description}</p>
          <p className="text-xs text-gray-400">{new Date(transaction.date).toLocaleString()}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <p className={`font-bold text-sm tabular-nums ${isCredit ? 'text-success' : 'text-danger'}`}>
          {hidden ? HIDDEN : <>{isCredit ? '+' : '−'}{format(transaction.amount)}</>}
        </p>
        <button
          onClick={download}
          title="Download receipt"
          aria-label="Download receipt"
          className="text-gray-300 dark:text-gray-600 hover:text-primary transition-colors p-1 opacity-60 group-hover:opacity-100"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const WalletScreen: React.FC = () => {
  const { wallet, addToast } = useAppOutlet();
  const { user } = useAuth();
  const { format, code } = useCurrency();
  const { balance, transactions, placedBets, topUpWallet, withdrawFromWallet } = wallet;
  const [isTopUpOpen, setTopUpOpen] = useState(false);
  const [isWithdrawOpen, setWithdrawOpen] = useState(false);
  const [visibleTx, setVisibleTx] = useState(8);
  const [txFilter, setTxFilter] = useState<TxFilter>('all');
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [hidden, setHidden] = useState(() => localStorage.getItem('raphbet.hideBalance') === '1');

  const toggleHidden = () => {
    setHidden(h => {
      localStorage.setItem('raphbet.hideBalance', h ? '0' : '1');
      return !h;
    });
  };

  const loadWithdrawals = useCallback(() => {
    fetchWithdrawals()
      .then(w => setWithdrawals((w ?? []).sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())))
      .catch(() => { /* keep whatever we have */ });
  }, []);

  useEffect(() => { loadWithdrawals(); }, [loadWithdrawals]);

  // In play: stakes currently riding on open bets. Pending payout: withdrawals held for review.
  const inPlay = useMemo(() => placedBets.filter(b => b.status === 'PENDING').reduce((s, b) => s + b.wager, 0), [placedBets]);
  const pendingWithdrawal = useMemo(() => withdrawals.filter(w => w.status === 'PENDING').reduce((s, w) => s + w.amount, 0), [withdrawals]);
  const totalDeposited = useMemo(() => transactions.filter(t => t.type === 'Top-up').reduce((s, t) => s + t.amount, 0), [transactions]);

  const filteredTx = useMemo(() => {
    const types = TX_FILTERS.find(f => f.key === txFilter)!.types;
    return transactions.filter(t => types.includes(t.type));
  }, [transactions, txFilter]);

  const setFilter = (f: TxFilter) => { setTxFilter(f); setVisibleTx(8); };

  const money = (cents: number) => (hidden ? HIDDEN : format(cents));

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium opacity-90">Available balance</p>
              <button
                onClick={toggleHidden}
                aria-label={hidden ? 'Show balance' : 'Hide balance'}
                title={hidden ? 'Show balance' : 'Hide balance'}
                className="text-white/70 hover:text-white transition-colors"
              >
                {hidden ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
              </button>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wide">
              <LockIcon className="h-3 w-3" /> USDT
            </span>
          </div>
          <p className="text-4xl font-extrabold tracking-tight mt-1 tabular-nums">{money(balance)}</p>
          {!hidden && code !== 'USDT' && code !== 'USD' && (
            <p className="text-xs text-white/70 mt-1">≈ {usdt(balance)} USDT</p>
          )}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button onClick={() => setTopUpOpen(true)} className="bg-white text-primary font-bold py-2.5 rounded-xl hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
              <ChevronUpIcon className="h-5 w-5" /> Top Up
            </button>
            <button onClick={() => setWithdrawOpen(true)} className="bg-black/20 text-white font-bold py-2.5 rounded-xl hover:bg-black/30 transition-colors flex items-center justify-center gap-2">
              <ChevronDownIcon className="h-5 w-5" /> Withdraw
            </button>
          </div>
        </div>

        {/* At-a-glance stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <StatTile icon={<TicketIcon className="h-5 w-5" />} label="In play" value={money(inPlay)} hint="Stakes on open bets" />
          <StatTile icon={<ClockIcon className="h-5 w-5" />} label="Withdrawing" value={money(pendingWithdrawal)} hint="Withdrawals pending review" />
          <StatTile icon={<ChevronUpIcon className="h-5 w-5" />} label="Deposited" value={money(totalDeposited)} hint="Lifetime deposits" />
        </div>

        {/* Withdrawal requests */}
        {withdrawals.length > 0 && (
          <div className="mt-5">
            <h2 className="text-lg font-bold mb-3">Withdrawal requests</h2>
            <div className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl p-2 sm:p-4">
              {withdrawals.slice(0, 5).map(w => (
                <div key={w.id} className="py-3 border-b border-gray-100 dark:border-neutral-border last:border-b-0">
                  <div className="flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm tabular-nums">{money(w.amount)}</p>
                      <p className="text-xs text-gray-400 truncate">
                        To <span className="font-mono">{w.address.slice(0, 6)}…{w.address.slice(-4)}</span> · {new Date(w.createdDate).toLocaleString()}
                      </p>
                    </div>
                    <WithdrawalStatusBadge status={w.status} />
                  </div>
                  {w.status === 'REJECTED' && (
                    <div className="mt-2 text-xs bg-danger/5 border border-danger/20 rounded-lg px-3 py-2 text-gray-600 dark:text-gray-300">
                      {w.note && w.note !== 'rejected by admin' && <p className="font-semibold text-danger">{w.note}</p>}
                      <p className={w.note && w.note !== 'rejected by admin' ? 'mt-0.5' : ''}>
                        The funds were returned to your balance — you can submit a new withdrawal request.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accepted methods */}
        <div className="mt-5 bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase">We accept crypto</p>
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
              <LockIcon className="h-3.5 w-3.5" /> Secured
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="h-9 inline-flex items-center justify-center rounded-lg px-3 font-extrabold text-xs text-white bg-[#26A17B]">USDT</div>
            <div className="h-9 inline-flex items-center justify-center rounded-lg px-3 font-extrabold text-xs text-white bg-[#F7931A]">₿ BTC</div>
            <div className="h-9 inline-flex items-center justify-center rounded-lg px-3 font-extrabold text-xs text-white bg-[#627EEA]">ETH</div>
            <CryptoBadge label="+200 coins" />
          </div>
        </div>

        {/* Transactions */}
        <div className="mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h2 className="text-lg font-bold">Recent transactions</h2>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              {TX_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap border transition-colors ${
                    txFilter === f.key
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white dark:bg-neutral-dark-gray border-gray-200 dark:border-neutral-border text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl p-2 sm:p-4">
            {filteredTx.length > 0 ? (
              <>
                {filteredTx.slice(0, visibleTx).map(t => (
                  <TransactionRow
                    key={t.id}
                    transaction={t}
                    hidden={hidden}
                    playerName={user?.name}
                    onDownloadFail={() => addToast('Could not generate the receipt. Please try again.', 'error')}
                  />
                ))}
                {filteredTx.length > visibleTx && (
                  <button onClick={() => setVisibleTx(v => v + 8)} className="w-full mt-2 py-2 text-sm font-semibold text-primary hover:underline">
                    Show more ({filteredTx.length - visibleTx})
                  </button>
                )}
              </>
            ) : (
              <div className="text-center text-gray-400 py-12">
                <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-neutral-dark flex items-center justify-center mx-auto mb-3">
                  <WalletIcon className="h-6 w-6 text-gray-400" />
                </div>
                {txFilter === 'all' ? (
                  <>
                    <p className="font-semibold text-gray-600 dark:text-gray-300">No transactions yet</p>
                    <p className="text-sm">Top up your wallet to get started.</p>
                  </>
                ) : (
                  <p className="font-semibold text-gray-600 dark:text-gray-300">No {TX_FILTERS.find(f => f.key === txFilter)!.label.toLowerCase()} yet</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {isTopUpOpen && <TopUpModal onClose={() => setTopUpOpen(false)} onTopUp={topUpWallet} addToast={addToast} />}
      {isWithdrawOpen && (
        <WithdrawModal
          onClose={() => { setWithdrawOpen(false); loadWithdrawals(); }}
          onWithdraw={withdrawFromWallet}
          addToast={addToast}
          balance={balance}
        />
      )}
    </>
  );
};

export default WalletScreen;

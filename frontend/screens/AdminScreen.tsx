import React, { useState, useEffect, useCallback } from 'react';
import { BrandLogo } from '../components/layout/BrandLogo';
import {
  getAdminKey, setAdminKey, clearAdminKey,
  fetchAdminStats, fetchAdminUsers, fetchAdminBets, fetchAdminWithdrawals,
  approveWithdrawal, rejectWithdrawal,
  type AdminStats, type AdminUser, type AdminBet, type AdminWithdrawal,
} from '../services/admin';

const tzs = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shortId = (s: string) => (s.length > 10 ? s.slice(0, 8) + '…' : s);

const StatCard: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
  <div className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl p-4">
    <p className="text-xs font-semibold text-gray-400 uppercase">{label}</p>
    <p className={`text-2xl font-extrabold mt-1 tabular-nums ${accent ?? ''}`}>{value}</p>
  </div>
);

const StatusBadge: React.FC<{ status: AdminBet['status'] }> = ({ status }) => {
  const map = {
    PENDING: 'bg-amber-500/10 text-amber-600',
    WON: 'bg-success/10 text-success',
    LOST: 'bg-danger/10 text-danger',
  } as const;
  return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${map[status]}`}>{status}</span>;
};

const AdminScreen: React.FC = () => {
  const [key, setKey] = useState(getAdminKey());
  const [authed, setAuthed] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'users' | 'bets' | 'withdrawals'>('overview');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [bets, setBets] = useState<AdminBet[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);

  const load = useCallback(async (k: string) => {
    const [s, u, b, wd] = await Promise.all([fetchAdminStats(k), fetchAdminUsers(k), fetchAdminBets(k), fetchAdminWithdrawals(k)]);
    setStats(s); setUsers(u); setBets(b); setWithdrawals(wd);
  }, []);

  const decide = async (id: string, action: 'approve' | 'reject') => {
    try {
      await (action === 'approve' ? approveWithdrawal(key, id) : rejectWithdrawal(key, id));
      await load(key);
    } catch { /* ignore */ }
  };

  // Try the stored key on mount.
  useEffect(() => {
    if (key) {
      load(key).then(() => setAuthed(true)).catch(() => { clearAdminKey(); setKey(''); });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh while authed.
  useEffect(() => {
    if (!authed) return;
    const t = setInterval(() => load(key).catch(() => {}), 15000);
    return () => clearInterval(t);
  }, [authed, key, load]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await load(passcode);
      setAdminKey(passcode);
      setKey(passcode);
      setAuthed(true);
    } catch {
      setError('Invalid admin passcode.');
    }
  };

  const logout = () => { clearAdminKey(); setKey(''); setAuthed(false); setStats(null); };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-light-gray dark:bg-neutral-dark p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl p-7">
          <div className="flex justify-center mb-5"><BrandLogo /></div>
          <h1 className="text-xl font-extrabold text-center">Admin Dashboard</h1>
          <p className="text-sm text-gray-400 text-center mb-5">Enter your admin passcode</p>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Admin passcode"
            className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-neutral-border rounded-xl bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {error && <p className="text-danger text-sm mt-2">{error}</p>}
          <button type="submit" className="w-full mt-4 bg-primary hover:bg-primary-dark text-white font-bold py-2.5 rounded-xl transition-colors">
            Sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-light-gray dark:bg-neutral-dark text-neutral-dark dark:text-neutral-light-gray">
      <header className="bg-white dark:bg-neutral-dark-gray border-b border-gray-200 dark:border-neutral-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <span className="text-sm font-bold text-gray-400">Admin</span>
          </div>
          <button onClick={logout} className="text-sm font-semibold text-gray-500 hover:text-danger">Sign out</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-neutral-border mb-5">
          {(['overview', 'users', 'bets', 'withdrawals'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-2.5 px-4 text-sm font-bold capitalize ${tab === t ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}>
              {t}{t === 'withdrawals' && withdrawals.length > 0 ? ` (${withdrawals.length})` : ''}
            </button>
          ))}
        </div>

        {tab === 'overview' && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Users" value={stats.users.toLocaleString()} />
            <StatCard label="Total staked" value={tzs(stats.totalStaked)} />
            <StatCard label="Total payouts" value={tzs(stats.totalPayouts)} />
            <StatCard label="Gross revenue (GGR)" value={tzs(stats.ggr)} accent={stats.ggr >= 0 ? 'text-success' : 'text-danger'} />
            <StatCard label="Deposits" value={tzs(stats.deposits)} />
            <StatCard label="Withdrawals" value={tzs(stats.withdrawals)} />
            <StatCard label="Wallet liability" value={tzs(stats.totalBalance)} />
            <StatCard label="Bets (P / W / L)" value={`${stats.betsPending} / ${stats.betsWon} / ${stats.betsLost}`} />
          </div>
        )}

        {tab === 'users' && (
          <div className="overflow-x-auto bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-gray-400 border-b border-gray-200 dark:border-neutral-border">
                <tr>
                  <th className="px-4 py-3">User (device)</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-center">KYC</th>
                  <th className="px-4 py-3 text-right">Staked</th>
                  <th className="px-4 py-3 text-right">Bets</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.deviceId} className="border-b border-gray-100 dark:border-neutral-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{shortId(u.deviceId)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{tzs(u.balance)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${u.verified ? 'bg-success/10 text-success' : 'bg-amber-500/10 text-amber-600'}`}>
                        {u.verified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{tzs(u.totalStaked)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.bets}</td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-8">No users yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'bets' && (
          <div className="overflow-x-auto bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-gray-400 border-b border-gray-200 dark:border-neutral-border">
                <tr>
                  <th className="px-4 py-3">Match</th>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-4 py-3 text-right">Stake</th>
                  <th className="px-4 py-3 text-right">Odds</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Payout</th>
                </tr>
              </thead>
              <tbody>
                {bets.map((b) => (
                  <tr key={b.id} className="border-b border-gray-100 dark:border-neutral-border last:border-0">
                    <td className="px-4 py-3">{b.match}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{b.market}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{tzs(b.wager)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{b.odds.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3 text-right tabular-nums">{b.payout ? tzs(b.payout) : '—'}</td>
                  </tr>
                ))}
                {bets.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-8">No bets yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'withdrawals' && (
          <div className="overflow-x-auto bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-gray-400 border-b border-gray-200 dark:border-neutral-border">
                <tr>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((wd) => (
                  <tr key={wd.id} className="border-b border-gray-100 dark:border-neutral-border last:border-0">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(wd.createdDate).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-xs break-all">{wd.address}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{tzs(wd.amount)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => decide(wd.id, 'approve')} className="text-xs font-bold text-success hover:underline mr-3">Approve</button>
                      <button onClick={() => decide(wd.id, 'reject')} className="text-xs font-bold text-danger hover:underline">Reject</button>
                    </td>
                  </tr>
                ))}
                {withdrawals.length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-8">No pending withdrawals.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminScreen;

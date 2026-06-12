import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/layout/BrandLogo';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import {
  Users as UsersIcon,
  Landmark as MoneyIcon,
  TrendingUp as StakedIcon,
  TrendingDown as PayoutIcon,
  ArrowUpRight as DepositIcon,
  ArrowDownLeft as WithdrawalIcon,
  ShieldCheck as LiabilityIcon,
  FileCheck as BetsIcon,
  RefreshCw,
  Sliders,
  Settings,
  User as UserIcon,
  Lock,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  X as XIcon,
  Download,
  FileText as ReceiptIcon,
  Activity,
  Wallet,
  BarChart3,
  Percent,
  CircleDollarSign,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Zap,
  Clock,
  Ticket,
  MessageSquare,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
  Scale
} from 'lucide-react';
import {
  fetchAdminStats, fetchAdminUsers, fetchAdminBets, fetchAdminWithdrawals,
  approveWithdrawal, rejectWithdrawal,
  adjustUserBalance, setUserKyc, setUserSuspended, deleteUserAccount,
  fetchAdminConfig, saveAdminConfig, fetchUserWallet, settleBet,
  type AdminStats, type AdminUser, type AdminBet, type AdminWithdrawal, type AdminConfig, type AdminUserWallet, type DailyStat
} from '../services/admin';
import {
  fetchAllTickets, adminReplyTicket, adminCloseTicket,
  type SupportTicket,
} from '../services/support';

// ─── KPI Stat Card (redesigned) ───────────────────────────────────────────────
const StatCard: React.FC<{
  label: string;
  value: string;
  accent?: string;
  sub?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ label, value, accent, sub, icon, iconBg = 'bg-primary/10', iconColor = 'text-primary', trend }) => (
  <div className="group relative overflow-hidden bg-white dark:bg-neutral-dark-gray rounded-2xl border border-gray-100 dark:border-neutral-border/40 p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/8 hover:-translate-y-0.5 hover:border-primary/20">
    {/* Animated corner accent */}
    <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-[0.04] group-hover:opacity-[0.08] group-hover:scale-125 transition-all duration-500" style={{ background: 'currentColor' }} />
    <div className="absolute right-0 bottom-0 w-32 h-16 bg-gradient-to-tl from-gray-50 dark:from-neutral-dark/50 to-transparent rounded-tl-[40px] opacity-60" />

    <div className="relative flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide leading-tight">{label}</p>
        <p className={`text-[20px] font-bold mt-2 tabular-nums tracking-tight leading-none ${accent ?? 'text-neutral-dark dark:text-white'}`}>{value}</p>
        {sub && (
          <div className="flex items-center gap-1.5 mt-2.5">
            {trend === 'up' && <ArrowUp className="w-3 h-3 text-success" />}
            {trend === 'down' && <ArrowDown className="w-3 h-3 text-danger" />}
            <p className={`text-[10px] font-semibold ${trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-gray-400 dark:text-gray-500'}`}>{sub}</p>
          </div>
        )}
      </div>
      {icon && (
        <div className={`p-2.5 rounded-xl ${iconBg} ${iconColor} shrink-0 transition-all duration-300 group-hover:scale-110`}>
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<{ strokeWidth?: number; className?: string }>, { strokeWidth: 1.75, className: 'w-5 h-5' })
            : icon}
        </div>
      )}
    </div>
  </div>
);

// ─── Status badge for bets ────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: AdminBet['status'] }> = ({ status }) => {
  const map = {
    PENDING: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    WON: 'bg-success/10 text-success border border-success/20',
    LOST: 'bg-danger/10 text-danger border border-danger/20',
  } as const;
  return <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${map[status]}`}>{status}</span>;
};

// ─── Revenue Chart ────────────────────────────────────────────────────────────
const CHART_RANGES = [7, 14, 30, 90] as const;
type ChartRange = (typeof CHART_RANGES)[number];
type SeriesKey = 'wagers' | 'payouts' | 'ggr';

const RevenueChart: React.FC<{
  daily: DailyStat[];
  range: ChartRange;
  onRangeChange: (d: ChartRange) => void;
  rangeLoading?: boolean;
}> = ({ daily, range, onRangeChange, rangeLoading }) => {
  const { format: formatVal } = useCurrency();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Set<SeriesKey>>(new Set());

  const lines = [
    { key: 'wagers' as const, color: '#FF6B35', label: 'Wagers' },
    { key: 'payouts' as const, color: '#8B5CF6', label: 'Payouts' },
    { key: 'ggr' as const, color: '#10B981', label: 'GGR' },
  ];
  const visibleLines = lines.filter(l => !hiddenSeries.has(l.key));

  const toggleSeries = (key: SeriesKey) =>
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < lines.length - 1) next.add(key); // keep at least one visible
      return next;
    });

  const rangeChips = (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-neutral-dark rounded-lg p-0.5">
      {CHART_RANGES.map(d => (
        <button
          key={d}
          onClick={() => onRangeChange(d)}
          className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${
            range === d ? 'bg-white dark:bg-neutral-dark-card text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          {d}D
        </button>
      ))}
    </div>
  );

  const header = (
    <div className="px-6 pt-5 pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold dark:text-white tracking-tight">Revenue & Stake Trends</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Last {range} days{rangeLoading ? ' · loading…' : ''}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-3.5">
          {lines.map(l => {
            const off = hiddenSeries.has(l.key);
            return (
              <button
                key={l.key}
                onClick={() => toggleSeries(l.key)}
                title={off ? `Show ${l.label}` : `Hide ${l.label}`}
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-opacity ${off ? 'opacity-35 line-through' : ''} text-gray-500 dark:text-gray-400 hover:opacity-100`}
              >
                <span className="w-3 h-[3px] rounded-full" style={{ background: l.color }} />
                {l.label}
              </button>
            );
          })}
        </div>
        {rangeChips}
      </div>
    </div>
  );

  if (!daily || daily.length === 0) return (
    <div className="w-full bg-white dark:bg-neutral-dark-gray border border-gray-100 dark:border-neutral-border/40 rounded-2xl overflow-hidden">
      {header}
      <div className="p-8 flex flex-col items-center justify-center h-44 gap-3">
        <BarChart3 className="w-10 h-10 text-gray-200 dark:text-neutral-border" />
        <p className="text-xs text-gray-400 font-medium">No betting activity in this period yet.</p>
      </div>
    </div>
  );

  const height = 220;
  const width = 560;
  const padL = 50;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const n = daily.length;

  // With long ranges every point/label can't be drawn; thin them out so the
  // chart stays legible no matter how much data comes back.
  const dense = n > 16;
  const labelStep = Math.max(1, Math.ceil(n / 8));
  const hitW = chartW / Math.max(n - 1, 1);

  const maxVal = Math.max(...daily.map(d => Math.max(
    hiddenSeries.has('wagers') ? 0 : d.wagers,
    hiddenSeries.has('payouts') ? 0 : d.payouts,
    hiddenSeries.has('ggr') ? 0 : Math.abs(d.ggr),
    1,
  ))) * 1.1;

  const getX = (i: number) => padL + (i * chartW) / Math.max(n - 1, 1);
  const getY = (val: number) => padT + chartH - (val * chartH) / maxVal;

  // Smooth cubic-bezier path generator
  const getSmoothPath = (key: SeriesKey) => {
    const pts = daily.map((d, i) => ({ x: getX(i), y: getY(Math.max(d[key], 0)) }));
    if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y}`;
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2;
      path += ` C ${cpx} ${pts[i - 1].y}, ${cpx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
    }
    return path;
  };

  const getAreaPath = (key: SeriesKey) =>
    `${getSmoothPath(key)} L ${getX(n - 1)} ${padT + chartH} L ${getX(0)} ${padT + chartH} Z`;

  const yTicks = 4;

  return (
    <div className="w-full bg-white dark:bg-neutral-dark-gray border border-gray-100 dark:border-neutral-border/40 rounded-2xl overflow-hidden">
      {header}

      {/* Chart */}
      <div className="px-4 pb-3 relative" onMouseLeave={() => setHoveredIdx(null)}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ minHeight: 200 }}>
          <defs>
            <linearGradient id="area-wagers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#FF6B35" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="area-payouts" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="area-ggr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Y-axis grid */}
          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const y = padT + (i * chartH) / yTicks;
            const val = maxVal * (1 - i / yTicks);
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="currentColor" className="text-gray-100 dark:text-neutral-border/25" strokeWidth="0.6" />
                <text x={padL - 8} y={y + 3} textAnchor="end" className="fill-gray-400 dark:fill-gray-600 select-none" fontSize="8.5" fontWeight="500">
                  {/* Compact tick labels so the axis stays readable at any scale (k / m / b). */}
                  {val >= 1e9 ? `${(val / 1e9).toFixed(1)}b` : val >= 1e6 ? `${(val / 1e6).toFixed(1)}m` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val >= 1 ? val.toFixed(0) : '0'}
                </text>
              </g>
            );
          })}

          {/* X-axis dates (thinned when the range is long) */}
          {daily.map((d, i) => (
            (i % labelStep === 0 || i === n - 1) && (
              <text key={i} x={getX(i)} y={height - 10} textAnchor="middle" className="fill-gray-400 dark:fill-gray-600 select-none" fontSize="8.5" fontWeight="500">
                {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            )
          ))}

          {/* Area fills + lines for visible series */}
          {visibleLines.map(l => <path key={`a-${l.key}`} d={getAreaPath(l.key)} fill={`url(#area-${l.key})`} />)}
          {visibleLines.map(l => (
            <path key={l.key} d={getSmoothPath(l.key)} fill="none" stroke={l.color} strokeWidth={dense ? 1.5 : 1.75} strokeLinecap="round" strokeLinejoin="round" />
          ))}

          {/* Hover crosshair */}
          {hoveredIdx !== null && (
            <line x1={getX(hoveredIdx)} y1={padT} x2={getX(hoveredIdx)} y2={padT + chartH} stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
          )}

          {/* Data points: subtle resting dots only when sparse; highlight on hover always */}
          {daily.map((d, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g key={i} onMouseEnter={() => setHoveredIdx(i)} className="cursor-pointer">
                <rect x={getX(i) - hitW / 2} y={padT} width={hitW} height={chartH} fill="transparent" />
                {visibleLines.map(l => {
                  const cy = getY(Math.max(d[l.key], 0));
                  if (!isHovered && dense) return null;
                  return (
                    <g key={l.key}>
                      {isHovered && <circle cx={getX(i)} cy={cy} r="7" fill={l.color} opacity="0.15" />}
                      <circle cx={getX(i)} cy={cy} r={isHovered ? 4 : 2.25} fill={l.color} stroke="white" strokeWidth={isHovered ? 2 : 1.25} />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover tooltip bar */}
      {hoveredIdx !== null && (
        <div className="mx-4 mb-4 bg-gradient-to-r from-gray-50 to-gray-50/50 dark:from-neutral-dark dark:to-neutral-dark/50 border border-gray-100 dark:border-neutral-border/30 rounded-xl p-3.5 grid grid-cols-4 gap-4 animate-fade-in">
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Date</p>
            <p className="text-xs font-bold mt-1 dark:text-white">{new Date(daily[hoveredIdx].date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Wagers</p>
            <p className="text-sm font-bold mt-1" style={{ color: '#FF6B35' }}>{formatVal(daily[hoveredIdx].wagers)}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Payouts</p>
            <p className="text-sm font-bold mt-1" style={{ color: '#8B5CF6' }}>{formatVal(daily[hoveredIdx].payouts)}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">GGR</p>
            <p className="text-sm font-bold mt-1" style={{ color: '#10B981' }}>{formatVal(daily[hoveredIdx].ggr)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Admin Screen ─────────────────────────────────────────────────────────
const AdminScreen: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { format: formatCurrency } = useCurrency();
  const navigate = useNavigate();

  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [tab, setTab] = useState<'overview' | 'users' | 'bets' | 'withdrawals' | 'support' | 'settings'>('overview');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [bets, setBets] = useState<AdminBet[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // Filters
  const [searchUser, setSearchUser] = useState('');
  const [filterUserStatus, setFilterUserStatus] = useState<'all' | 'suspended' | 'active'>('all');
  const [searchBet, setSearchBet] = useState('');
  const [filterBetStatus, setFilterBetStatus] = useState<'ALL' | 'PENDING' | 'WON' | 'LOST'>('ALL');

  // User modal
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userWallet, setUserWallet] = useState<AdminUserWallet | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [modalBusy, setModalBusy] = useState(false);
  const [modalTab, setModalTab] = useState<'overview' | 'bets' | 'transactions'>('overview');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Chart range — kept in a ref too so the 20s poll refetches the same window
  // without re-creating `load` (which would restart the polling effect).
  const [chartRange, setChartRange] = useState<ChartRange>(7);
  const [rangeLoading, setRangeLoading] = useState(false);
  const chartRangeRef = useRef<ChartRange>(7);

  // Settings
  const [marginInput, setMarginInput] = useState('');
  const [minBetInput, setMinBetInput] = useState('');
  const [maxBetInput, setMaxBetInput] = useState('');
  const [minWdInput, setMinWdInput] = useState('');
  const [maxWdInput, setMaxWdInput] = useState('');
  const [maxLiabInput, setMaxLiabInput] = useState('');
  const [configBusy, setConfigBusy] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [s, u, b, wd, cfg, tk] = await Promise.all([
        fetchAdminStats('', chartRangeRef.current),
        fetchAdminUsers(''),
        fetchAdminBets(''),
        fetchAdminWithdrawals(''),
        fetchAdminConfig(''),
        fetchAllTickets().catch(() => [] as SupportTicket[]),
      ]);
      setStats(s);
      setUsers(u);
      setBets(b);
      setWithdrawals(wd);
      setConfig(cfg);
      setTickets(tk);
      setMarginInput((cfg.houseMargin * 100).toFixed(1));
      setMinBetInput((cfg.minBet / 100).toString());
      setMaxBetInput((cfg.maxBet / 100).toString());
      setMinWdInput((cfg.minWithdrawal / 100).toString());
      setMaxWdInput((cfg.maxWithdrawal / 100).toString());
      setMaxLiabInput(((cfg.maxLiability ?? 0) / 100).toString());
    } catch (err: any) {
      showToast('Failed to load admin data. Backend may be offline.', 'error');
    }
  }, []);

  // Auto-authenticate using Firebase token (no passcode needed for admin emails)
  useEffect(() => {
    if (!isAdmin) {
      navigate('/', { replace: true });
      return;
    }
    setLoading(true);
    load().then(() => { setAuthed(true); }).catch(() => {}).finally(() => setLoading(false));
  }, [isAdmin, load, navigate]);

  // Auto-poll every 20s
  useEffect(() => {
    if (!authed) return;
    const t = setInterval(() => load().catch(() => {}), 20000);
    return () => clearInterval(t);
  }, [authed, load]);

  const decide = async (id: string, action: 'approve' | 'reject') => {
    try {
      await (action === 'approve' ? approveWithdrawal('', id) : rejectWithdrawal('', id));
      showToast(`Withdrawal ${action}d successfully.`);
      await load();
    } catch {
      showToast('Failed to process withdrawal.', 'error');
    }
  };

  const changeChartRange = (d: ChartRange) => {
    setChartRange(d);
    chartRangeRef.current = d;
    setRangeLoading(true);
    fetchAdminStats('', d).then(setStats).catch(() => {}).finally(() => setRangeLoading(false));
  };

  const openUserDetails = async (u: AdminUser) => {
    setSelectedUser(u);
    setUserWallet(null);
    setAdjustAmount('');
    setAdjustNote('');
    setModalTab('overview');
    setConfirmingDelete(false);
    try {
      const w = await fetchUserWallet('', u.deviceId);
      setUserWallet(w);
    } catch {
      showToast('Could not load wallet logs.', 'error');
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !adjustAmount) return;
    setModalBusy(true);
    try {
      const cents = Math.round(parseFloat(adjustAmount) * 100);
      const updatedWallet = await adjustUserBalance('', selectedUser.deviceId, cents, adjustNote || 'Admin manual adjustment');
      setUserWallet(updatedWallet);
      setSelectedUser(prev => prev ? { ...prev, balance: updatedWallet.balance } : null);
      setAdjustAmount('');
      setAdjustNote('');
      showToast('Balance updated successfully.');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to adjust balance.', 'error');
    } finally {
      setModalBusy(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setModalBusy(true);
    try {
      await deleteUserAccount('', selectedUser.deviceId);
      setSelectedUser(prev => prev ? { ...prev, deleted: true, suspended: true } : null);
      setConfirmingDelete(false);
      showToast('Account deleted. The record stays for the audit trail.');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete account.', 'error');
    } finally {
      setModalBusy(false);
    }
  };

  const toggleUserSuspension = async () => {
    if (!selectedUser) return;
    setModalBusy(true);
    try {
      const target = !selectedUser.suspended;
      const updatedWallet = await setUserSuspended('', selectedUser.deviceId, target);
      // Update local state from wallet response
      setSelectedUser(prev => prev ? { ...prev, suspended: updatedWallet.suspended, balance: updatedWallet.balance } : null);
      showToast(target ? 'Account suspended.' : 'Account activated.');
      await load();
    } catch {
      showToast('Failed to update suspension.', 'error');
    } finally {
      setModalBusy(false);
    }
  };

  const toggleUserKyc = async () => {
    if (!selectedUser) return;
    setModalBusy(true);
    try {
      const target = !selectedUser.verified;
      await setUserKyc('', selectedUser.deviceId, target);
      setSelectedUser(prev => prev ? { ...prev, verified: target } : null);
      showToast(target ? 'KYC verified manually.' : 'KYC status revoked.');
      await load();
    } catch {
      showToast('Failed to update KYC.', 'error');
    } finally {
      setModalBusy(false);
    }
  };

  const handleSettleBet = async (betId: string, outcome: 'WON' | 'LOST') => {
    try {
      await settleBet('', betId, outcome);
      showToast(`Bet settled as ${outcome}.`);
      await load();
    } catch {
      showToast('Failed to settle bet.', 'error');
    }
  };

  const handleTicketReply = async (id: string) => {
    const body = (replyDrafts[id] || '').trim();
    if (!body) return;
    try {
      await adminReplyTicket(id, body);
      setReplyDrafts(d => ({ ...d, [id]: '' }));
      showToast('Reply sent.');
      await load();
    } catch {
      showToast('Failed to send reply.', 'error');
    }
  };

  const handleTicketClose = async (id: string) => {
    try {
      await adminCloseTicket(id);
      showToast('Ticket closed.');
      await load();
    } catch {
      showToast('Failed to close ticket.', 'error');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigBusy(true);
    try {
      const updated = await saveAdminConfig('', {
        houseMargin: parseFloat(marginInput) / 100,
        minBet: Math.round(parseFloat(minBetInput) * 100),
        maxBet: Math.round(parseFloat(maxBetInput) * 100),
        minWithdrawal: Math.round(parseFloat(minWdInput) * 100),
        maxWithdrawal: Math.round(parseFloat(maxWdInput) * 100),
        maxLiability: Math.round(parseFloat(maxLiabInput) * 100),
      });
      setConfig(updated);
      showToast('Configuration saved.');
    } catch {
      showToast('Failed to save config.', 'error');
    } finally {
      setConfigBusy(false);
    }
  };

  const downloadBetReceipt = (bet: AdminBet) => {
    try {
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a6' });
      const primary = [255, 107, 53];
      const text = [30, 41, 59];
      doc.setFillColor(primary[0], primary[1], primary[2]);
      doc.rect(0, 0, 105, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('RAPHBET BETTING RECEIPT', 52.5, 9.5, { align: 'center' });
      doc.setTextColor(text[0], text[1], text[2]);
      doc.setFontSize(8); doc.setFont('Helvetica', 'normal');
      doc.text(`Receipt ID: ${bet.id}`, 8, 24);
      doc.text(`Date: ${new Date(bet.placedDate).toLocaleString()}`, 8, 29);
      doc.text(`Player: ${bet.deviceId.slice(0, 18)}...`, 8, 34);
      doc.line(8, 38, 97, 38);
      doc.setFont('Helvetica', 'bold'); doc.setFontSize(9);
      doc.text('BET SELECTION', 8, 44);
      doc.setFontSize(9.5); doc.text(bet.match, 8, 52);
      doc.setFont('Helvetica', 'normal'); doc.setFontSize(8);
      doc.text(`Market: ${bet.market}`, 8, 58);
      doc.setFillColor(241, 245, 249); doc.rect(8, 64, 89, 34, 'F');
      doc.text('Stake:', 12, 71); doc.text('Odds:', 12, 77); doc.text('Status:', 12, 83); doc.text('Payout:', 12, 89);
      doc.setFont('Helvetica', 'bold');
      doc.text(formatCurrency(bet.wager), 60, 71);
      doc.text(bet.odds.toFixed(2), 60, 77);
      if (bet.status === 'WON') doc.setTextColor(22, 163, 74);
      else if (bet.status === 'LOST') doc.setTextColor(220, 38, 38);
      else doc.setTextColor(245, 158, 11);
      doc.text(bet.status, 60, 83);
      doc.setTextColor(text[0], text[1], text[2]);
      doc.text(bet.payout ? formatCurrency(bet.payout) : '—', 60, 89);
      doc.setFont('Helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(148, 163, 184);
      doc.text(`HASH: ${btoa(bet.id + bet.wager).slice(0, 24)}`, 52.5, 111, { align: 'center' });
      doc.setFontSize(8.5); doc.setFont('Helvetica', 'bold'); doc.setTextColor(primary[0], primary[1], primary[2]);
      doc.text('Thank you for betting with Raphbet!', 52.5, 120, { align: 'center' });
      doc.save(`Raphbet_Receipt_${bet.id.slice(0, 8)}.pdf`);
      showToast('PDF receipt downloaded.');
    } catch {
      showToast('PDF library not loaded.', 'error');
    }
  };

  const downloadOverallReport = () => {
    if (!stats) return;
    try {
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const primary = [255, 107, 53];
      const text = [30, 41, 59];

      // Header block
      doc.setFillColor(primary[0], primary[1], primary[2]);
      doc.rect(0, 0, 210, 25, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('RAPHBET PLATFORM DATA REPORT', 105, 16, { align: 'center' });

      // Body text
      doc.setTextColor(text[0], text[1], text[2]);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 38);
      doc.text(`Reporting Period: Last 7 Days / All-Time`, 15, 44);

      doc.line(15, 48, 195, 48);

      // Section: KPIs
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Platform Metrics Summary', 15, 58);

      // Simple layout grid for metrics
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      
      const metrics = [
        ['Registered Users', stats.users.toString()],
        ['Total Staked Volume', formatCurrency(stats.totalStaked)],
        ['Total Paid Out Payouts', formatCurrency(stats.totalPayouts)],
        ['Gross Gaming Revenue (GGR)', formatCurrency(stats.ggr)],
        ['Total Deposit Transactions', formatCurrency(stats.deposits)],
        ['Total Withdrawal Volume', formatCurrency(stats.withdrawals)],
        ['Total Wallet Liability (Funds Held)', formatCurrency(stats.totalBalance)],
        ['Bets (Pending / Won / Lost)', `${stats.betsPending} / ${stats.betsWon} / ${stats.betsLost}`]
      ];

      let startY = 68;
      metrics.forEach(([label, val]) => {
        doc.setFont('Helvetica', 'bold');
        doc.text(label, 15, startY);
        doc.setFont('Helvetica', 'normal');
        doc.text(val, 130, startY);
        doc.line(15, startY + 2, 195, startY + 2);
        startY += 10;
      });

      // Daily Trends Summary
      if (stats.daily && stats.daily.length > 0) {
        startY += 8;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('Recent Daily Trends (Last 7 Days)', 15, startY);
        startY += 8;

        // Draw Table Header
        doc.setFillColor(245, 247, 250);
        doc.rect(15, startY - 5, 180, 8, 'F');
        doc.setFontSize(9);
        doc.text('Date', 18, startY);
        doc.text('Deposits', 65, startY, { align: 'right' });
        doc.text('Wagers', 110, startY, { align: 'right' });
        doc.text('Payouts', 155, startY, { align: 'right' });
        doc.text('GGR', 190, startY, { align: 'right' });

        doc.setFont('Helvetica', 'normal');
        stats.daily.forEach(d => {
          startY += 8;
          doc.text(new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), 18, startY);
          doc.text(formatCurrency(d.deposits), 65, startY, { align: 'right' });
          doc.text(formatCurrency(d.wagers), 110, startY, { align: 'right' });
          doc.text(formatCurrency(d.payouts), 155, startY, { align: 'right' });
          doc.text(formatCurrency(d.ggr), 190, startY, { align: 'right' });
        });
      }

      // Footer
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Confidential - For Internal Raphbet Administration Only', 105, 280, { align: 'center' });

      doc.save(`Raphbet_Overall_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast('Overall PDF report downloaded.');
    } catch (err) {
      showToast('PDF library error.', 'error');
    }
  };

  const downloadUsersReport = () => {
    if (users.length === 0) return;
    try {
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const primary = [255, 107, 53];
      const text = [30, 41, 59];

      // Header block
      doc.setFillColor(primary[0], primary[1], primary[2]);
      doc.rect(0, 0, 210, 25, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('RAPHBET USER BASE SUMMARY REPORT', 105, 16, { align: 'center' });

      // Body text
      doc.setTextColor(text[0], text[1], text[2]);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 38);
      doc.text(`Total Users: ${users.length} active device wallets`, 15, 44);

      doc.line(15, 48, 195, 48);

      let startY = 60;
      // Draw Table Header
      doc.setFillColor(245, 247, 250);
      doc.rect(15, startY - 5, 180, 8, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Player / Device ID', 18, startY);
      doc.text('KYC', 90, startY);
      doc.text('Status', 115, startY);
      doc.text('Total Bets', 145, startY, { align: 'right' });
      doc.text('Total Staked', 170, startY, { align: 'right' });
      doc.text('Balance', 190, startY, { align: 'right' });

      doc.setFont('Helvetica', 'normal');
      users.forEach((u, i) => {
        // Handle page overflow if we have many users
        if (startY > 265) {
          doc.addPage();
          startY = 30;
          doc.setFillColor(245, 247, 250);
          doc.rect(15, startY - 5, 180, 8, 'F');
          doc.setFont('Helvetica', 'bold');
          doc.text('Player / Device ID', 18, startY);
          doc.text('KYC', 90, startY);
          doc.text('Status', 115, startY);
          doc.text('Total Bets', 145, startY, { align: 'right' });
          doc.text('Total Staked', 170, startY, { align: 'right' });
          doc.text('Balance', 190, startY, { align: 'right' });
          doc.setFont('Helvetica', 'normal');
        }
        
        startY += 9;
        const shortId = u.deviceId.length > 25 ? u.deviceId.slice(0, 25) + '...' : u.deviceId;
        doc.text(shortId, 18, startY);
        doc.text(u.verified ? 'Verified' : 'Unverified', 90, startY);
        doc.text(u.suspended ? 'Suspended' : 'Active', 115, startY);
        doc.text(u.bets.toString(), 145, startY, { align: 'right' });
        doc.text(formatCurrency(u.totalStaked), 170, startY, { align: 'right' });
        doc.text(formatCurrency(u.balance), 190, startY, { align: 'right' });
        doc.line(15, startY + 2, 195, startY + 2, 'FD'); // dotted style-ish or thin gray line
      });

      // Footer
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Confidential - For Internal Raphbet Administration Only', 105, 280, { align: 'center' });

      doc.save(`Raphbet_Users_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast('Users summary PDF report downloaded.');
    } catch (err) {
      showToast('PDF library error.', 'error');
    }
  };

  const filteredUsers = users.filter(u => {
    const q = searchUser.toLowerCase();
    const match = u.deviceId.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q);
    if (filterUserStatus === 'suspended') return match && u.suspended;
    if (filterUserStatus === 'active') return match && !u.suspended;
    return match;
  });

  const filteredBets = bets.filter(b => {
    const match = b.match.toLowerCase().includes(searchBet.toLowerCase()) || b.deviceId.toLowerCase().includes(searchBet.toLowerCase());
    if (filterBetStatus !== 'ALL') return match && b.status === filterBetStatus;
    return match;
  });

  // Per-player figures for the detail panel, derived from the global bets feed
  // and the player's own wallet transactions.
  const playerBets = useMemo(
    () => (selectedUser
      ? bets
          .filter(b => b.deviceId === selectedUser.deviceId)
          .sort((a, b) => new Date(b.placedDate).getTime() - new Date(a.placedDate).getTime())
      : []),
    [bets, selectedUser],
  );

  const playerStats = useMemo(() => {
    const won = playerBets.filter(b => b.status === 'WON');
    const lost = playerBets.filter(b => b.status === 'LOST');
    const pending = playerBets.filter(b => b.status === 'PENDING');
    const settledStake = [...won, ...lost].reduce((s, b) => s + b.wager, 0);
    const totalPayout = won.reduce((s, b) => s + (b.payout || 0), 0);
    const tx = userWallet?.transactions ?? [];
    const deposits = tx.filter(t => t.type === 'Top-up');
    const withdrawalsTx = tx.filter(t => t.type === 'Withdrawal');
    return {
      won: won.length,
      lost: lost.length,
      pending: pending.length,
      // Player's net result on settled bets; negative means the house profited.
      pnl: totalPayout - settledStake,
      depositCount: deposits.length,
      depositTotal: deposits.reduce((s, t) => s + Math.abs(t.amount), 0),
      withdrawalCount: withdrawalsTx.length,
      withdrawalTotal: withdrawalsTx.reduce((s, t) => s + Math.abs(t.amount), 0),
    };
  }, [playerBets, userWallet]);

  // Full per-player statement: profile, lifetime figures and complete bet list.
  const downloadPlayerStatement = () => {
    if (!selectedUser) return;
    try {
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const primary = [255, 107, 53];
      const text = [30, 41, 59];

      doc.setFillColor(primary[0], primary[1], primary[2]);
      doc.rect(0, 0, 210, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('RAPHBET PLAYER STATEMENT', 105, 16, { align: 'center' });

      doc.setTextColor(text[0], text[1], text[2]);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 35);
      doc.text(`Player: ${selectedUser.email || 'guest'}`, 15, 41);
      doc.text(`Device ID: ${selectedUser.deviceId}`, 15, 47);
      doc.line(15, 51, 195, 51);

      const rows = [
        ['Balance', formatCurrency(selectedUser.balance)],
        ['Total Staked', formatCurrency(selectedUser.totalStaked)],
        ['Player P/L (settled bets)', formatCurrency(playerStats.pnl)],
        ['Bets (Won / Lost / Open)', `${playerStats.won} / ${playerStats.lost} / ${playerStats.pending}`],
        ['Deposits', `${playerStats.depositCount} × · ${formatCurrency(playerStats.depositTotal)}`],
        ['Withdrawals', `${playerStats.withdrawalCount} × · ${formatCurrency(playerStats.withdrawalTotal)}`],
        ['KYC', selectedUser.verified ? 'Verified' : 'Unverified'],
        ['Account', selectedUser.suspended ? 'Suspended' : 'Active'],
      ];
      let y = 60;
      doc.setFontSize(10);
      rows.forEach(([label, val]) => {
        doc.setFont('Helvetica', 'bold');
        doc.text(label, 15, y);
        doc.setFont('Helvetica', 'normal');
        doc.text(val, 130, y);
        doc.line(15, y + 2, 195, y + 2);
        y += 9;
      });

      if (playerBets.length > 0) {
        y += 6;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`Bet History (${playerBets.length})`, 15, y);
        y += 8;
        const drawHead = () => {
          doc.setFillColor(245, 247, 250);
          doc.rect(15, y - 5, 180, 8, 'F');
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text('Date', 18, y);
          doc.text('Match / Market', 45, y);
          doc.text('Stake', 135, y, { align: 'right' });
          doc.text('Odds', 152, y, { align: 'right' });
          doc.text('Status', 170, y, { align: 'right' });
          doc.text('Payout', 192, y, { align: 'right' });
          doc.setFont('Helvetica', 'normal');
        };
        drawHead();
        playerBets.forEach(b => {
          if (y > 270) { doc.addPage(); y = 25; drawHead(); }
          y += 7;
          doc.text(new Date(b.placedDate).toLocaleDateString(), 18, y);
          const desc = `${b.match} — ${b.market}`;
          doc.text(desc.length > 48 ? desc.slice(0, 48) + '…' : desc, 45, y);
          doc.text(formatCurrency(b.wager), 135, y, { align: 'right' });
          doc.text(b.odds.toFixed(2), 152, y, { align: 'right' });
          doc.text(b.status, 170, y, { align: 'right' });
          doc.text(b.payout ? formatCurrency(b.payout) : '—', 192, y, { align: 'right' });
        });
      }

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Confidential - For Internal Raphbet Administration Only', 105, 287, { align: 'center' });
      doc.save(`Raphbet_Player_${selectedUser.deviceId.slice(0, 8)}.pdf`);
      showToast('Player statement downloaded.');
    } catch {
      showToast('PDF library not loaded.', 'error');
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-light-gray dark:bg-neutral-dark">
        <div className="flex flex-col items-center gap-3 text-primary">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="font-bold text-xs uppercase tracking-widest text-gray-400">Loading Admin Console…</span>
        </div>
      </div>
    );
  }

  // ─── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-light-gray dark:bg-neutral-dark text-neutral-dark dark:text-neutral-light-gray font-sans relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100] px-4 py-3 rounded-xl border shadow-lg flex items-center gap-2.5 animate-fade-in text-xs font-bold bg-white dark:bg-neutral-dark-gray border-gray-200 dark:border-neutral-border">
          {toast.type === 'success'
            ? <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            : <ShieldAlert className="h-5 w-5 text-danger shrink-0" />}
          <span className="dark:text-white">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-neutral-dark-gray border-b border-gray-200 dark:border-neutral-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-md tracking-wider uppercase">Admin Console</span>
          </div>
          <div className="flex items-center gap-4">
            {user?.email && (
              <span className="hidden sm:block text-xs text-gray-400 font-medium">{user.email}</span>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-bold text-success uppercase">Live</span>
            </div>
            <button onClick={() => navigate('/')} className="text-xs font-bold text-gray-400 hover:text-danger transition-colors">
              ← Exit
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20">
        {/* Navigation Tabs */}
        <div className="bg-white/80 dark:bg-neutral-dark-gray/80 backdrop-blur-md border border-gray-100 dark:border-neutral-border/50 rounded-2xl p-1.5 flex gap-1 mb-8 overflow-x-auto whitespace-nowrap scrollbar-none shadow-sm">
          {(['overview', 'users', 'bets', 'withdrawals', 'support', 'settings'] as const).map(t => {
            const isActive = tab === t;
            const tabMeta = {
              overview: { label: 'Overview', Icon: BarChart3 },
              users: { label: 'Players', Icon: UsersIcon },
              bets: { label: 'Bets Board', Icon: Ticket },
              withdrawals: { label: 'Withdrawals', Icon: MoneyIcon },
              support: { label: 'Support', Icon: MessageSquare },
              settings: { label: 'Settings', Icon: Settings },
            } as const;
            const { label, Icon } = tabMeta[t];
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-2.5 px-4 sm:px-5 text-xs font-semibold tracking-tight rounded-xl transition-all duration-300 flex items-center gap-2 ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/15'
                    : 'text-gray-400 hover:text-neutral-dark dark:hover:text-white hover:bg-gray-50 dark:hover:bg-neutral-dark/45'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
                <span>{label}</span>
                {t === 'withdrawals' && withdrawals.length > 0 ? (
                  <span className={`ml-1 px-2 py-0.5 text-[9px] font-bold rounded-full ${isActive ? 'bg-white text-primary' : 'bg-danger text-white animate-pulse'}`}>{withdrawals.length}</span>
                ) : ''}
                {t === 'bets' && bets.filter(b => b.status === 'PENDING').length > 0 ? (
                  <span className={`ml-1 px-2 py-0.5 text-[9px] font-bold rounded-full ${isActive ? 'bg-white text-primary' : 'bg-amber-500 text-white'}`}>
                    {bets.filter(b => b.status === 'PENDING').length}
                  </span>
                ) : ''}
                {t === 'support' && tickets.filter(tk => tk.status === 'OPEN').length > 0 ? (
                  <span className={`ml-1 px-2 py-0.5 text-[9px] font-bold rounded-full ${isActive ? 'bg-white text-primary' : 'bg-danger text-white animate-pulse'}`}>
                    {tickets.filter(tk => tk.status === 'OPEN').length}
                  </span>
                ) : ''}
              </button>
            );
          })}
        </div>

        {/* ── Tab 1: Overview ────────────────────────────────────────────── */}
        {tab === 'overview' && stats && (
          <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Registered Users"
                value={stats.users.toLocaleString()}
                sub="unique device wallets"
                icon={<UsersIcon />}
                iconBg="bg-blue-500/10"
                iconColor="text-blue-500"
              />
              <StatCard
                label="Total Staked"
                value={formatCurrency(stats.totalStaked)}
                sub="all time volume"
                icon={<StakedIcon />}
                iconBg="bg-orange-500/10"
                iconColor="text-orange-500"
              />
              <StatCard
                label="Total Payouts"
                value={formatCurrency(stats.totalPayouts)}
                sub="all time paid out"
                icon={<PayoutIcon />}
                iconBg="bg-purple-500/10"
                iconColor="text-purple-500"
              />
              <StatCard
                label="Gross Revenue (GGR)"
                value={formatCurrency(stats.ggr)}
                accent={stats.ggr >= 0 ? 'text-emerald-500' : 'text-danger'}
                sub={`${stats.ggr >= 0 ? '+' : ''}${((stats.ggr / Math.max(stats.totalStaked, 1)) * 100).toFixed(1)}% margin ratio`}
                icon={<MoneyIcon />}
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-500"
                trend={stats.ggr >= 0 ? 'up' : 'down'}
              />
              <StatCard
                label="Total Deposits"
                value={formatCurrency(stats.deposits)}
                icon={<DepositIcon />}
                iconBg="bg-green-500/10"
                iconColor="text-green-500"
              />
              <StatCard
                label="Total Withdrawals"
                value={formatCurrency(stats.withdrawals)}
                icon={<WithdrawalIcon />}
                iconBg="bg-rose-500/10"
                iconColor="text-rose-500"
              />
              <StatCard
                label="Wallet Liability"
                value={formatCurrency(stats.totalBalance)}
                sub="player funds held"
                icon={<LiabilityIcon />}
                iconBg="bg-amber-500/10"
                iconColor="text-amber-500"
              />
              <StatCard
                label="Bets P / W / L"
                value={`${stats.betsPending} / ${stats.betsWon} / ${stats.betsLost}`}
                sub={`${((stats.betsWon / Math.max(stats.betsWon + stats.betsLost, 1)) * 100).toFixed(0)}% win rate`}
                icon={<BetsIcon />}
                iconBg="bg-indigo-500/10"
                iconColor="text-indigo-500"
              />
              <StatCard
                label="Open Risk Exposure"
                value={formatCurrency(stats.pendingLiability ?? 0)}
                accent={(stats.pendingLiability ?? 0) > stats.totalBalance ? 'text-danger' : 'text-neutral-dark dark:text-white'}
                sub={`max payout owed on ${stats.betsPending} open bet${stats.betsPending === 1 ? '' : 's'}`}
                trend={(stats.pendingLiability ?? 0) > stats.totalBalance ? 'down' : 'neutral'}
                icon={<Zap />}
                iconBg="bg-red-500/10"
                iconColor="text-red-500"
              />
            </div>

            {/* Margin info & Actions */}
            {config && (
              <div className="relative overflow-hidden bg-white/40 dark:bg-neutral-dark-gray/40 backdrop-blur-md border border-gray-150 dark:border-neutral-border/30 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-6 shadow-sm">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />
                
                <div className="flex flex-wrap items-center gap-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <Percent className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">House Margin (Vig)</p>
                      <p className="text-xl font-bold text-primary mt-0.5">{(config.houseMargin * 100).toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-neutral-dark text-gray-500 dark:text-gray-400">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Min Bet</p>
                      <p className="text-base font-bold mt-0.5 dark:text-white">{formatCurrency(config.minBet)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-neutral-dark text-gray-500 dark:text-gray-400">
                      <CircleDollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Max Bet</p>
                      <p className="text-base font-bold mt-0.5 dark:text-white">{formatCurrency(config.maxBet)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-danger/10 text-danger animate-pulse">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Pending Withdrawals</p>
                      <p className="text-base font-bold mt-0.5 text-danger">{withdrawals.length}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
                  <button
                    onClick={downloadOverallReport}
                    className="text-xs font-bold text-white bg-primary hover:bg-primary-dark active:scale-95 px-4 py-2.5 rounded-xl transition-all shadow-md shadow-primary/20 flex items-center gap-2 uppercase tracking-wider"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Report
                  </button>
                  <button
                    onClick={() => load()}
                    className="text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-neutral-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-dark border border-gray-200 dark:border-neutral-border/60 active:scale-95 px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                </div>
              </div>
            )}

            {/* Chart */}
            <RevenueChart daily={stats.daily ?? []} range={chartRange} onRangeChange={changeChartRange} rangeLoading={rangeLoading} />
          </div>
        )}

        {/* ── Tab 2: Users ───────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-neutral-dark-gray border border-gray-100 dark:border-neutral-border/60 p-4 rounded-3xl shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-grow max-w-2xl">
                <input
                  type="text"
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  placeholder="Search by device ID…"
                  className="w-full sm:w-80 px-3.5 py-2 border border-gray-200 dark:border-neutral-border rounded-xl bg-transparent focus:outline-none focus:border-primary text-xs dark:text-white"
                />
                <div className="flex gap-1.5">
                  {(['all', 'active', 'suspended'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterUserStatus(f)}
                      className={`py-1.5 px-3.5 text-[10px] font-semibold uppercase rounded-full border transition-all ${
                        filterUserStatus === f ? 'bg-primary border-primary text-white shadow-sm shadow-primary/20' : 'bg-transparent border-gray-200 dark:border-neutral-border text-gray-400 hover:text-gray-600'
                      }`}
                    >{f}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3.5 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{filteredUsers.length} users</span>
                <button
                  onClick={downloadUsersReport}
                  className="text-[10px] font-bold text-white bg-neutral-dark dark:bg-primary hover:opacity-90 px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 uppercase tracking-wider"
                >
                  📥 Export PDF
                </button>
              </div>
            </div>

            <div className="overflow-x-auto bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] uppercase font-bold text-gray-400 border-b border-gray-200 dark:border-neutral-border bg-gray-50/50 dark:bg-neutral-dark/30">
                  <tr>
                    <th className="px-5 py-3.5">Player (email / id)</th>
                    <th className="px-5 py-3.5 text-right">Balance</th>
                    <th className="px-5 py-3.5 text-center">KYC</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Volume</th>
                    <th className="px-5 py-3.5 text-right">Bets</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-border">
                  {filteredUsers.map(u => (
                    <tr
                      key={u.deviceId}
                      onClick={() => openUserDetails(u)}
                      className="hover:bg-gray-50/80 dark:hover:bg-neutral-dark/20 transition-colors cursor-pointer"
                      title="Open player details"
                    >
                      <td className="px-5 py-4">
                        {u.email ? (
                          <>
                            <span className="block font-semibold text-[12px] truncate max-w-[200px]" title={u.email}>{u.email}</span>
                            <span className="block font-mono text-[10px] text-gray-400 truncate max-w-[200px]" title={u.deviceId}>{u.deviceId}</span>
                          </>
                        ) : (
                          <span className="block font-mono text-[11px] truncate max-w-[200px]" title={u.deviceId}>
                            {u.deviceId} <span className="text-gray-400 font-sans">· guest</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right font-bold tabular-nums">{formatCurrency(u.balance)}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${u.verified ? 'bg-success/10 text-success' : 'bg-amber-500/10 text-amber-600'}`}>
                          {u.verified ? '✓ Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                          u.deleted
                            ? 'bg-gray-200 text-gray-500 border-gray-300 dark:bg-neutral-dark dark:text-gray-400 dark:border-neutral-border'
                            : u.suspended
                              ? 'bg-danger/10 text-danger border-danger/20'
                              : 'bg-success/10 text-success border-success/20'
                        }`}>
                          {u.deleted ? 'Deleted' : u.suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold tabular-nums">{formatCurrency(u.totalStaked)}</td>
                      <td className="px-5 py-4 text-right tabular-nums">{u.bets}</td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={e => { e.stopPropagation(); openUserDetails(u); }}
                          className="bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-transparent px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-gray-400 py-12 font-medium">No players matched your search.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab 3: Bets ────────────────────────────────────────────────── */}
        {tab === 'bets' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border p-4 rounded-2xl">
              <input
                type="text"
                value={searchBet}
                onChange={e => setSearchBet(e.target.value)}
                placeholder="Search by match or player ID…"
                className="w-full sm:w-80 px-3 py-2 border border-gray-200 dark:border-neutral-border rounded-xl bg-transparent focus:outline-none focus:border-primary text-xs dark:text-white"
              />
              <div className="flex gap-2 overflow-x-auto">
                {(['ALL', 'PENDING', 'WON', 'LOST'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterBetStatus(f)}
                    className={`py-1.5 px-3 text-[10px] font-bold uppercase rounded-lg border transition-colors whitespace-nowrap ${
                      filterBetStatus === f ? 'bg-primary border-primary text-white' : 'bg-transparent border-gray-200 dark:border-neutral-border text-gray-400 hover:text-gray-600'
                    }`}
                  >{f}</button>
                ))}
              </div>
              <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">{filteredBets.length} bets</span>
            </div>

            <div className="overflow-x-auto bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] uppercase font-bold text-gray-400 border-b border-gray-200 dark:border-neutral-border bg-gray-50/50 dark:bg-neutral-dark/30">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Match</th>
                    <th className="px-5 py-3.5">Market</th>
                    <th className="px-5 py-3.5 text-right">Stake</th>
                    <th className="px-5 py-3.5 text-right">Odds</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Payout</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-border">
                  {filteredBets.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50/50 dark:hover:bg-neutral-dark/10 transition-colors">
                      <td className="px-5 py-4 text-gray-400 whitespace-nowrap">{new Date(b.placedDate).toLocaleDateString()}</td>
                      <td className="px-5 py-4 font-bold max-w-[160px] truncate" title={b.match}>{b.match}</td>
                      <td className="px-5 py-4 text-gray-400 max-w-[120px] truncate">{b.market}</td>
                      <td className="px-5 py-4 text-right font-semibold tabular-nums">{formatCurrency(b.wager)}</td>
                      <td className="px-5 py-4 text-right font-bold tabular-nums">{b.odds.toFixed(2)}</td>
                      <td className="px-5 py-4 text-center"><StatusBadge status={b.status} /></td>
                      <td className="px-5 py-4 text-right font-bold tabular-nums text-success">{b.payout ? formatCurrency(b.payout) : '—'}</td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {b.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleSettleBet(b.id, 'WON')}
                                className="bg-success/10 hover:bg-success text-success hover:text-white border border-success/20 hover:border-transparent px-2 py-1 rounded text-[10px] font-bold transition-all"
                              >W</button>
                              <button
                                onClick={() => handleSettleBet(b.id, 'LOST')}
                                className="bg-danger/10 hover:bg-danger text-danger hover:text-white border border-danger/20 hover:border-transparent px-2 py-1 rounded text-[10px] font-bold transition-all"
                              >L</button>
                            </>
                          )}
                          <button
                            onClick={() => downloadBetReceipt(b)}
                            className="text-gray-400 hover:text-primary transition-colors p-1"
                            title="Download receipt"
                          >
                            <ReceiptIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredBets.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-gray-400 py-12 font-medium">No bets found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab 4: Withdrawals ─────────────────────────────────────────── */}
        {tab === 'withdrawals' && (
          <div className="space-y-4">
            {withdrawals.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-xs font-bold text-amber-700 dark:text-amber-500">
                  {withdrawals.length} withdrawal{withdrawals.length > 1 ? 's' : ''} pending your review. Verify on-chain before approving.
                </p>
              </div>
            )}
            <div className="overflow-x-auto bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] uppercase font-bold text-gray-400 border-b border-gray-200 dark:border-neutral-border bg-gray-50/50 dark:bg-neutral-dark/30">
                  <tr>
                    <th className="px-5 py-3.5">Requested</th>
                    <th className="px-5 py-3.5">TRC-20 Address</th>
                    <th className="px-5 py-3.5 text-right">Amount</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-border">
                  {withdrawals.map(wd => (
                    <tr key={wd.id} className="hover:bg-gray-50/50 dark:hover:bg-neutral-dark/10 transition-colors">
                      <td className="px-5 py-4 text-gray-400 whitespace-nowrap">{new Date(wd.createdDate).toLocaleString()}</td>
                      <td className="px-5 py-4 font-mono text-[11px] select-all break-all max-w-[240px]">{wd.address}</td>
                      <td className="px-5 py-4 text-right font-bold tabular-nums">{formatCurrency(wd.amount)}</td>
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <button onClick={() => decide(wd.id, 'approve')} className="bg-success text-white hover:bg-success-dark px-3 py-1.5 rounded-lg text-[10px] font-bold mr-2.5 shadow-sm transition-colors">Approve</button>
                        <button onClick={() => decide(wd.id, 'reject')} className="bg-transparent border border-gray-200 dark:border-neutral-border hover:border-danger hover:text-danger px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all">Reject</button>
                      </td>
                    </tr>
                  ))}
                  {withdrawals.length === 0 && (
                    <tr><td colSpan={4} className="text-center text-gray-400 py-12 font-medium">No pending withdrawals.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab 5: Support ─────────────────────────────────────────────── */}
        {tab === 'support' && (
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <div className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl p-12 text-center text-gray-400">
                <Activity className="w-10 h-10 mx-auto mb-3 text-gray-200 dark:text-neutral-border" />
                <p className="text-sm font-medium">No support tickets yet.</p>
                <p className="text-xs mt-1">Player messages will appear here for you to answer.</p>
              </div>
            ) : (
              tickets.map(tk => {
                const betRow = tk.betRef ? bets.find(b => b.id === tk.betRef || b.id.startsWith(tk.betRef!)) : undefined;
                return (
                  <div key={tk.id} className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="font-bold dark:text-white truncate">{tk.subject}</p>
                        <p className="text-[11px] font-mono text-gray-400 mt-0.5 truncate" title={tk.id}>player ref: {tk.id.slice(0, 12)}</p>
                        {tk.betRef && (
                          <p className="text-[11px] text-primary mt-1">
                            Linked bet #{tk.betRef.slice(0, 10)}
                            {betRow ? ` · ${betRow.match} (${betRow.market}, ${formatCurrency(betRow.wager)})` : ' · (bet not found)'}
                          </p>
                        )}
                      </div>
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                        tk.status === 'OPEN' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        : tk.status === 'ANSWERED' ? 'bg-success/10 text-success border border-success/20'
                        : 'bg-gray-200 text-gray-500 dark:bg-neutral-dark dark:text-gray-400'
                      }`}>{tk.status}</span>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
                      {tk.messages.map(m => (
                        <div key={m.id} className={`flex ${m.from === 'admin' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs ${
                            m.from === 'admin' ? 'bg-primary text-white rounded-br-sm' : 'bg-gray-100 dark:bg-neutral-dark text-neutral-dark dark:text-gray-200 rounded-bl-sm'
                          }`}>
                            <p className="whitespace-pre-wrap break-words">{m.body}</p>
                            <p className={`text-[9px] mt-1 ${m.from === 'admin' ? 'text-white/70' : 'text-gray-400'}`}>
                              {m.from === 'admin' ? 'You' : 'Player'} · {new Date(m.date).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {tk.status !== 'CLOSED' && (
                      <div className="flex gap-2">
                        <input
                          value={replyDrafts[tk.id] || ''}
                          onChange={e => setReplyDrafts(d => ({ ...d, [tk.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleTicketReply(tk.id)}
                          placeholder="Write a reply to the player…"
                          className="flex-grow px-3 py-2 text-xs border border-gray-200 dark:border-neutral-border rounded-lg bg-transparent focus:outline-none focus:border-primary dark:text-white"
                        />
                        <button onClick={() => handleTicketReply(tk.id)} className="bg-primary text-white text-xs font-bold px-4 rounded-lg hover:bg-primary-dark transition-colors">Reply</button>
                        <button onClick={() => handleTicketClose(tk.id)} className="bg-transparent border border-gray-200 dark:border-neutral-border text-gray-400 hover:text-danger hover:border-danger text-xs font-bold px-3 rounded-lg transition-all">Close</button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── Tab 6: Settings ────────────────────────────────────────────── */}
        {tab === 'settings' && config && (
          <div className="max-w-xl space-y-6">
            <form onSubmit={handleSaveConfig} className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-bold dark:text-white">Bookmaker Configuration</h3>
                <p className="text-xs text-gray-400 mt-0.5">Live overrides — takes effect immediately on next bet</p>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1.5">House Margin / Vigorish (%)</label>
                <div className="relative">
                  <input type="number" step="0.1" min="1" max="20" value={marginInput} onChange={e => setMarginInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-neutral-border bg-transparent rounded-xl text-xs font-semibold focus:outline-none focus:border-primary dark:text-white" />
                  <span className="absolute right-3.5 top-2.5 font-bold text-xs text-gray-400">%</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Typical bookmakers: 5–10%. Lower = more attractive odds for players.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Min Bet (USD)', val: minBetInput, set: setMinBetInput },
                  { label: 'Max Bet (USD)', val: maxBetInput, set: setMaxBetInput },
                  { label: 'Min Withdrawal (USD)', val: minWdInput, set: setMinWdInput },
                  { label: 'Max Withdrawal (USD)', val: maxWdInput, set: setMaxWdInput },
                  { label: 'Max Liability / outcome (USD, 0 = off)', val: maxLiabInput, set: setMaxLiabInput },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1.5">{label}</label>
                    <input type="number" step="0.01" min="0" value={val} onChange={e => set(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-neutral-border bg-transparent rounded-xl text-xs font-semibold focus:outline-none focus:border-primary dark:text-white" />
                  </div>
                ))}
              </div>

              <button type="submit" disabled={configBusy}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/10 transition-colors">
                {configBusy ? 'Saving…' : 'Save Configuration'}
              </button>
            </form>

            {/* Admin info */}
            <div className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold dark:text-white">Session Info</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-gray-400">Logged in as</span><span className="font-bold dark:text-white">{user?.email}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Admin role</span><span className="font-bold text-success">✓ Verified</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Auth method</span><span className="font-bold dark:text-white">Firebase Email (Google)</span></div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── User Details Slideover ─────────────────────────────────────── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end bg-neutral-dark/60 backdrop-blur-sm animate-fade-in" onClick={e => { if (e.target === e.currentTarget) setSelectedUser(null); }}>
          <div className="w-full max-w-xl bg-white dark:bg-neutral-dark-gray h-full border-l border-gray-200 dark:border-neutral-border p-6 overflow-y-auto flex flex-col shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-neutral-border pb-4 mb-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold dark:text-white">Player Profile</h3>
                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                    selectedUser.deleted
                      ? 'bg-gray-200 text-gray-500 dark:bg-neutral-dark dark:text-gray-400'
                      : selectedUser.suspended ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
                  }`}>
                    {selectedUser.deleted ? 'DELETED' : selectedUser.suspended ? 'SUSPENDED' : 'ACTIVE'}
                  </span>
                </div>
                {selectedUser.email && <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[320px]">{selectedUser.email}</p>}
                <p className="text-[10px] font-mono text-gray-400 mt-0.5 truncate max-w-[320px]" title={selectedUser.deviceId}>{selectedUser.deviceId}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={downloadPlayerStatement}
                  title="Download full player statement (PDF)"
                  className="flex items-center gap-1.5 text-[10px] font-bold text-white bg-primary hover:bg-primary-dark px-3 py-2 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-danger transition-colors p-1">
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Key figures — always visible regardless of tab */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              <div className="border border-gray-200 dark:border-neutral-border rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-gray-400"><Wallet className="w-3 h-3" /><p className="text-[9px] font-bold uppercase">Balance</p></div>
                <p className="text-base font-bold mt-1 tabular-nums dark:text-white">{formatCurrency(selectedUser.balance)}</p>
              </div>
              <div className="border border-gray-200 dark:border-neutral-border rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-gray-400"><Scale className="w-3 h-3" /><p className="text-[9px] font-bold uppercase">Player P/L</p></div>
                <p className={`text-base font-bold mt-1 tabular-nums ${playerStats.pnl > 0 ? 'text-success' : playerStats.pnl < 0 ? 'text-danger' : 'dark:text-white'}`}>
                  {playerStats.pnl > 0 ? '+' : ''}{formatCurrency(playerStats.pnl)}
                </p>
              </div>
              <div className="border border-gray-200 dark:border-neutral-border rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-gray-400"><Ticket className="w-3 h-3" /><p className="text-[9px] font-bold uppercase">Bets W·L·Open</p></div>
                <p className="text-base font-bold mt-1 tabular-nums dark:text-white">
                  <span className="text-success">{playerStats.won}</span> · <span className="text-danger">{playerStats.lost}</span> · <span className="text-amber-500">{playerStats.pending}</span>
                </p>
              </div>
              <div className="border border-gray-200 dark:border-neutral-border rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-gray-400"><ArrowUpCircle className="w-3 h-3" /><p className="text-[9px] font-bold uppercase">Deposits</p></div>
                <p className="text-base font-bold mt-1 tabular-nums dark:text-white">{playerStats.depositCount}×</p>
                <p className="text-[10px] text-gray-400 tabular-nums">{formatCurrency(playerStats.depositTotal)}</p>
              </div>
              <div className="border border-gray-200 dark:border-neutral-border rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-gray-400"><ArrowDownCircle className="w-3 h-3" /><p className="text-[9px] font-bold uppercase">Withdrawals</p></div>
                <p className="text-base font-bold mt-1 tabular-nums dark:text-white">{playerStats.withdrawalCount}×</p>
                <p className="text-[10px] text-gray-400 tabular-nums">{formatCurrency(playerStats.withdrawalTotal)}</p>
              </div>
              <div className="border border-gray-200 dark:border-neutral-border rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-gray-400"><ShieldAlert className="w-3 h-3" /><p className="text-[9px] font-bold uppercase">KYC</p></div>
                <p className={`text-sm font-bold mt-1.5 ${selectedUser.verified ? 'text-success' : 'text-amber-500'}`}>
                  {selectedUser.verified ? '✓ Verified' : '✗ Unverified'}
                </p>
              </div>
            </div>

            {/* Panel tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-neutral-dark rounded-xl p-1 mb-5">
              {([
                ['overview', 'Manage', UserIcon],
                ['bets', `Bet History (${playerBets.length})`, History],
                ['transactions', `Transactions (${userWallet?.transactions.length ?? 0})`, ReceiptIcon],
              ] as const).map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setModalTab(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold rounded-lg transition-colors ${
                    modalTab === key ? 'bg-white dark:bg-neutral-dark-card text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            <div className="flex-1">
              {/* ── Manage tab ── */}
              {modalTab === 'overview' && (
                <div className="space-y-5">
                  {selectedUser.deleted && (
                    <div className="bg-gray-100 dark:bg-neutral-dark border border-gray-200 dark:border-neutral-border rounded-xl p-3.5 text-[11px] text-gray-500 dark:text-gray-400">
                      This account is <span className="font-bold">deleted</span>. The record is kept for the audit trail; all actions are disabled and the player can no longer bet, deposit or withdraw.
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={toggleUserSuspension} disabled={modalBusy || selectedUser.deleted}
                      className={`py-2 px-3 text-[10px] font-bold uppercase rounded-lg border transition-all disabled:opacity-40 disabled:pointer-events-none ${
                        selectedUser.suspended ? 'bg-success/10 border-success/20 text-success hover:bg-success hover:text-white hover:border-transparent' : 'bg-danger/10 border-danger/20 text-danger hover:bg-danger hover:text-white hover:border-transparent'
                      }`}>
                      {selectedUser.suspended ? 'Activate Account' : 'Suspend Account'}
                    </button>
                    <button onClick={toggleUserKyc} disabled={modalBusy || selectedUser.deleted}
                      className={`py-2 px-3 text-[10px] font-bold uppercase rounded-lg border transition-all disabled:opacity-40 disabled:pointer-events-none ${
                        selectedUser.verified ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-success/10 border-success/20 text-success'
                      }`}>
                      {selectedUser.verified ? 'Revoke KYC' : 'Verify KYC'}
                    </button>
                    {!selectedUser.deleted && (
                      <button onClick={() => setConfirmingDelete(true)} disabled={modalBusy}
                        className="py-2 px-3 text-[10px] font-bold uppercase rounded-lg border bg-transparent border-gray-200 dark:border-neutral-border text-gray-400 hover:bg-danger hover:text-white hover:border-transparent transition-all disabled:opacity-40">
                        Delete Account
                      </button>
                    )}
                  </div>

                  {confirmingDelete && (
                    <div className="bg-danger/5 border border-danger/30 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-bold text-danger">Are you sure you want to delete this account?</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        The player will be locked out permanently — no bets, deposits or withdrawals. The account record stays visible here for the audit trail. This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button onClick={handleDeleteUser} disabled={modalBusy}
                          className="bg-danger hover:opacity-90 text-white text-[10px] font-bold uppercase px-4 py-2 rounded-lg transition-all disabled:opacity-50">
                          {modalBusy ? 'Deleting…' : 'Yes, delete account'}
                        </button>
                        <button onClick={() => setConfirmingDelete(false)} disabled={modalBusy}
                          className="bg-transparent border border-gray-200 dark:border-neutral-border text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase px-4 py-2 rounded-lg transition-all">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Balance adjustment */}
                  {!selectedUser.deleted && (
                  <form onSubmit={handleAdjustBalance} className="border border-gray-200 dark:border-neutral-border rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold dark:text-white">Adjust Wallet Balance</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Amount (USD, can be negative)</label>
                        <input type="number" step="0.01" required value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
                          placeholder="e.g. 50 or -20"
                          className="w-full px-3.5 py-2 border border-gray-200 dark:border-neutral-border bg-transparent rounded-xl text-xs focus:outline-none focus:border-primary dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Note</label>
                        <input type="text" value={adjustNote} onChange={e => setAdjustNote(e.target.value)}
                          placeholder="Admin adjustment"
                          className="w-full px-3.5 py-2 border border-gray-200 dark:border-neutral-border bg-transparent rounded-xl text-xs focus:outline-none focus:border-primary dark:text-white" />
                      </div>
                    </div>
                    <button type="submit" disabled={modalBusy || !adjustAmount}
                      className="w-full py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-lg transition-colors">
                      {modalBusy ? 'Processing…' : 'Apply Delta'}
                    </button>
                  </form>
                  )}

                  <div className="border border-gray-200 dark:border-neutral-border rounded-xl p-4 text-[11px] text-gray-400 space-y-1.5">
                    <p><span className="font-bold text-gray-500 dark:text-gray-300">Total staked:</span> {formatCurrency(selectedUser.totalStaked)} across {selectedUser.bets} bet{selectedUser.bets === 1 ? '' : 's'}</p>
                    <p><span className="font-bold text-gray-500 dark:text-gray-300">House result on this player:</span> <span className={playerStats.pnl < 0 ? 'text-success font-bold' : playerStats.pnl > 0 ? 'text-danger font-bold' : ''}>{playerStats.pnl < 0 ? '+' : playerStats.pnl > 0 ? '−' : ''}{formatCurrency(Math.abs(playerStats.pnl))}</span></p>
                  </div>
                </div>
              )}

              {/* ── Bet history tab ── */}
              {modalTab === 'bets' && (
                playerBets.length === 0 ? (
                  <div className="text-center py-10 text-xs text-gray-400">
                    <Ticket className="w-8 h-8 mx-auto mb-2 text-gray-200 dark:text-neutral-border" />
                    This player hasn't placed any bets yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {playerBets.map(b => (
                      <div key={b.id} className="border border-gray-200 dark:border-neutral-border rounded-xl p-3.5 hover:border-primary/30 transition-colors">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold dark:text-white truncate" title={b.match}>{b.match}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{b.market} · {new Date(b.placedDate).toLocaleString()}</p>
                          </div>
                          <StatusBadge status={b.status} />
                        </div>
                        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-100 dark:border-neutral-border/60">
                          <p className="text-[11px] tabular-nums">
                            <span className="text-gray-400">Stake</span> <span className="font-bold">{formatCurrency(b.wager)}</span>
                            <span className="text-gray-400 ml-2">@ {b.odds.toFixed(2)}</span>
                            {b.payout > 0 && <span className="text-success font-bold ml-2">→ {formatCurrency(b.payout)}</span>}
                          </p>
                          <div className="flex items-center gap-1.5">
                            {b.status === 'PENDING' && !selectedUser.deleted && (
                              <>
                                <button onClick={() => handleSettleBet(b.id, 'WON')} className="bg-success/10 hover:bg-success text-success hover:text-white px-2 py-1 rounded text-[9px] font-bold transition-all">W</button>
                                <button onClick={() => handleSettleBet(b.id, 'LOST')} className="bg-danger/10 hover:bg-danger text-danger hover:text-white px-2 py-1 rounded text-[9px] font-bold transition-all">L</button>
                              </>
                            )}
                            <button
                              onClick={() => downloadBetReceipt(b)}
                              title="Download PDF receipt"
                              className="flex items-center gap-1 text-[9px] font-bold text-gray-400 hover:text-primary border border-gray-200 dark:border-neutral-border rounded px-2 py-1 transition-colors"
                            >
                              <Download className="w-3 h-3" /> Receipt
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* ── Transactions tab ── */}
              {modalTab === 'transactions' && (
                userWallet ? (
                  <div className="border border-gray-200 dark:border-neutral-border rounded-xl overflow-hidden">
                    <table className="w-full text-[11px] text-left">
                      <thead className="text-[9px] uppercase font-bold text-gray-400 border-b border-gray-200 dark:border-neutral-border bg-gray-50/50 dark:bg-neutral-dark/30">
                        <tr>
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2">Type</th>
                          <th className="px-4 py-2">Amount</th>
                          <th className="px-4 py-2">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-neutral-border">
                        {userWallet.transactions.map(tx => (
                          <tr key={tx.id} className="dark:hover:bg-neutral-dark/10">
                            <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{new Date(tx.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 font-semibold">{tx.type}</td>
                            <td className={`px-4 py-3 font-bold tabular-nums ${tx.amount >= 0 ? 'text-success' : 'text-danger'}`}>
                              {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                            </td>
                            <td className="px-4 py-3 text-gray-400 max-w-[160px] truncate" title={tx.description}>{tx.description}</td>
                          </tr>
                        ))}
                        {userWallet.transactions.length === 0 && (
                          <tr><td colSpan={4} className="text-center text-gray-400 py-6">No transactions yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-gray-400 flex items-center justify-center gap-2">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Loading wallet logs…
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminScreen;

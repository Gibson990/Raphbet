import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Clock
} from 'lucide-react';
import {
  fetchAdminStats, fetchAdminUsers, fetchAdminBets, fetchAdminWithdrawals,
  approveWithdrawal, rejectWithdrawal,
  adjustUserBalance, setUserKyc, setUserSuspended,
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

// ─── Revenue Chart (redesigned) ───────────────────────────────────────────────
const RevenueChart: React.FC<{ daily: DailyStat[] }> = ({ daily }) => {
  const { format: formatVal } = useCurrency();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!daily || daily.length === 0) return (
    <div className="w-full bg-white dark:bg-neutral-dark-gray border border-gray-100 dark:border-neutral-border/40 rounded-2xl p-8 flex flex-col items-center justify-center h-56 gap-3">
      <BarChart3 className="w-10 h-10 text-gray-200 dark:text-neutral-border" />
      <p className="text-xs text-gray-400 font-medium">No betting activity in the last 7 days yet.</p>
      <p className="text-[10px] text-gray-300 dark:text-gray-600">Place some bets to see trends appear here.</p>
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

  const maxVal = Math.max(...daily.map(d => Math.max(d.wagers, d.payouts, Math.abs(d.ggr), 1))) * 1.15;

  const getX = (i: number) => padL + (i * chartW) / Math.max(daily.length - 1, 1);
  const getY = (val: number) => padT + chartH - (val * chartH) / maxVal;

  // Smooth cubic-bezier path generator
  const getSmoothPath = (key: 'wagers' | 'payouts' | 'ggr') => {
    const pts = daily.map((d, i) => ({ x: getX(i), y: getY(Math.max(d[key], 0)) }));
    if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y}`;
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1].x + pts[i].x) / 2;
      path += ` C ${cpx} ${pts[i - 1].y}, ${cpx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
    }
    return path;
  };

  const getAreaPath = (key: 'wagers' | 'payouts' | 'ggr') => {
    const linePath = getSmoothPath(key);
    const lastPt = daily.length - 1;
    return `${linePath} L ${getX(lastPt)} ${padT + chartH} L ${getX(0)} ${padT + chartH} Z`;
  };

  const yTicks = 5;
  const lines = [
    { key: 'wagers' as const, color: '#FF6B35', label: 'Wagers' },
    { key: 'payouts' as const, color: '#8B5CF6', label: 'Payouts' },
    { key: 'ggr' as const, color: '#10B981', label: 'GGR' },
  ];

  return (
    <div className="w-full bg-white dark:bg-neutral-dark-gray border border-gray-100 dark:border-neutral-border/40 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold dark:text-white tracking-tight">Revenue & Stake Trends</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Last 7 days · real-time data</p>
          </div>
        </div>
        <div className="flex gap-5">
          {lines.map(l => (
            <span key={l.key} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <span className="w-3 h-[3px] rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pb-3 relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ minHeight: 200 }}>
          <defs>
            <linearGradient id="area-wagers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#FF6B35" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="area-payouts" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="area-ggr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Y-axis grid */}
          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const y = padT + (i * chartH) / yTicks;
            const val = maxVal * (1 - i / yTicks);
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="currentColor" className="text-gray-100 dark:text-neutral-border/25" strokeWidth="0.8" />
                <text x={padL - 8} y={y + 3} textAnchor="end" className="fill-gray-400 dark:fill-gray-600 select-none" fontSize="9" fontWeight="600">
                  {/* Compact tick labels so the axis stays readable at any scale (k / m / b). */}
                  {val >= 1e9 ? `${(val / 1e9).toFixed(1)}b` : val >= 1e6 ? `${(val / 1e6).toFixed(1)}m` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val >= 1 ? val.toFixed(0) : '0'}
                </text>
              </g>
            );
          })}

          {/* X-axis dates */}
          {daily.map((d, i) => (
            <text key={i} x={getX(i)} y={height - 10} textAnchor="middle" className="fill-gray-400 dark:fill-gray-600 select-none" fontSize="9" fontWeight="600">
              {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          ))}

          {/* Area fills */}
          <path d={getAreaPath('wagers')} fill="url(#area-wagers)" />
          <path d={getAreaPath('payouts')} fill="url(#area-payouts)" />
          <path d={getAreaPath('ggr')} fill="url(#area-ggr)" />

          {/* Lines */}
          {lines.map(l => (
            <path key={l.key} d={getSmoothPath(l.key)} fill="none" stroke={l.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          ))}

          {/* Hover crosshair + dots */}
          {hoveredIdx !== null && (
            <line x1={getX(hoveredIdx)} y1={padT} x2={getX(hoveredIdx)} y2={padT + chartH} stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
          )}

          {/* Interactive data points */}
          {daily.map((d, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g key={i} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)} className="cursor-pointer">
                {/* Invisible hit area */}
                <rect x={getX(i) - 18} y={padT} width={36} height={chartH} fill="transparent" />
                {lines.map(l => {
                  const cy = getY(Math.max(d[l.key], 0));
                  return (
                    <g key={l.key}>
                      {isHovered && <circle cx={getX(i)} cy={cy} r="8" fill={l.color} opacity="0.15" />}
                      <circle cx={getX(i)} cy={cy} r={isHovered ? 4.5 : 3} fill={l.color} stroke="white" strokeWidth="2" className="transition-all duration-150" />
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

  // Settings
  const [marginInput, setMarginInput] = useState('');
  const [minBetInput, setMinBetInput] = useState('');
  const [maxBetInput, setMaxBetInput] = useState('');
  const [minWdInput, setMinWdInput] = useState('');
  const [maxWdInput, setMaxWdInput] = useState('');
  const [configBusy, setConfigBusy] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [s, u, b, wd, cfg, tk] = await Promise.all([
        fetchAdminStats(''),
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

  const openUserDetails = async (u: AdminUser) => {
    setSelectedUser(u);
    setUserWallet(null);
    setAdjustAmount('');
    setAdjustNote('');
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
    } catch {
      showToast('Failed to adjust balance.', 'error');
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
            const labelMap = {
              overview: '📊 Overview',
              users: '👥 Players',
              bets: '🎟️ Bets Board',
              withdrawals: '🏦 Withdrawals',
              support: '💬 Support',
              settings: '⚙️ Settings',
            };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-2.5 px-5 text-xs font-semibold tracking-tight rounded-xl transition-all duration-300 flex items-center gap-2 ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/15'
                    : 'text-gray-400 hover:text-neutral-dark dark:hover:text-white hover:bg-gray-50 dark:hover:bg-neutral-dark/45'
                }`}
              >
                <span>{labelMap[t]}</span>
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
            {stats.daily && <RevenueChart daily={stats.daily} />}
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
                    <tr key={u.deviceId} className="hover:bg-gray-50/50 dark:hover:bg-neutral-dark/10 transition-colors">
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
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${u.suspended ? 'bg-danger/10 text-danger border-danger/20' : 'bg-success/10 text-success border-success/20'}`}>
                          {u.suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold tabular-nums">{formatCurrency(u.totalStaked)}</td>
                      <td className="px-5 py-4 text-right tabular-nums">{u.bets}</td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => openUserDetails(u)}
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
          <div className="w-full max-w-lg bg-white dark:bg-neutral-dark-gray h-full border-l border-gray-200 dark:border-neutral-border p-6 overflow-y-auto flex flex-col shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-neutral-border pb-4 mb-6">
              <div>
                <h3 className="text-sm font-bold dark:text-white">Player Profile</h3>
                <p className="text-[10px] font-mono text-gray-400 mt-0.5 truncate max-w-[300px]" title={selectedUser.deviceId}>{selectedUser.deviceId}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-danger transition-colors">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5">
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-gray-200 dark:border-neutral-border rounded-xl p-3.5">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Balance</p>
                  <p className="text-xl font-bold mt-1 tabular-nums dark:text-white">{formatCurrency(selectedUser.balance)}</p>
                </div>
                <div className="border border-gray-200 dark:border-neutral-border rounded-xl p-3.5">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Total Staked</p>
                  <p className="text-xl font-bold mt-1 tabular-nums dark:text-white">{formatCurrency(selectedUser.totalStaked)}</p>
                </div>
                <div className="border border-gray-200 dark:border-neutral-border rounded-xl p-3.5">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Total Bets</p>
                  <p className="text-xl font-bold mt-1 dark:text-white">{selectedUser.bets}</p>
                </div>
                <div className="border border-gray-200 dark:border-neutral-border rounded-xl p-3.5">
                  <p className="text-[9px] font-bold text-gray-400 uppercase">KYC Status</p>
                  <p className={`text-sm font-bold mt-2 ${selectedUser.verified ? 'text-success' : 'text-amber-500'}`}>
                    {selectedUser.verified ? '✓ Verified' : '✗ Unverified'}
                  </p>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <button onClick={toggleUserSuspension} disabled={modalBusy}
                  className={`py-2 px-3 text-[10px] font-bold uppercase rounded-lg border transition-all ${
                    selectedUser.suspended ? 'bg-success/10 border-success/20 text-success hover:bg-success hover:text-white hover:border-transparent' : 'bg-danger/10 border-danger/20 text-danger hover:bg-danger hover:text-white hover:border-transparent'
                  }`}>
                  {selectedUser.suspended ? 'Activate Account' : 'Suspend Account'}
                </button>
                <button onClick={toggleUserKyc} disabled={modalBusy}
                  className={`py-2 px-3 text-[10px] font-bold uppercase rounded-lg border transition-all ${
                    selectedUser.verified ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-success/10 border-success/20 text-success'
                  }`}>
                  {selectedUser.verified ? 'Revoke KYC' : 'Verify KYC'}
                </button>
              </div>

              {/* Balance adjustment */}
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

              {/* Transaction history */}
              <div>
                <h4 className="text-xs font-bold dark:text-white mb-3">Transaction History</h4>
                {userWallet ? (
                  <div className="border border-gray-200 dark:border-neutral-border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
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
                            <td className="px-4 py-3 text-gray-400 max-w-[130px] truncate" title={tx.description}>{tx.description}</td>
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminScreen;

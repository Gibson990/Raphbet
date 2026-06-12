import React, { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import { ResultModal } from '../common/ResultModal';
import { ToastMessage } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';
import { fetchLimits, cachedLimits, usd, type AppLimits } from '../../services/config';

interface WithdrawModalProps {
    onClose: () => void;
    onWithdraw: (amount: number, address: string) => Promise<{ success: boolean, message: string }>;
    addToast: (message: string, type: ToastMessage['type']) => void;
    balance: number; // USD cents
}

// Detects which network an address belongs to from its format, like wallets
// do. We only pay out USDT on TRON, so any other recognised network renders
// as a labeled warning ("that's a Bitcoin address") instead of a generic
// validation error.
interface DetectedNetwork {
    name: string;    // e.g. "Bitcoin"
    symbol: string;  // badge glyph
    bg: string;      // badge color
    accepted: boolean;
}

const NETWORK_PATTERNS: { re: RegExp; net: DetectedNetwork }[] = [
    { re: /^T[1-9A-HJ-NP-Za-km-z]{33}$/, net: { name: 'USDT · TRON (TRC-20)', symbol: '₮', bg: '#26A17B', accepted: true } },
    { re: /^(bc1[a-z0-9]{25,59}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/, net: { name: 'Bitcoin', symbol: '₿', bg: '#F7931A', accepted: false } },
    { re: /^0x[a-fA-F0-9]{40}$/, net: { name: 'Ethereum / BSC (0x…)', symbol: 'Ξ', bg: '#627EEA', accepted: false } },
    { re: /^(ltc1[a-z0-9]{25,59}|[LM][1-9A-HJ-NP-Za-km-z]{26,33})$/, net: { name: 'Litecoin', symbol: 'Ł', bg: '#345D9D', accepted: false } },
    { re: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/, net: { name: 'XRP', symbol: 'X', bg: '#23292F', accepted: false } },
    { re: /^D[1-9A-HJ-NP-Za-km-z]{25,33}$/, net: { name: 'Dogecoin', symbol: 'Ð', bg: '#C2A633', accepted: false } },
];

const detectNetwork = (address: string): DetectedNetwork | null =>
    NETWORK_PATTERNS.find(p => p.re.test(address))?.net ?? null;

const WithdrawModal: React.FC<WithdrawModalProps> = ({ onClose, onWithdraw, addToast, balance }) => {
    const [amount, setAmount] = useState(0); // USD dollars
    const [address, setAddress] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState<number | null>(null); // cents, set on success
    const [limits, setLimits] = useState<AppLimits>(cachedLimits());
    const { format, code } = useCurrency();
    const showConverted = code !== 'USD' && code !== 'USDT';
    useEffect(() => { fetchLimits().then(setLimits); }, []);

    const cents = Math.round(amount * 100);
    const minUsd = limits.minWithdrawal / 100;
    const maxUsd = Math.min(balance, limits.maxWithdrawal) / 100;
    const inRange = cents >= limits.minWithdrawal && cents <= Math.min(balance, limits.maxWithdrawal);

    // TRON (TRC-20) addresses are base58, start with "T", 34 chars. A wrong
    // address means lost funds, so block submission on an obvious mismatch.
    // detectNetwork names the network a non-TRON address belongs to so the
    // error explains itself ("that's a Bitcoin address").
    const trimmedAddress = address.trim();
    const detected = trimmedAddress ? detectNetwork(trimmedAddress) : null;
    const addressValid = !!detected?.accepted;
    const showAddressError = trimmedAddress.length > 0 && !detected;

    const setPercent = (pct: number) => {
        const target = Math.floor((maxUsd * pct) / 100 * 100) / 100; // 2dp, never above max
        setAmount(target);
    };

    const handleSubmit = async () => {
        if (!addressValid) { addToast('Enter a valid USDT (TRC-20) wallet address.', 'error'); return; }
        if (!inRange) { addToast(`Amount must be between ${usd(limits.minWithdrawal)} and ${usd(Math.min(balance, limits.maxWithdrawal))}.`, 'error'); return; }
        setSubmitting(true);
        const result = await onWithdraw(cents, address.trim());
        setSubmitting(false);
        if (result.success) {
            setDone(cents); // show the success screen
        } else {
            addToast(result.message, 'error');
        }
    };

    // Success screen — shown after the request is accepted (funds held, pending review).
    if (done !== null) {
        return (
            <ResultModal
                variant="success"
                title="Withdrawal requested"
                message="Your funds are held and the payout is pending review — usually completed within a few hours."
                details={[
                    { label: 'Amount', value: usd(done), accent: true },
                    { label: 'To address', value: address.slice(0, 10) + '…' },
                    { label: 'Status', value: 'Pending review' },
                ]}
                primaryLabel="Done"
                onPrimary={onClose}
                onClose={onClose}
            />
        );
    }

    return (
        <Modal title="Withdraw crypto" onClose={onClose}>
            <div className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (USD)</label>
                    <p className="text-xs text-gray-400 mb-2">Min {usd(limits.minWithdrawal)} · Max {usd(limits.maxWithdrawal)} · Available {usd(balance)}</p>
                    <input
                        type="number"
                        value={amount || ''}
                        onChange={(e) => setAmount(Math.min(parseFloat(e.target.value) || 0, maxUsd))}
                        placeholder="0.00"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-border rounded-md focus:ring-primary focus:border-primary bg-transparent"
                    />
                    <div className="grid grid-cols-4 gap-2 mt-2">
                        {[25, 50, 75].map(pct => (
                            <button key={pct} onClick={() => setPercent(pct)} className="bg-gray-200 dark:bg-neutral-dark text-sm rounded-md py-1.5 hover:bg-primary hover:text-white transition-colors">
                                {pct}%
                            </button>
                        ))}
                        <button onClick={() => setPercent(100)} className="bg-gray-200 dark:bg-neutral-dark text-sm font-semibold rounded-md py-1.5 hover:bg-primary hover:text-white transition-colors">
                            Max
                        </button>
                    </div>
                    {showConverted && cents > 0 && (
                        <p className="text-xs text-gray-400 mt-1">≈ <span className="font-semibold">{format(cents)}</span> in {code}</p>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">USDT address (TRC-20)</label>
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="T..."
                        className={`w-full px-4 py-2 border rounded-md focus:ring-primary focus:border-primary bg-transparent font-mono text-sm ${
                            addressValid ? 'border-success' : (showAddressError || (detected && !detected.accepted)) ? 'border-danger' : 'border-gray-300 dark:border-neutral-border'
                        }`}
                    />
                    {detected && (
                        <div className={`mt-2 flex items-start gap-2.5 rounded-lg border p-2.5 ${
                            detected.accepted ? 'border-success/30 bg-success/5' : 'border-danger/30 bg-danger/5'
                        }`}>
                            <span
                                className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-white font-extrabold text-sm shrink-0"
                                style={{ background: detected.bg }}
                            >
                                {detected.symbol}
                            </span>
                            {detected.accepted ? (
                                <p className="text-xs font-semibold text-success pt-1.5">{detected.name} — address looks valid ✓</p>
                            ) : (
                                <p className="text-xs text-danger">
                                    <span className="font-bold">This is a {detected.name} address.</span>{' '}
                                    We send withdrawals as USDT on TRON (TRC-20) only — funds sent to this address would be lost.
                                </p>
                            )}
                        </div>
                    )}
                    {showAddressError && (
                        <p className="text-xs text-danger mt-1">That doesn't look like a TRC-20 address — it should start with "T" and be 34 characters.</p>
                    )}
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={!inRange || !addressValid || submitting}
                    className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-dark transition-colors disabled:bg-gray-400"
                >
                    {submitting ? 'Requesting…' : `Withdraw $${amount > 0 ? amount.toFixed(2) : '0.00'}`}
                </button>
                <p className="text-center text-xs text-gray-400">Withdrawals are reviewed before payout (usually within a few hours). The amount is held from your balance immediately.</p>
            </div>
        </Modal>
    );
};

export default WithdrawModal;

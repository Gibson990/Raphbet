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

    const handleSubmit = async () => {
        if (!address.trim()) { addToast('Enter your USDT (TRC-20) wallet address.', 'error'); return; }
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
                        className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-border rounded-md focus:ring-primary focus:border-primary bg-transparent font-mono text-sm"
                    />
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={!inRange || !address || submitting}
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

import React, { useState } from 'react';
import Modal from '../common/Modal';
import { ToastMessage } from '../../App';

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
    const maxUsd = balance / 100;

    const handleSubmit = async () => {
        if (!address.trim()) { addToast('Enter your USDT (TRC-20) wallet address.', 'error'); return; }
        setSubmitting(true);
        const result = await onWithdraw(Math.round(amount * 100), address.trim());
        setSubmitting(false);
        if (result.success) {
            addToast(result.message, 'success');
            onClose();
        } else {
            addToast(result.message, 'error');
        }
    };

    return (
        <Modal title="Withdraw crypto" onClose={onClose}>
            <div className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (USD)</label>
                    <p className="text-xs text-gray-400 mb-2">Available: ${maxUsd.toFixed(2)}</p>
                    <input
                        type="number"
                        value={amount || ''}
                        onChange={(e) => setAmount(Math.min(parseFloat(e.target.value) || 0, maxUsd))}
                        placeholder="0.00"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-border rounded-md focus:ring-primary focus:border-primary bg-transparent"
                    />
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
                    disabled={amount <= 0 || !address || submitting}
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

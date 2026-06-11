import React, { useState } from 'react';
import Modal from '../common/Modal';
import { ToastMessage } from '../../App';
import { useCurrency } from '../../contexts/CurrencyContext';

const MIN_DEPOSIT_CENTS = 100; // NOWPayments invoice minimum (~$1)

interface TopUpModalProps {
    onClose: () => void;
    onTopUp: (amount: number, method: string) => Promise<{ success: boolean, message: string, redirectUrl?: string }>;
    addToast: (message: string, type: ToastMessage['type']) => void;
}

const TopUpModal: React.FC<TopUpModalProps> = ({ onClose, onTopUp, addToast }) => {
    const [amount, setAmount] = useState(10); // USD dollars
    const [submitting, setSubmitting] = useState(false);
    const quickAmounts = [5, 10, 25, 50];
    const { format, code } = useCurrency();
    const cents = Math.round(amount * 100);
    const showConverted = code !== 'USD' && code !== 'USDT';
    const belowMin = cents > 0 && cents < MIN_DEPOSIT_CENTS;

    const handleSubmit = async () => {
        setSubmitting(true);
        const result = await onTopUp(Math.round(amount * 100), 'Crypto'); // -> USD cents
        setSubmitting(false);
        if (result.redirectUrl) {
            window.location.href = result.redirectUrl; // hosted crypto checkout
            return;
        }
        if (result.success) {
            addToast(result.message, 'success');
            onClose();
        } else {
            addToast(result.message, 'error');
        }
    };

    return (
        <Modal title="Deposit crypto" onClose={onClose}>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount (USD)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                        className="w-full pl-4 pr-2 py-2 border border-gray-300 dark:border-neutral-border rounded-md focus:ring-primary focus:border-primary bg-transparent"
                    />
                    <div className="grid grid-cols-4 gap-2 mt-2">
                        {quickAmounts.map(q => (
                            <button key={q} onClick={() => setAmount(q)} className="bg-gray-200 dark:bg-neutral-dark text-sm rounded-md py-1.5 hover:bg-primary hover:text-white transition-colors">
                                ${q}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Minimum deposit $1.00 · no maximum.
                        {showConverted && cents > 0 && <> You'll deposit ≈ <span className="font-semibold">{format(cents)}</span>.</>}
                    </p>
                    {belowMin && <p className="text-xs text-danger mt-1">Minimum deposit is $1.00.</p>}
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-neutral-border p-3">
                    <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-[#F7931A] text-white font-extrabold">₿</div>
                    <div>
                        <p className="text-sm font-semibold">Pay with crypto</p>
                        <p className="text-xs text-gray-400">USDT, BTC, ETH and 200+ coins via NOWPayments</p>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={amount <= 0 || belowMin || submitting}
                    className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-primary-dark transition-colors disabled:bg-gray-400"
                >
                    {submitting ? 'Opening checkout…' : 'Continue to checkout'}
                </button>
                <p className="text-center text-xs text-gray-400">You'll be redirected to a secure payment page. Your balance updates once the payment confirms.</p>
            </div>
        </Modal>
    );
};

export default TopUpModal;

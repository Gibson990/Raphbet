import React, { useState } from 'react';
import Modal from '../common/Modal';
import { ToastMessage } from '../../App';
import { AirtelMoneyIcon, MpesaIcon, StripeIcon } from '../icons';

interface TopUpModalProps {
    onClose: () => void;
    onTopUp: (amount: number, method: string) => { success: boolean, message: string };
    addToast: (message: string, type: ToastMessage['type']) => void;
}

type PaymentMethod = 'Airtel Money' | 'M-Pesa' | 'Stripe';

const TopUpModal: React.FC<TopUpModalProps> = ({ onClose, onTopUp, addToast }) => {
    const [amount, setAmount] = useState(10000);
    const [method, setMethod] = useState<PaymentMethod>('M-Pesa');

    const quickAmounts = [5000, 10000, 25000, 50000];

    const handleSubmit = () => {
        const result = onTopUp(amount, method);
        if (result.success) {
            addToast(result.message, 'success');
            onClose();
        } else {
            addToast(result.message, 'error');
        }
    }

    const PaymentMethodButton: React.FC<{ type: PaymentMethod, icon: React.ReactNode }> = ({ type, icon }) => (
        <button 
            onClick={() => setMethod(type)}
            className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-colors ${method === type ? 'border-primary' : 'border-gray-300 dark:border-gray-600'}`}
        >
            {icon}
            <span className="mt-2 text-sm font-semibold">{type}</span>
        </button>
    );

    return (
        <Modal title="Top Up Wallet" onClose={onClose}>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Amount (Tsh)
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                        className="w-full pl-4 pr-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-transparent"
                    />
                    <div className="grid grid-cols-4 gap-2 mt-2">
                        {quickAmounts.map(qAmount => (
                            <button key={qAmount} onClick={() => setAmount(qAmount)} className="bg-gray-200 dark:bg-neutral-gray text-sm rounded-md py-1.5 hover:bg-primary hover:text-white transition-colors">
                                {qAmount.toLocaleString()}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Payment Method
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        <PaymentMethodButton type="M-Pesa" icon={<MpesaIcon />} />
                        <PaymentMethodButton type="Airtel Money" icon={<AirtelMoneyIcon />} />
                        <PaymentMethodButton type="Stripe" icon={<StripeIcon />} />
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={amount <= 0}
                    className="w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400"
                >
                    Top Up {amount.toLocaleString('en-US')} Tsh
                </button>
            </div>
        </Modal>
    );
};

export default TopUpModal;
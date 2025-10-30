import React, { useState } from 'react';
import Modal from '../common/Modal';
import { ToastMessage } from '../../App';
import { AirtelMoneyIcon, MpesaIcon, StripeIcon } from '../icons';

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTopUp: (amount: number, method: string) => { success: boolean, message: string };
    addToast: (message: string, type: ToastMessage['type']) => void;
}

type PaymentMethod = 'Airtel Money' | 'M-Pesa' | 'Stripe';

const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, onClose, onTopUp, addToast }) => {
    const [amount, setAmount] = useState(10000);
    const [method, setMethod] = useState<PaymentMethod>('M-Pesa');
    const [isLoading, setIsLoading] = useState(false);

    const quickAmounts = [5000, 10000, 25000, 50000];
    const MIN_AMOUNT = 1000;
    const MAX_AMOUNT = 1000000;

    const handleAmountChange = (value: number) => {
        if (value < 0) value = 0;
        if (value > MAX_AMOUNT) value = MAX_AMOUNT;
        setAmount(value);
    };

    const handleSubmit = () => {
        if (amount < MIN_AMOUNT) {
            addToast(`Minimum amount is ${MIN_AMOUNT.toLocaleString()} Tsh`, 'error');
            return;
        }
        
        setIsLoading(true);
        const result = onTopUp(amount, method);
        setIsLoading(false);
        
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
            className={`flex flex-col items-center justify-center p-6 border-2 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md ${method === type ? 'border-primary shadow-lg' : 'border-gray-300 dark:border-gray-600'}`}
        >
            {icon}
            <span className="mt-3 text-sm font-bold">{type}</span>
        </button>
    );

    return (
        <Modal title="Top Up Wallet" isOpen={isOpen} onClose={onClose}>
            <div className="p-6 space-y-8">
                <div>
                    <label className="block text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
                        Amount (Tsh)
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => handleAmountChange(parseInt(e.target.value) || 0)}
                        min={MIN_AMOUNT}
                        max={MAX_AMOUNT}
                        step="1000"
                        aria-label="Enter top up amount"
                        className="w-full pl-4 pr-2 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-transparent text-lg"
                    />
                    <div className="grid grid-cols-4 gap-3 mt-3">
                        {quickAmounts.map(qAmount => (
                            <button key={qAmount} onClick={() => setAmount(qAmount)} className="bg-gray-200 dark:bg-neutral-gray text-sm rounded-lg py-2 hover:bg-primary hover:text-white transition-all duration-300 shadow-sm hover:shadow-md">
                                {qAmount.toLocaleString()}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
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
                    disabled={amount < MIN_AMOUNT || isLoading}
                    className="w-full bg-green-500 text-white font-bold py-4 rounded-xl hover:bg-green-600 transition-all duration-300 disabled:bg-gray-400 relative shadow-lg hover:shadow-xl"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                        </span>
                    ) : (
                        `Top Up ${amount.toLocaleString('en-US')} Tsh`
                    )}
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    Min: {MIN_AMOUNT.toLocaleString()} Tsh | Max: {MAX_AMOUNT.toLocaleString()} Tsh
                </p>
            </div>
        </Modal>
    );
};

export default TopUpModal;
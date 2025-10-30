import React, { useState, useRef } from 'react';
import Modal from '../common/Modal';
import { ToastMessage } from '../../App';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    onWithdraw: (amount: number, method: string) => { success: boolean, message: string };
    addToast: (message: string, type: ToastMessage['type']) => void;
    balance: number;
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose, onWithdraw, addToast, balance }) => {
    const [amount, setAmount] = useState(0);
    const [phone, setPhone] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [txDetails, setTxDetails] = useState({ amount: 0, phone: '', date: '', id: '' });
    const receiptRef = useRef<HTMLDivElement>(null);

    const handleSubmit = () => {
        if (!/^0[67]\d{8}$/.test(phone)) {
            addToast('Please enter a valid Tanzanian mobile number.', 'error');
            return;
        }

        const result = onWithdraw(amount, `M-Pesa (${phone})`);
        if (result.success) {
            addToast(result.message, 'success');
            try {
                setTxDetails({
                    amount: amount,
                    phone: phone,
                    date: new Date().toLocaleString(),
                    id: `WD-${Date.now()}`
                });
                setIsSuccess(true);
            } catch (error) {
                console.error("Error rendering receipt:", error);
                addToast("Error rendering receipt", "error");
            }
        } else {
            addToast(result.message, 'error');
        }
    };

    const handleDownloadPdf = async () => {
        if (!receiptRef.current) return;
        const canvas = await html2canvas(receiptRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`RaphBet-Receipt-${txDetails.id}.pdf`);
    };

    if (isSuccess) {
        return (
            <Modal title="Withdrawal Successful" isOpen={isOpen} onClose={onClose}>
                <div id="receipt" ref={receiptRef} className="bg-white p-6">
                  <WithdrawReceipt {...txDetails} />
                </div>
                <div className="p-6 flex space-x-4">
                    <button onClick={handleDownloadPdf} className="flex-1 bg-blue-500 text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-all duration-300 shadow-md hover:shadow-lg">Download PDF</button>
                    <button onClick={onClose} className="flex-1 bg-gray-500 text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition-all duration-300 shadow-md hover:shadow-lg">Close</button>
                </div>
            </Modal>
        );
    }
    
    return (
        <Modal title="Withdraw Funds" isOpen={isOpen} onClose={onClose}>
            <div className="p-6 space-y-8">
                <div>
                    <label className="block text-base font-medium text-gray-800 dark:text-gray-200 mb-2">
                        Amount to Withdraw (Tsh)
                    </label>
                    <p className="text-sm text-gray-500 mb-2">Available: {balance.toLocaleString('en-US')} Tsh</p>
                    <input
                        type="number"
                        value={amount || ''}
                        onChange={(e) => setAmount(Math.min(parseInt(e.target.value) || 0, balance))}
                        className="w-full pl-4 pr-2 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-transparent text-lg"
                    />
                </div>
                <div>
                    <label className="block text-base font-medium text-gray-800 dark:text-gray-200 mb-2">
                        M-Pesa Mobile Number
                    </label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0712 345 678"
                        className="w-full pl-4 pr-2 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-transparent text-lg"
                    />
                </div>
                 <button
                    onClick={handleSubmit}
                    disabled={amount <= 0 || !phone}
                    className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-all duration-300 disabled:bg-gray-400 shadow-lg hover:shadow-xl"
                >
                    Withdraw {amount > 0 ? amount.toLocaleString('en-US') : ''} Tsh
                </button>
            </div>
        </Modal>
    );
};

export default WithdrawModal;
import React from 'react';
import { CheckCircleIcon, SoccerBallIcon } from '../icons';

interface WithdrawReceiptProps {
    id: string;
    amount: number;
    phone: string;
    date: string;
}

const WithdrawReceipt: React.FC<WithdrawReceiptProps> = ({ id, amount, phone, date }) => {
    return (
        <div className="bg-white dark:bg-neutral-dark-gray text-neutral-dark dark:text-white p-6 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <div className="text-center pb-4 border-b border-dashed border-gray-300 dark:border-gray-600">
                 <div className="flex items-center justify-center space-x-2">
                    <SoccerBallIcon className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl font-bold tracking-wider">
                        Raph <span className="text-primary">Bet</span>
                    </h1>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Official Transaction Receipt</p>
            </div>
            
            <div className="py-6 text-center">
                <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-300">Withdrawal Sent To</p>
                <p className="text-xl font-semibold">{phone}</p>
                <p className="text-4xl font-bold text-primary my-2">
                    {amount.toLocaleString('en-US')} Tsh
                </p>
            </div>
            
            <div className="space-y-3 text-sm pt-4 border-t border-dashed border-gray-300 dark:border-gray-600">
                <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Transaction ID:</span>
                    <span className="font-mono">{id}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Date:</span>
                    <span>{date}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Status:</span>
                    <span className="font-semibold text-green-600">Completed</span>
                </div>
            </div>
        </div>
    );
};

export default WithdrawReceipt;

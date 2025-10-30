import React from 'react';
import type { Bet } from '../types';
import Modal from './common/Modal';

interface BetConfirmationModalProps {
    bets: Bet[];
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const BetConfirmationModal: React.FC<BetConfirmationModalProps> = ({
    bets,
    isOpen,
    onClose,
    onConfirm
}) => {
    const totalWager = bets.reduce((sum, bet) => sum + bet.wager, 0);
    const totalPotentialWin = bets.reduce((sum, bet) => sum + bet.wager * bet.selection.odds, 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirm Your Bets">
            <div className="p-4">
                <div className="space-y-4">
                    <div className="space-y-2">
                        {bets.map((bet, index) => (
                            <div 
                                key={bet.selection.matchId} 
                                className="flex justify-between items-start p-3 bg-gray-50 dark:bg-neutral-dark rounded-lg"
                            >
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {bet.selection.matchDescription}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-300">
                                        {bet.selection.marketLabel}
                                    </p>
                                    <div className="mt-1 flex items-center">
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                            Odds: {bet.selection.odds.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        Stake: {bet.wager.toLocaleString()} Tsh
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-300">
                                        Potential Win: {(bet.wager * bet.selection.odds).toLocaleString()} Tsh
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-gray-500 dark:text-gray-300">Total Stake:</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                                {totalWager.toLocaleString()} Tsh
                            </span>
                        </div>
                        <div className="flex justify-between text-sm mt-2">
                            <span className="font-medium text-gray-500 dark:text-gray-300">Potential Total Win:</span>
                            <span className="font-bold text-primary">
                                {totalPotentialWin.toLocaleString()} Tsh
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 space-y-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            By placing these bets, you confirm that you are over 18 and agree to our terms and conditions.
                        </p>
                        
                        <div className="flex space-x-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-neutral-dark-gray hover:bg-gray-50 dark:hover:bg-neutral-gray focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            >
                                Place Bets
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default BetConfirmationModal;
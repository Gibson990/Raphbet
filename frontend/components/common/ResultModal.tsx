import React from 'react';
import Modal from './Modal';
import { CheckCircleIcon, ShieldExclamationIcon } from '../icons';

export interface ResultDetail {
  label: string;
  value: string;
  accent?: boolean;
}

interface ResultModalProps {
  variant: 'success' | 'error';
  title: string;
  message?: string;
  details?: ResultDetail[];
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose: () => void;
}

/** Reusable success / failure result screen (deposits, withdrawals, bets, etc.). */
export const ResultModal: React.FC<ResultModalProps> = ({
  variant, title, message, details, primaryLabel, onPrimary, secondaryLabel, onSecondary, onClose,
}) => {
  const success = variant === 'success';
  return (
    <Modal title={success ? 'Success' : 'Action failed'} onClose={onClose}>
      <div className="text-center">
        <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 ${success ? 'bg-success/10' : 'bg-danger/10'}`}>
          {success
            ? <CheckCircleIcon className="h-9 w-9 text-success" />
            : <ShieldExclamationIcon className="h-9 w-9 text-danger" />}
        </div>
        <h3 className="text-lg font-extrabold">{title}</h3>
        {message && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>}

        {details && details.length > 0 && (
          <div className="mt-5 bg-gray-50 dark:bg-neutral-dark rounded-xl p-4 space-y-2 text-left">
            {details.map((d) => (
              <div key={d.label} className="flex justify-between text-sm gap-3">
                <span className="text-gray-500 dark:text-gray-400 shrink-0">{d.label}</span>
                <span className={`font-bold tabular-nums truncate ${d.accent ? 'text-success' : ''}`}>{d.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {secondaryLabel && (
            <button
              onClick={onSecondary ?? onClose}
              className="flex-1 py-2.5 rounded-xl font-bold border border-gray-300 dark:border-neutral-border hover:bg-gray-50 dark:hover:bg-neutral-dark-card transition-colors"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            onClick={onPrimary ?? onClose}
            className={`flex-1 py-2.5 rounded-xl font-bold text-white transition-all active:scale-[0.98] ${success ? 'bg-primary hover:bg-primary-dark' : 'bg-danger hover:opacity-90'}`}
          >
            {primaryLabel ?? 'Done'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

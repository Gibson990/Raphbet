import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldExclamationIcon, CheckCircleIcon } from '../components/icons';
import { BrandLogo } from '../components/layout/BrandLogo';
import { ToastMessage } from '../App';
import { startKyc, checkKyc } from '../services/kyc';

interface KycScreenProps {
  onSubmit: () => void;
  addToast: (message: string, type: ToastMessage['type']) => void;
}

const KycScreen: React.FC<KycScreenProps> = ({ onSubmit, addToast }) => {
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  // On mount (incl. returning from the hosted Didit flow), poll the decision.
  useEffect(() => {
    let active = true;
    checkKyc()
      .then(({ verified }) => {
        if (active && verified) {
          addToast('Verification complete! You can now place bets.', 'success');
          onSubmit();
        }
      })
      .catch(() => {})
      .finally(() => active && setChecking(false));
    return () => { active = false; };
  }, [onSubmit, addToast]);

  const handleStart = async () => {
    setBusy(true);
    try {
      const { url, verified } = await startKyc();
      if (verified) {
        addToast('Verification complete! You can now place bets.', 'success');
        onSubmit();
        return;
      }
      if (url) {
        // Redirect to the provider's hosted verification (ID scan + liveness).
        window.location.href = url;
        return;
      }
      addToast('Could not start verification. Please try again.', 'error');
    } catch {
      addToast('Verification is temporarily unavailable. Please try again later.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-light-gray dark:bg-neutral-dark p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><BrandLogo size="md" /></div>
        <div className="bg-white dark:bg-neutral-dark-gray rounded-2xl border border-gray-200 dark:border-neutral-border p-7 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldExclamationIcon className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-extrabold mb-2">Verify your identity</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            To comply with regulations, complete a quick identity check (ID document + a selfie). It takes about a minute and is required to place bets and withdraw.
          </p>

          <ul className="text-left text-sm text-gray-600 dark:text-gray-300 space-y-2 mb-6">
            {['Scan your government ID', 'Quick liveness selfie', 'Secured & encrypted'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-success shrink-0" /> {t}
              </li>
            ))}
          </ul>

          <button
            onClick={handleStart}
            disabled={busy || checking}
            className="w-full py-3 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-dark transition-colors disabled:bg-gray-300 dark:disabled:bg-neutral-dark-card disabled:text-gray-500"
          >
            {checking ? 'Checking…' : busy ? 'Starting…' : 'Start verification'}
          </button>
          <p className="text-[11px] text-gray-400 mt-3">Identity verification by Didit.</p>
        </div>
        <button onClick={() => navigate('/')} className="w-full text-center text-sm text-gray-400 hover:text-primary mt-5">
          Skip for now — back to matches
        </button>
      </div>
    </div>
  );
};

export default KycScreen;

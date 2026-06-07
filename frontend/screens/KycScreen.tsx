import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldExclamationIcon } from '../components/icons';
import { BrandLogo } from '../components/layout/BrandLogo';
import { ToastMessage } from '../App';
import { submitKyc } from '../services/kyc';

interface KycScreenProps {
  onSubmit: () => void;
  addToast: (message: string, type: ToastMessage['type']) => void;
}

const KycScreen: React.FC<KycScreenProps> = ({ onSubmit, addToast }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { addToast('Please upload your NIDA card.', 'error'); return; }
    setIsSubmitting(true);
    addToast('Submitting for verification…', 'info');
    try {
      const { verified } = await submitKyc(file.name);
      setIsSubmitting(false);
      if (verified) {
        addToast('Verification successful! You can now place bets.', 'success');
        onSubmit();
      } else {
        addToast('Verification could not be completed. Please try again.', 'error');
      }
    } catch {
      setIsSubmitting(false);
      addToast('Verification failed. Please try again.', 'error');
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
          <h1 className="text-xl font-extrabold mb-2">Verify your account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            To comply with regulations, upload a clear photo of your National ID (NIDA) to activate betting.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label htmlFor="nida-upload" className="block cursor-pointer">
              <div className={`flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed rounded-xl transition-colors ${file ? 'border-success bg-success/5' : 'border-gray-300 dark:border-neutral-border hover:border-primary'}`}>
                <svg className="h-10 w-10 text-gray-400 mb-2" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="text-sm font-semibold text-primary">{file ? 'Change file' : 'Upload a file'}</span>
                <span className="text-xs text-gray-400 mt-1">PNG or JPG, up to 10MB</span>
              </div>
              <input id="nida-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg" />
            </label>
            {file && <p className="text-sm text-gray-600 dark:text-gray-300">Selected: <span className="font-semibold">{file.name}</span></p>}

            <button type="submit" disabled={!file || isSubmitting} className="w-full py-3 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-dark transition-colors disabled:bg-gray-300 dark:disabled:bg-neutral-dark-card disabled:text-gray-500 disabled:cursor-not-allowed">
              {isSubmitting ? 'Verifying…' : 'Submit for verification'}
            </button>
          </form>
        </div>
        <button onClick={() => navigate('/')} className="w-full text-center text-sm text-gray-400 hover:text-primary mt-5">
          Skip for now — back to matches
        </button>
      </div>
    </div>
  );
};

export default KycScreen;

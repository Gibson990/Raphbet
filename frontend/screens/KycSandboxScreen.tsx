import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BrandLogo } from '../components/layout/BrandLogo';
import { approveSandboxKyc } from '../services/kyc';

const KycSandboxScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [docType, setDocType] = useState<'id' | 'passport' | 'license'>('id');
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!fileName) {
        setError('Please select or upload a document photo.');
        return;
      }
      setError('');
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');
    try {
      await approveSandboxKyc(sessionId);
      // Wait 1.5s to show a success state
      setTimeout(() => {
        navigate('/kyc');
      }, 1500);
    } catch {
      setError('Sandbox verification failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-light-gray dark:bg-neutral-dark p-4 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-neutral-dark-gray rounded-2xl border border-gray-200 dark:border-neutral-border p-7 shadow-xl transition-all">
        <div className="flex justify-center mb-6">
          <BrandLogo size="md" />
        </div>
        
        <div className="text-center mb-6">
          <span className="text-[10px] font-extrabold uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
            Developer Sandbox Flow
          </span>
          <h1 className="text-xl font-extrabold mt-3 dark:text-white">Didit Identity Verification</h1>
          <p className="text-xs text-gray-400 mt-1">Simulated document and liveness check</p>
        </div>

        {/* Stepper */}
        <div className="flex justify-between items-center mb-8 px-4">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step >= s
                      ? 'bg-primary text-white ring-4 ring-primary/20'
                      : 'bg-gray-100 dark:bg-neutral-dark text-gray-400 border border-gray-200 dark:border-neutral-border'
                  }`}
                >
                  {s}
                </div>
                <span className="text-[10px] font-medium mt-1 text-gray-400">
                  {s === 1 ? 'Document' : s === 2 ? 'Selfie' : 'Finish'}
                </span>
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-all ${
                    step > s ? 'bg-primary' : 'bg-gray-200 dark:bg-neutral-border'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Document Upload */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold dark:text-white">1. Select Document Type</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'id', label: 'National ID' },
                { type: 'passport', label: 'Passport' },
                { type: 'license', label: 'Driver\'s License' },
              ].map((d) => (
                <button
                  key={d.type}
                  onClick={() => setDocType(d.type as any)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                    docType === d.type
                      ? 'bg-primary/5 border-primary text-primary'
                      : 'bg-transparent border-gray-200 dark:border-neutral-border text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <h2 className="text-sm font-bold dark:text-white pt-2">2. Upload Document Photo</h2>
            <label className="border-2 border-dashed border-gray-200 dark:border-neutral-border rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary dark:hover:border-primary/50 transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {fileName ? 'Document Photo Selected' : 'Take or upload a photo'}
              </span>
              <span className="text-[10px] text-gray-400 mt-1 max-w-[200px] text-center leading-normal">
                {fileName ? fileName : 'Upload front and back side in clear light'}
              </span>
            </label>
          </div>
        )}

        {/* Step 2: Liveness Selfie */}
        {step === 2 && (
          <div className="flex flex-col items-center text-center space-y-4">
            <h2 className="text-sm font-bold dark:text-white w-full text-left">Liveness Selfie Check</h2>
            <p className="text-xs text-gray-400 w-full text-left -mt-2">Place your face in the center frame and look straight.</p>
            
            <div className="relative w-48 h-48 rounded-full border-4 border-primary/20 bg-neutral-light-gray dark:bg-neutral-dark overflow-hidden flex items-center justify-center">
              {/* Pulsing Scan overlay */}
              <div className="absolute inset-0 border-2 border-primary rounded-full animate-ping opacity-30" />
              <div className="absolute top-0 left-0 w-full h-1/2 border-b-2 border-primary/60 bg-gradient-to-t from-primary/10 to-transparent animate-pulse" />
              
              <svg className="w-20 h-20 text-gray-300 dark:text-neutral-border animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <span className="text-[10px] text-primary font-bold tracking-wider animate-pulse flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary inline-block"></span> CAMERA ACQUIRING FACE MODEL...
            </span>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <div className="text-center space-y-6 py-4">
            {loading ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <h2 className="text-sm font-bold dark:text-white">Submitting to Didit Verification API...</h2>
                <p className="text-xs text-gray-400">Processing ID checks and face-matching models</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-14 h-14 bg-success/15 rounded-full flex items-center justify-center text-success border border-success/20">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-extrabold dark:text-white">Checks Ready for submission</h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-[280px] mx-auto leading-normal">
                    Mock document scans and liveness markers successfully captured. Submit to approve this session.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-danger text-xs mt-4 bg-danger/10 border border-danger/20 rounded-xl p-3 text-center">
            {error}
          </p>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex gap-3">
          {step > 1 && step < 3 && (
            <button
              onClick={() => setStep((s) => (s - 1) as any)}
              className="py-3 px-4 border border-gray-200 dark:border-neutral-border rounded-xl text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={handleNextStep}
              className="flex-1 py-3 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-dark transition-colors"
            >
              Next Step
            </button>
          ) : (
            !loading && (
              <button
                onClick={handleComplete}
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-success hover:bg-success-dark transition-colors shadow-lg shadow-success/10"
              >
                Submit & Approve Sandbox
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default KycSandboxScreen;

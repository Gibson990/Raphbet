import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../services/firebase';
import { ToastMessage } from '../App';
import { GoogleIcon } from '../components/icons';
import { BrandLogo } from '../components/layout/BrandLogo';

interface LoginScreenProps {
  addToast: (message: string, type: ToastMessage['type']) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ addToast }) => {
  const { loginWithGoogle } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const requireConsent = (): boolean => {
    if (!agreed) {
      addToast('Please accept the Terms and confirm you are 18+.', 'error');
      return false;
    }
    return true;
  };

  // Convert a local number to E.164 (defaults to Tanzania +255 for 0-prefixed).
  const toE164 = (p: string) => (p.startsWith('+') ? p : p.replace(/\s/g, '').replace(/^0/, '+255'));

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireConsent() || !auth) return;
    const e164 = toE164(phone);
    if (!/^\+\d{10,15}$/.test(e164)) {
      addToast('Enter a valid mobile number (e.g. 0712 345 678).', 'error');
      return;
    }
    setBusy(true);
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      }
      confirmationRef.current = await signInWithPhoneNumber(auth, e164, recaptchaRef.current);
      setOtpSent(true);
      addToast('Verification code sent.', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Could not send code. Is phone sign-in enabled?', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationRef.current) return;
    setBusy(true);
    try {
      await confirmationRef.current.confirm(otp); // onAuthStateChanged redirects
      addToast('Login successful!', 'success');
    } catch {
      addToast('Invalid code. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!requireConsent()) return;
    setBusy(true);
    try {
      await loginWithGoogle(); // onAuthStateChanged redirects to home
      addToast('Login successful!', 'success');
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        addToast(err?.message || 'Sign-in failed.', 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'mt-1 block w-full px-3.5 py-2.5 border border-gray-300 dark:border-neutral-border rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm bg-transparent';

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2 bg-neutral-light-gray dark:bg-neutral-dark">
      {/* Brand / hero panel (desktop) */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-primary via-primary to-accent text-white">
        <BrandLogo size="md" light />
        <div>
          <h2 className="text-4xl font-extrabold leading-tight">Bet on the<br />FIFA World Cup 2026</h2>
          <p className="mt-3 text-white/85 max-w-sm">Live matches, real-time odds and standings — all in one simple app.</p>
        </div>
        <p className="text-xs text-white/70">Play responsibly. 18+.</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center p-6 min-h-screen lg:min-h-0">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <BrandLogo size="lg" showText={false} />
            <h1 className="text-2xl font-extrabold mt-3">Raph<span className="text-primary">bet</span></h1>
          </div>

          <h1 className="hidden lg:block text-2xl font-extrabold mb-1">Welcome back</h1>
          <p className="text-gray-400 text-sm mb-6 text-center lg:text-left">Sign in to start betting</p>

          <div className="bg-white dark:bg-neutral-dark-gray rounded-2xl border border-gray-200 dark:border-neutral-border p-6 space-y-5">
            {!otpSent ? (
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mobile number</label>
                  <input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712 345 678" className={inputClass} />
                </div>
                <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-dark transition-colors disabled:bg-gray-400">{busy ? 'Sending…' : 'Send code'}</button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Enter the code we sent</label>
                  <input id="otp" type="text" inputMode="numeric" value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" className={inputClass} />
                </div>
                <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-dark transition-colors disabled:bg-gray-400">{busy ? 'Verifying…' : 'Verify & Login'}</button>
                <button type="button" onClick={() => setOtpSent(false)} className="w-full text-center text-sm text-primary hover:underline">Change number</button>
              </form>
            )}

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-gray-200 dark:border-neutral-border" />
              <span className="mx-3 text-gray-400 text-xs">OR</span>
              <div className="flex-grow border-t border-gray-200 dark:border-neutral-border" />
            </div>

            <button onClick={handleGoogleLogin} disabled={busy} className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 dark:border-neutral-border rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-dark-card transition-colors disabled:opacity-60">
              <GoogleIcon className="w-5 h-5" /> Continue with Google
            </button>
            <div id="recaptcha-container" />

            <label className="flex items-start gap-2.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span>
                I am 18 or older and agree to the{' '}
                <Link to="/terms" className="text-primary hover:underline">Terms</Link>,{' '}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> and{' '}
                <Link to="/responsible-gaming" className="text-primary hover:underline">Responsible Gaming</Link> policy.
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

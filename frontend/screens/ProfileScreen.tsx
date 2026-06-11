import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppOutlet } from '../hooks/useAppOutlet';
import { useCurrency } from '../contexts/CurrencyContext';
import { useOddsFormat, type OddsFormat } from '../contexts/OddsFormatContext';
import { CurrencySelect } from '../components/CurrencySelect';
import { SunIcon, MoonIcon, CheckCircleIcon, ShieldExclamationIcon, CameraIcon, PencilIcon } from '../components/icons';
import Modal from '../components/common/Modal';
import TermsContent from '../components/auth/TermsContent';

const ProfileScreen: React.FC = () => {
  const { isDarkMode, toggleDarkMode, wallet } = useAppOutlet();
  const { format } = useCurrency();
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { format: oddsFmt, setFormat: setOddsFmt } = useOddsFormat();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  if (!user) return null;

  const handleSave = () => { updateUser({ name }); setIsEditing(false); };
  const handleCancel = () => { setName(user.name); setIsEditing(false); };
  const handlePhotoChange = () => {
    const photos = [1, 5, 8, 12, 15, 23, 33, 47].map(i => `https://i.pravatar.cc/150?img=${i}`);
    updateUser({ photoURL: photos[Math.floor(Math.random() * photos.length)] });
  };

  const activeBets = wallet.placedBets.filter(b => b.status === 'PENDING').length;

  return (
    <>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-5">Profile</h1>

        {/* Profile header card */}
        <div className="bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary to-accent" />
          <div className="px-5 pb-5">
            <div className="flex items-end gap-4 -mt-10">
              <div className="relative">
                <img src={user.photoURL} alt="Profile" className="h-20 w-20 rounded-2xl object-cover border-4 border-white dark:border-neutral-dark-gray" />
                <button onClick={handlePhotoChange} className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1.5 hover:bg-primary-dark transition-colors">
                  <CameraIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 min-w-0 pb-1">
                {isEditing ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input value={name} onChange={e => setName(e.target.value)} className="text-lg font-bold bg-transparent border-b-2 border-primary focus:outline-none" />
                    <button onClick={handleSave} className="text-xs bg-success text-white px-3 py-1 rounded-md">Save</button>
                    <button onClick={handleCancel} className="text-xs bg-gray-400 text-white px-3 py-1 rounded-md">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold truncate">{user.name}</h2>
                    <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-primary shrink-0"><PencilIcon className="h-4 w-4" /></button>
                  </div>
                )}
                <p className="text-sm text-gray-400 truncate">{user.email || user.phone}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="bg-gray-50 dark:bg-neutral-dark rounded-xl p-3 text-center">
                <p className="text-lg font-extrabold tabular-nums">{format(wallet.balance)}</p>
                <p className="text-[11px] text-gray-400 uppercase font-semibold">Balance</p>
              </div>
              <div className="bg-gray-50 dark:bg-neutral-dark rounded-xl p-3 text-center">
                <p className="text-lg font-extrabold tabular-nums">{wallet.placedBets.length}</p>
                <p className="text-[11px] text-gray-400 uppercase font-semibold">Total bets</p>
              </div>
              <div className="bg-gray-50 dark:bg-neutral-dark rounded-xl p-3 text-center">
                <p className="text-lg font-extrabold tabular-nums">{activeBets}</p>
                <p className="text-[11px] text-gray-400 uppercase font-semibold">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Verification prompt (KYC is required to place bets) */}
        {!user.isVerified && (
          <div className="mt-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <ShieldExclamationIcon className="h-7 w-7 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-sm">Verify your account</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Complete KYC to place bets and withdraw.</p>
              </div>
            </div>
            <button onClick={() => navigate('/kyc')} className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-primary-dark transition-colors shrink-0">
              Verify now
            </button>
          </div>
        )}

        {/* Settings */}
        <div className="mt-5 bg-white dark:bg-neutral-dark-gray border border-gray-200 dark:border-neutral-border rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-1 px-1">Settings</h3>

          <div className="flex justify-between items-center py-3 px-1 border-b border-gray-100 dark:border-neutral-border">
            <div className="flex items-center gap-3">
              {user.isVerified ? <CheckCircleIcon className="h-5 w-5 text-success" /> : <ShieldExclamationIcon className="h-5 w-5 text-amber-500" />}
              <span className="font-semibold text-sm">Account status</span>
            </div>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${user.isVerified ? 'bg-success/10 text-success' : 'bg-amber-500/10 text-amber-600'}`}>
              {user.isVerified ? 'Verified' : 'Unverified'}
            </span>
          </div>

          <div className="flex justify-between items-center py-3 px-1 border-b border-gray-100 dark:border-neutral-border">
            <div className="flex items-center gap-3">
              {isDarkMode ? <MoonIcon className="h-5 w-5 text-accent" /> : <SunIcon className="h-5 w-5 text-accent" />}
              <span className="font-semibold text-sm">Dark mode</span>
            </div>
            <button onClick={toggleDarkMode} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isDarkMode ? 'bg-primary' : 'bg-gray-300'}`}>
              <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex justify-between items-center py-3 px-1 border-b border-gray-100 dark:border-neutral-border gap-3">
            <span className="font-semibold text-sm shrink-0">Odds format</span>
            <div className="inline-flex bg-gray-100 dark:bg-neutral-dark rounded-lg p-0.5">
              {([['decimal', '1.90'], ['fractional', '9/10'], ['american', '-111']] as [OddsFormat, string][]).map(([f, ex]) => (
                <button
                  key={f}
                  onClick={() => setOddsFmt(f)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors capitalize ${oddsFmt === f ? 'bg-white dark:bg-neutral-dark-card text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                  title={ex}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center py-3 px-1 border-b border-gray-100 dark:border-neutral-border">
            <span className="font-semibold text-sm">Display currency</span>
            <CurrencySelect />
          </div>

          <button onClick={() => setIsTermsOpen(true)} className="w-full flex justify-between items-center py-3 px-1 text-left">
            <span className="font-semibold text-sm">Terms &amp; Conditions</span>
            <span className="text-gray-400">›</span>
          </button>

          <button onClick={logout} className="w-full mt-3 bg-danger/10 text-danger font-bold py-3 rounded-xl hover:bg-danger/20 transition-colors">
            Log Out
          </button>
        </div>
      </div>

      {isTermsOpen && (
        <Modal title="Terms & Conditions" onClose={() => setIsTermsOpen(false)}>
          <TermsContent />
        </Modal>
      )}
    </>
  );
};

export default ProfileScreen;

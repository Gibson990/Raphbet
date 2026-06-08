import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, updateProfile, type User as FbUser } from 'firebase/auth';
import type { User } from '../types';
import { fetchKycStatus } from '../services/kyc';
import { auth, googleProvider, firebaseEnabled } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isVerified: boolean;
  authReady: boolean; // true once Firebase has resolved the initial session
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  completeKyc: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Map a Firebase user to our app User. Name/photo default to the Google
// profile; if absent (e.g. phone sign-in) we fall back to a placeholder the
// user can edit.
const fromFirebase = (fb: FbUser): User => ({
  uid: fb.uid,
  name: fb.displayName || fb.email?.split('@')[0] || 'Player',
  email: fb.email || undefined,
  phone: fb.phoneNumber || undefined,
  photoURL: fb.photoURL || undefined,
  isVerified: false,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseEnabled);

  // Subscribe to Firebase auth state (survives refreshes).
  useEffect(() => {
    if (!firebaseEnabled || !auth) return;
    return onAuthStateChanged(auth, (fb) => {
      setUser(fb ? fromFirebase(fb) : null);
      setAuthReady(true);
    });
  }, []);

  // On login, sync server-side KYC status so a verified user doesn't repeat it.
  useEffect(() => {
    if (user && !user.isVerified) {
      fetchKycStatus()
        .then((s) => { if (s.verified) setUser((u) => (u ? { ...u, isVerified: true } : u)); })
        .catch(() => { /* offline: leave unverified */ });
    }
  }, [user?.uid, user?.isVerified]);

  const loginWithGoogle = useCallback(async () => {
    if (!auth) throw new Error('Auth is not configured.');
    await signInWithPopup(auth, googleProvider); // onAuthStateChanged sets the user
  }, []);

  const logout = useCallback(async () => {
    if (auth) await signOut(auth);
    setUser(null);
  }, []);

  const completeKyc = useCallback(() => {
    setUser((u) => (u ? { ...u, isVerified: true } : null));
  }, []);

  const updateUser = useCallback(async (data: Partial<User>) => {
    if (auth?.currentUser && (data.name !== undefined || data.photoURL !== undefined)) {
      await updateProfile(auth.currentUser, {
        displayName: data.name ?? auth.currentUser.displayName ?? undefined,
        photoURL: data.photoURL ?? auth.currentUser.photoURL ?? undefined,
      });
    }
    setUser((u) => (u ? { ...u, ...data } : null));
  }, []);

  const isLoggedIn = !!user;
  const isVerified = user?.isVerified || false;

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, isVerified, authReady, loginWithGoogle, logout, completeKyc, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

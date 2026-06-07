import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { User } from '../types';
import { fetchKycStatus } from '../services/kyc';

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  isVerified: boolean;
  login: (method: 'google' | 'phone', identifier: string) => void;
  logout: () => void;
  completeKyc: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mockUser: User = {
    uid: '12345',
    name: 'Raph Bet User',
    email: 'user@raphbet.com',
    photoURL: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
    isVerified: false,
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // On login, sync server-side KYC status so a device that already verified
  // doesn't have to repeat it (KYC is enforced server-side per device).
  useEffect(() => {
    if (user && !user.isVerified) {
      fetchKycStatus()
        .then((s) => { if (s.verified) setUser((u) => (u ? { ...u, isVerified: true } : u)); })
        .catch(() => { /* offline: leave unverified */ });
    }
  }, [user?.uid, user?.isVerified]);

  const login = useCallback((method: 'google' | 'phone', identifier: string) => {
    // Simulate a login
    const loggedInUser = { ...mockUser };
    if (method === 'phone') {
        loggedInUser.email = undefined;
        loggedInUser.phone = identifier;
    } else {
        loggedInUser.email = identifier;
        loggedInUser.phone = undefined;
    }
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);
  
  const completeKyc = useCallback(() => {
      setUser(currentUser => currentUser ? { ...currentUser, isVerified: true } : null);
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
      setUser(currentUser => currentUser ? { ...currentUser, ...data } : null);
  }, []);

  const isLoggedIn = !!user;
  const isVerified = user?.isVerified || false;

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, isVerified, login, logout, completeKyc, updateUser }}>
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

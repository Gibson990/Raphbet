import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { User } from '../types';

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

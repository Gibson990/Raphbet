import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type OddsFormat = 'decimal' | 'fractional' | 'american';
const KEY = 'raphbet.oddsFormat';

function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a; }

function toFractional(dec: number): string {
  const v = Math.round((dec - 1) * 100);
  const g = gcd(v, 100) || 1;
  return `${v / g}/${100 / g}`;
}

function toAmerican(dec: number): string {
  if (dec >= 2) return '+' + Math.round((dec - 1) * 100);
  return '-' + Math.round(100 / (dec - 1));
}

interface OddsFormatContextType {
  format: OddsFormat;
  setFormat: (f: OddsFormat) => void;
  fmtOdds: (decimal: number) => string;
}

const OddsFormatContext = createContext<OddsFormatContextType | undefined>(undefined);

export const OddsFormatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [format, setFormatState] = useState<OddsFormat>(() => ((localStorage.getItem(KEY) as OddsFormat) || 'decimal'));
  const setFormat = useCallback((f: OddsFormat) => { localStorage.setItem(KEY, f); setFormatState(f); }, []);
  const fmtOdds = useCallback((dec: number) => {
    if (!dec || dec < 1.01) return dec ? dec.toFixed(2) : '-';
    if (format === 'fractional') return toFractional(dec);
    if (format === 'american') return toAmerican(dec);
    return dec.toFixed(2);
  }, [format]);
  return <OddsFormatContext.Provider value={{ format, setFormat, fmtOdds }}>{children}</OddsFormatContext.Provider>;
};

export const useOddsFormat = (): OddsFormatContextType => {
  const ctx = useContext(OddsFormatContext);
  if (!ctx) throw new Error('useOddsFormat must be used within an OddsFormatProvider');
  return ctx;
};

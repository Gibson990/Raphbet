import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

/**
 * Global display-currency conversion. All monetary values are stored in the base
 * currency (Tanzanian Shilling, TZS); this context converts them for display
 * only. Live rates are fetched from a free, key-less FX API with a static
 * fallback so the app always works offline.
 */

export interface Currency {
  code: string; // ISO 4217
  name: string;
  flag: string; // flag image URL (renders on all platforms, unlike emoji flags)
}

const flag = (cc: string) => `https://flagcdn.com/w40/${cc}.png`;

export const CURRENCIES: Currency[] = [
  { code: 'TZS', name: 'Tanzanian Shilling', flag: flag('tz') },
  { code: 'USD', name: 'US Dollar', flag: flag('us') },
  { code: 'EUR', name: 'Euro', flag: flag('eu') },
  { code: 'GBP', name: 'British Pound', flag: flag('gb') },
  { code: 'KES', name: 'Kenyan Shilling', flag: flag('ke') },
  { code: 'NGN', name: 'Nigerian Naira', flag: flag('ng') },
  { code: 'ZAR', name: 'South African Rand', flag: flag('za') },
];

// Units of each currency per 1 TZS. Used until live rates load (or if they fail).
const FALLBACK_RATES: Record<string, number> = {
  TZS: 1,
  USD: 0.00038,
  EUR: 0.00035,
  GBP: 0.0003,
  KES: 0.049,
  NGN: 0.58,
  ZAR: 0.007,
};

interface CurrencyContextType {
  code: string;
  setCode: (code: string) => void;
  /** Format an amount given in TZS into the selected currency string. */
  format: (amountTzs: number) => string;
  /** Convert an amount given in TZS into the selected currency number. */
  convert: (amountTzs: number) => number;
  currencies: Currency[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [code, setCodeState] = useState<string>(() => localStorage.getItem('raphbet.currency') || 'TZS');
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);

  const setCode = useCallback((c: string) => {
    setCodeState(c);
    localStorage.setItem('raphbet.currency', c);
  }, []);

  // Load live rates once (base = TZS). Fall back silently to the static table.
  useEffect(() => {
    let active = true;
    fetch('https://open.er-api.com/v6/latest/TZS')
      .then(r => r.json())
      .then(data => {
        if (active && data?.result === 'success' && data.rates) {
          setRates({ ...FALLBACK_RATES, ...data.rates, TZS: 1 });
        }
      })
      .catch(() => { /* keep fallback */ });
    return () => { active = false; };
  }, []);

  const convert = useCallback((amountTzs: number) => amountTzs * (rates[code] ?? 1), [rates, code]);

  const format = useCallback((amountTzs: number) => {
    const value = convert(amountTzs);
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: value >= 1000 ? 0 : 2 }).format(value);
    } catch {
      return `${Math.round(value).toLocaleString('en-US')} ${code}`;
    }
  }, [convert, code]);

  return (
    <CurrencyContext.Provider value={{ code, setCode, format, convert, currencies: CURRENCIES }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
};

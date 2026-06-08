import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

/**
 * Money is stored internally in **USD cents** (USDT ≡ USD, 1:1). This context
 * converts to the selected display currency. USDT is the default unit; the
 * switcher lets users view balances in USD / TZS / EUR / etc. Live rates come
 * from a free key-less FX API (base USD) with a static fallback.
 */

export interface Currency {
  code: string;
  name: string;
  flag?: string;   // flag image URL (fiat)
  symbol?: string; // text badge (crypto, e.g. USDT)
}

const flag = (cc: string) => `https://flagcdn.com/w40/${cc}.png`;

export const CURRENCIES: Currency[] = [
  { code: 'USDT', name: 'Tether (USDT)', symbol: '₮' },
  { code: 'USD', name: 'US Dollar', flag: flag('us') },
  { code: 'TZS', name: 'Tanzanian Shilling', flag: flag('tz') },
  { code: 'EUR', name: 'Euro', flag: flag('eu') },
  { code: 'GBP', name: 'British Pound', flag: flag('gb') },
  { code: 'KES', name: 'Kenyan Shilling', flag: flag('ke') },
  { code: 'NGN', name: 'Nigerian Naira', flag: flag('ng') },
  { code: 'ZAR', name: 'South African Rand', flag: flag('za') },
];

// Units of each currency per 1 USD. Used until live rates load (or if they fail).
const FALLBACK_RATES: Record<string, number> = {
  USDT: 1, USD: 1, TZS: 2600, EUR: 0.92, GBP: 0.79, KES: 129, NGN: 1500, ZAR: 18,
};

interface CurrencyContextType {
  code: string;
  setCode: (code: string) => void;
  /** Format an amount in USD cents into the selected currency string. */
  format: (amountCents: number) => string;
  currencies: Currency[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [code, setCodeState] = useState<string>(() => localStorage.getItem('raphbet.currency') || 'USDT');
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);

  const setCode = useCallback((c: string) => {
    setCodeState(c);
    localStorage.setItem('raphbet.currency', c);
  }, []);

  // Load live rates once (base = USD). Fall back silently to the static table.
  useEffect(() => {
    let active = true;
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(data => {
        if (active && data?.result === 'success' && data.rates) {
          setRates({ ...FALLBACK_RATES, ...data.rates, USD: 1, USDT: 1 });
        }
      })
      .catch(() => { /* keep fallback */ });
    return () => { active = false; };
  }, []);

  const format = useCallback((amountCents: number) => {
    const usd = amountCents / 100;
    const value = usd * (rates[code] ?? 1);
    if (code === 'USDT') return `${value.toFixed(2)} USDT`;
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: value >= 1000 ? 0 : 2 }).format(value);
    } catch {
      return `${value.toFixed(2)} ${code}`;
    }
  }, [rates, code]);

  return (
    <CurrencyContext.Provider value={{ code, setCode, format, currencies: CURRENCIES }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
};

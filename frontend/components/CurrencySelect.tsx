import React from 'react';
import { useCurrency } from '../contexts/CurrencyContext';

/** Compact global currency switcher (native select for reliable mobile UX). */
export const CurrencySelect: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { code, setCode, currencies } = useCurrency();
  return (
    <select
      value={code}
      onChange={(e) => setCode(e.target.value)}
      aria-label="Display currency"
      className={`bg-gray-100 dark:bg-neutral-dark-card text-sm font-semibold rounded-xl px-3 py-2 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer ${className}`}
    >
      {currencies.map((c) => (
        <option key={c.code} value={c.code}>{c.code}</option>
      ))}
    </select>
  );
};

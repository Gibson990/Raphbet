import React, { useState } from 'react';
import { useCurrency } from '../contexts/CurrencyContext';
import { ChevronDownIcon, XIcon, CheckCircleIcon } from './icons';

/** Global currency switcher: a compact trigger that opens a right-side drawer. */
export const CurrencySelect: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { code, setCode, currencies } = useCurrency();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const current = currencies.find((c) => c.code === code);

  const openDrawer = () => { setOpen(true); requestAnimationFrame(() => setShown(true)); };
  const close = () => { setShown(false); setTimeout(() => setOpen(false), 200); };
  const pick = (c: string) => { setCode(c); close(); };

  return (
    <>
      <button
        onClick={openDrawer}
        aria-label="Display currency"
        className={`inline-flex items-center gap-1.5 bg-gray-100 dark:bg-neutral-dark-card hover:bg-gray-200 dark:hover:bg-neutral-border rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${className}`}
      >
        {current && <img src={current.flag} alt="" className="h-3.5 w-5 rounded-sm object-cover" />}
        <span>{code}</span>
        <ChevronDownIcon className="h-4 w-4 text-gray-400" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${shown ? 'opacity-100' : 'opacity-0'}`} onClick={close} />
          <div className={`absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white dark:bg-neutral-dark-gray shadow-2xl flex flex-col transition-transform duration-200 ${shown ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-border">
              <h2 className="font-bold">Display currency</h2>
              <button onClick={close} className="text-gray-400 hover:text-neutral-dark dark:hover:text-white">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-2 overflow-y-auto">
              {currencies.map((c) => {
                const active = c.code === code;
                return (
                  <button
                    key={c.code}
                    onClick={() => pick(c.code)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${active ? 'bg-primary/10' : 'hover:bg-gray-100 dark:hover:bg-neutral-dark-card'}`}
                  >
                    <img src={c.flag} alt="" className="h-7 w-9 rounded object-cover shadow-sm" />
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold text-sm ${active ? 'text-primary' : ''}`}>{c.name}</p>
                      <p className="text-xs text-gray-400">{c.code}</p>
                    </div>
                    {active && <CheckCircleIcon className="h-5 w-5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
            <p className="mt-auto p-4 text-xs text-gray-400 border-t border-gray-200 dark:border-neutral-border">
              Live exchange rates. Balances are held in TZS and shown in your chosen currency.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

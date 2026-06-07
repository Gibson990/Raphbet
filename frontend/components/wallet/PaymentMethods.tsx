import React from 'react';

/**
 * Clean, uniform "we accept" payment badges. Self-contained SVG/CSS marks so
 * nothing depends on external logo images that could break or look squished.
 */

const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`h-9 inline-flex items-center justify-center gap-1 rounded-lg px-3 font-extrabold text-xs whitespace-nowrap shadow-sm ${className}`}>
    {children}
  </div>
);

const MastercardMark: React.FC = () => (
  <svg viewBox="0 0 32 20" className="h-4 w-auto" aria-hidden="true">
    <circle cx="12" cy="10" r="8" fill="#EB001B" />
    <circle cx="20" cy="10" r="8" fill="#F79E1B" />
    <path d="M16 4a8 8 0 000 12 8 8 0 000-12z" fill="#FF5F00" />
  </svg>
);

export const PaymentMethods: React.FC = () => (
  <div className="flex flex-wrap items-center gap-2.5">
    <Badge className="bg-[#1BB24A] text-white tracking-wide">M-PESA</Badge>
    <Badge className="bg-[#ED1C24] text-white">Airtel Money</Badge>
    <Badge className="bg-white border border-gray-200 text-[#1A1F71] italic tracking-wider">VISA</Badge>
    <Badge className="bg-white border border-gray-200">
      <MastercardMark />
      <span className="text-gray-600">Mastercard</span>
    </Badge>
    <Badge className="bg-[#F7931A] text-white">
      <span className="text-sm leading-none">₿</span> Crypto
    </Badge>
  </div>
);

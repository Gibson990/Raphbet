import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  /** Use on colored/gradient backgrounds (e.g. the login hero) for contrast. */
  light?: boolean;
}

const sizes = {
  sm: { box: 'h-7 w-7', text: 'text-lg' },
  md: { box: 'h-9 w-9', text: 'text-xl' },
  lg: { box: 'h-14 w-14', text: 'text-4xl' },
};

/** The Raphbet wordmark: a football badge mark + "Raphbet". */
export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', showText = true, light = false }) => {
  const s = sizes[size];
  const badgeFill = light ? '#FFFFFF' : '#FF6B35';
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className={s.box} aria-hidden="true">
        <rect width="64" height="64" rx="14" fill={badgeFill} />
        <circle cx="32" cy="32" r="18" fill={light ? '#FF6B35' : '#fff'} />
        <g fill="#0F1115">
          <path d="M32 18l5.9 4.3-2.2 6.9h-7.4l-2.2-6.9z" />
          <circle cx="32" cy="32" r="3.1" />
          <path d="M21.6 27.4l2.6 2 -1.9 6-3.1.1A14 14 0 0 1 21.6 27.4z" />
          <path d="M42.4 27.4l-2.6 2 1.9 6 3.1.1A14 14 0 0 0 42.4 27.4z" />
          <path d="M26 41.8l2.3-1.7h7.4l2.3 1.7-1.2 3.1a14 14 0 0 1-9.4 0z" />
        </g>
      </svg>
      {showText && (
        <span className={`font-extrabold tracking-tight ${s.text} ${light ? 'text-white' : 'text-neutral-dark dark:text-white'}`}>
          Raph<span className={light ? 'text-white' : 'text-primary'}>bet</span>
        </span>
      )}
    </div>
  );
};

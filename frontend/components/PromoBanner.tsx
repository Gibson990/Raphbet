import React, { useState, useEffect, useCallback } from 'react';

interface Slide {
  title: string;
  subtitle: string;
  cta: string;
  image: string;
  fallback: string; // gradient shown until/if the image fails
}

const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=1280&q=80&auto=format&fit=crop`;

const slides: Slide[] = [
  {
    title: 'FIFA World Cup 2026 is here',
    subtitle: 'Bet on every match — group stage to the final.',
    cta: 'Bet now',
    image: img('1522778119026-d647f0596c20'),
    fallback: 'from-[#FF6B35] to-[#FFA726]',
  },
  {
    title: 'Live in-play betting',
    subtitle: 'Odds update in real time as the action unfolds.',
    cta: 'Go live',
    image: img('1540747913346-19e32dc3e97e'),
    fallback: 'from-[#0F1115] to-[#374151]',
  },
  {
    title: 'Welcome bonus',
    subtitle: 'Top up your wallet and get started today.',
    cta: 'Claim now',
    image: img('1459865264687-595d652de67e'),
    fallback: 'from-[#16A34A] to-[#166534]',
  },
];

/** Auto-rotating promo hero with real photography and a readable gradient scrim. */
export const PromoBanner: React.FC = () => {
  const [i, setI] = useState(0);
  const next = useCallback(() => setI((p) => (p + 1) % slides.length), []);

  useEffect(() => {
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden h-44 sm:h-56">
      <div className="flex h-full transition-transform ease-out duration-500" style={{ transform: `translateX(-${i * 100}%)` }}>
        {slides.map((s, idx) => (
          <div key={idx} className={`relative w-full h-full flex-shrink-0 bg-gradient-to-br ${s.fallback}`}>
            <img
              src={s.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading={idx === 0 ? 'eager' : 'lazy'}
            />
            {/* Scrim for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
            <div className="relative h-full flex flex-col justify-center px-6 sm:px-10 max-w-xl">
              <h2 className="text-white text-xl sm:text-3xl font-extrabold leading-tight drop-shadow">{s.title}</h2>
              <p className="text-white/85 text-sm sm:text-base mt-1.5">{s.subtitle}</p>
              <span className="mt-3 inline-flex w-max items-center bg-primary hover:bg-primary-dark text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer">
                {s.cta}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
};

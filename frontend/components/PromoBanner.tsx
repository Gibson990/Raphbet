import React, { useState, useEffect, useCallback } from 'react';

interface Slide {
  title: string;
  subtitle: string;
  gradient: string;
}

const slides: Slide[] = [
  {
    title: 'FIFA World Cup 2026 is here',
    subtitle: 'Bet on every match — group stage to the final.',
    gradient: 'from-[#FF6B35] via-[#FF8A3D] to-[#FFA726]',
  },
  {
    title: 'Live in-play betting',
    subtitle: 'Odds update in real time as the action unfolds.',
    gradient: 'from-[#0F1115] via-[#1f2937] to-[#374151]',
  },
  {
    title: 'Welcome bonus',
    subtitle: 'Top up your wallet and get started today.',
    gradient: 'from-[#16A34A] via-[#15803d] to-[#166534]',
  },
];

/** Auto-rotating promo hero. Pure CSS gradients — no external images to break. */
export const PromoBanner: React.FC = () => {
  const [i, setI] = useState(0);
  const next = useCallback(() => setI((p) => (p + 1) % slides.length), []);

  useEffect(() => {
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden">
      <div className="flex transition-transform ease-out duration-500" style={{ transform: `translateX(-${i * 100}%)` }}>
        {slides.map((s, idx) => (
          <div
            key={idx}
            className={`w-full flex-shrink-0 bg-gradient-to-r ${s.gradient} px-6 sm:px-10 py-8 sm:py-12`}
          >
            <div className="max-w-xl">
              <h2 className="text-white text-xl sm:text-3xl font-extrabold leading-tight">{s.title}</h2>
              <p className="text-white/85 text-sm sm:text-base mt-2">{s.subtitle}</p>
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

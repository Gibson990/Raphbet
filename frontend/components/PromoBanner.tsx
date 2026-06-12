import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface Slide {
  title: string;
  subtitle: string;
  cta: string;
  image: string;
  fallback: string; // gradient shown until/if the image fails
  to?: string;      // route to navigate to on CTA click
  scrollTo?: string; // element id to scroll to on CTA click (same-page action)
}

const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=1280&q=80&auto=format&fit=crop`;

const slides: Slide[] = [
  {
    title: 'FIFA World Cup 2026 is here',
    subtitle: 'Bet on every match — group stage to the final.',
    cta: 'Bet now',
    image: img('1522778119026-d647f0596c20'),
    fallback: 'from-[#FF6B35] to-[#FFA726]',
    scrollTo: 'match-board',
  },
  {
    title: 'Live in-play betting',
    subtitle: 'Odds update in real time as the action unfolds.',
    cta: 'Go live',
    image: img('1540747913346-19e32dc3e97e'),
    fallback: 'from-[#0F1115] to-[#374151]',
    scrollTo: 'match-board',
  },
  {
    // Promotes the real accumulator win-boost ladder (2.5% at 2 legs → 100% at 20).
    title: 'Acca boosts up to 100%',
    subtitle: 'Add legs to your accumulator — we boost winning bets up to double.',
    cta: 'Build an acca',
    image: img('1459865264687-595d652de67e'),
    fallback: 'from-[#16A34A] to-[#166534]',
    scrollTo: 'match-board',
  },
];

/** Auto-rotating promo hero with real photography and a readable gradient scrim. */
export const PromoBanner: React.FC = () => {
  const [i, setI] = useState(0);
  const navigate = useNavigate();
  const next = useCallback(() => setI((p) => (p + 1) % slides.length), []);

  const handleCta = (s: Slide) => {
    if (s.to) navigate(s.to);
    else if (s.scrollTo) document.getElementById(s.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
              <button
                type="button"
                onClick={() => handleCta(s)}
                className="mt-3 inline-flex w-max items-center bg-primary hover:bg-primary-dark active:scale-95 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all"
              >
                {s.cta}
              </button>
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

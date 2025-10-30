import React from 'react';
import { Carousel } from './common/Carousel';
import PromoBanner from './common/PromoBanner';

interface PromoSectionProps {
  promos: Array<{
    id: string;
    imageUrl: string;
    altText: string;
    link?: string;
  }>;
}

export const PromoSection: React.FC<PromoSectionProps> = ({ promos }) => {
  if (!promos.length) return null;

  // If there's only one promo, don't use carousel
  if (promos.length === 1) {
    const promo = promos[0];
    return (
      <div className="mb-6">
        <PromoBanner
          imageUrl={promo.imageUrl}
          altText={promo.altText}
          onClick={promo.link ? () => window.open(promo.link, '_blank') : undefined}
        />
      </div>
    );
  }

  // Multiple promos - use carousel
  return (
    <div className="mb-6">
      <Carousel
        autoPlay
        interval={5000}
        showDots
        className="rounded-lg overflow-hidden shadow-lg"
      >
        {promos.map((promo) => (
          <PromoBanner
            key={promo.id}
            imageUrl={promo.imageUrl}
            altText={promo.altText}
            onClick={promo.link ? () => window.open(promo.link, '_blank') : undefined}
          />
        ))}
      </Carousel>
    </div>
  );
};

export default PromoSection;
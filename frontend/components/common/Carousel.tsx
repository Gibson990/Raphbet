import React, { useState, useEffect, useCallback } from 'react';

interface CarouselProps {
  images: string[];
}

export const Carousel: React.FC<CarouselProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
  }, [images.length]);

  useEffect(() => {
    const slideInterval = setInterval(nextSlide, 5000);
    return () => clearInterval(slideInterval);
  }, [nextSlide]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden shadow-lg">
      <div className="flex transition-transform ease-out duration-500" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
        {images.map((src, index) => (
          <img key={index} src={src} alt={`Promo ${index + 1}`} className="w-full flex-shrink-0 object-cover aspect-[2/1] sm:aspect-[3/1]" />
        ))}
      </div>
      
      <div className="absolute bottom-4 right-0 left-0">
        <div className="flex items-center justify-center gap-2">
          {images.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`transition-all w-2 h-2 bg-white rounded-full cursor-pointer ${currentIndex === i ? 'p-1' : 'bg-opacity-50'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
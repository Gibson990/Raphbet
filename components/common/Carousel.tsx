import React, { useState, useEffect, useCallback } from 'react';

interface CarouselProps {
  children: React.ReactNode;
  autoPlay?: boolean;
  interval?: number;
  showDots?: boolean;
  className?: string;
}

export const Carousel: React.FC<CarouselProps> = ({ 
  children,
  autoPlay = false,
  interval = 5000,
  showDots = false,
  className = ''
}) => {
  const slides = React.Children.toArray(children);
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === slides.length - 1 ? 0 : prevIndex + 1));
  }, [slides.length]);

  useEffect(() => {
    const slideInterval = setInterval(nextSlide, 5000);
    return () => clearInterval(slideInterval);
  }, [nextSlide]);

  useEffect(() => {
    if (autoPlay) {
      const slideInterval = setInterval(nextSlide, interval);
      return () => clearInterval(slideInterval);
    }
  }, [nextSlide, autoPlay, interval]);

  return (
    <div className={`relative w-full rounded-xl overflow-hidden ${className}`}>
      <div 
        className="flex transition-transform ease-out duration-500" 
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div key={index} className="w-full flex-shrink-0">
            {slide}
          </div>
        ))}
      </div>
      
      {showDots && slides.length > 1 && (
        <div className="absolute bottom-4 right-0 left-0">
          <div className="flex items-center justify-center gap-2">
            {slides.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`transition-all w-2 h-2 bg-white rounded-full cursor-pointer ${
                  currentIndex === i ? 'p-1' : 'bg-opacity-50'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
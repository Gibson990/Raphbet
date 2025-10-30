import React from 'react';

interface PromoBannerProps {
  imageUrl: string;
  altText: string;
  onClick?: () => void;
  className?: string;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({
  imageUrl,
  altText,
  onClick,
  className = ''
}) => {
  return (
    <div 
      className={`w-full overflow-hidden relative rounded-lg shadow-lg ${className}`}
      style={{ maxHeight: '600px' }}
    >
      <div className="aspect-[1920/600] relative w-full">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent animate-pulse">
          {/* Loading placeholder */}
        </div>
        <img
          src={imageUrl}
          alt={altText}
          onClick={onClick}
          loading="lazy"
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            onClick ? 'cursor-pointer hover:opacity-95' : ''
          }`}
          onLoad={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.opacity = '1';
          }}
          style={{ opacity: '0' }}
        />
      </div>
    </div>
  );
};

export default PromoBanner;
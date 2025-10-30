import React, { useEffect, useState } from 'react';
import { WifiIcon, WifiOffIcon } from '../icons/NetworkIcons';

export const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show for 3 seconds when connection is restored
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-16 left-0 right-0 z-50 flex items-center justify-center p-2 transition-colors duration-300 ${
      isOnline ? 'bg-green-500' : 'bg-red-500'
    }`}>
      <div className="flex items-center space-x-2 text-white">
        {isOnline ? (
          <>
            <WifiIcon className="h-5 w-5" />
            <span>Back Online</span>
          </>
        ) : (
          <>
            <WifiOffIcon className="h-5 w-5" />
            <span>No Internet Connection</span>
          </>
        )}
      </div>
    </div>
  );
};
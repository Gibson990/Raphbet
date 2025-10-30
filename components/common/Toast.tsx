import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, ShieldExclamationIcon, XIcon } from '../icons';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Animate in
    setShow(true);
    // Animate out before unmounting
    const timer = setTimeout(() => {
      setShow(false);
    }, 2700);

    return () => clearTimeout(timer);
  }, []);

  const baseClasses = 'flex items-center w-full max-w-xs p-4 space-x-4 text-gray-500 bg-white rounded-lg shadow-lg dark:text-gray-400 dark:bg-neutral-dark-gray';
  
  let typeClasses = '';
  let Icon;
  switch (type) {
    case 'success':
      typeClasses = 'text-green-500 bg-green-100 dark:bg-green-800 dark:text-green-200';
      Icon = <CheckCircleIcon className="w-5 h-5" />;
      break;
    case 'error':
      typeClasses = 'text-red-500 bg-red-100 dark:bg-red-800 dark:text-red-200';
      Icon = <ShieldExclamationIcon className="w-5 h-5" />;
      break;
    default:
      typeClasses = 'text-blue-500 bg-blue-100 dark:bg-blue-800 dark:text-blue-200';
      Icon = <ShieldExclamationIcon className="w-5 h-5" />; // Placeholder
  }

  return (
    <div
      className={`${baseClasses} transition-all duration-300 ease-in-out ${show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
      role="alert"
    >
      <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 ${typeClasses} rounded-lg`}>
        {Icon}
      </div>
      <div className="text-sm font-normal">{message}</div>
      <button
        type="button"
        className="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8 dark:text-gray-300 dark:hover:text-white dark:bg-neutral-dark-gray dark:hover:bg-neutral-gray"
        onClick={onClose}
        aria-label="Close"
      >
        <span className="sr-only">Close</span>
        <XIcon className="w-5 h-5"/>
      </button>
    </div>
  );
};

export default Toast;

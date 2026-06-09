import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundScreen: React.FC = () => (
  <div className="flex flex-col items-center justify-center text-center py-24">
    <p className="text-7xl font-extrabold text-primary tracking-tight">404</p>
    <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Page not found</h1>
    <p className="mt-2 text-gray-400 max-w-sm">The page you're looking for doesn't exist or has moved.</p>
    <Link to="/" className="mt-6 bg-primary text-white font-bold px-5 py-2.5 rounded-xl hover:bg-primary-dark transition-colors">
      Back to matches
    </Link>
  </div>
);

export default NotFoundScreen;

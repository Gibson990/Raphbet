import React from 'react';
import { Link } from 'react-router-dom';

/** App-wide footer with legal links and responsible-gambling messaging. */
export const Footer: React.FC = () => (
  <footer className="border-t border-gray-200 dark:border-neutral-border mt-8 px-4 sm:px-6 py-6">
    <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link to="/terms" className="hover:text-primary">Terms</Link>
        <Link to="/privacy" className="hover:text-primary">Privacy</Link>
        <Link to="/responsible-gaming" className="hover:text-primary">Responsible Gaming</Link>
        <a href="mailto:support@raphbet.com" className="hover:text-primary">Support</a>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-gray-300 dark:border-neutral-border font-bold text-[10px]">18+</span>
        <span>Play responsibly. Virtual credits only.</span>
      </div>
    </div>
  </footer>
);

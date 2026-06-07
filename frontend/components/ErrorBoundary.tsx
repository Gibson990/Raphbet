import React from 'react';
import { BrandLogo } from './layout/BrandLogo';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

/** Catches render errors anywhere in the tree and shows a friendly fallback
 *  instead of a blank white screen. */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // In production this is where we'd report to an error service (e.g. Sentry).
    console.error('Unhandled error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-light-gray dark:bg-neutral-dark p-6 text-center">
        <BrandLogo size="lg" showText={false} />
        <h1 className="text-2xl font-extrabold mt-4">Something went wrong</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
          An unexpected error occurred. Please reload the page — your data is safe.
        </p>
        {this.state.message && (
          <pre className="mt-3 text-xs text-gray-400 max-w-md overflow-x-auto">{this.state.message}</pre>
        )}
        <button
          onClick={() => window.location.assign('/')}
          className="mt-6 bg-primary hover:bg-primary-dark text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          Reload Raphbet
        </button>
      </div>
    );
  }
}

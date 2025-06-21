import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializePWA } from './lib/pwa';
import { initializeNotifications } from './lib/notifications-helper';

// Add error boundary for the entire app
class ErrorBoundary extends Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if ((this.state as any).hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-cream p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
            <h1 className="text-2xl font-bold text-red-700 mb-4">Something went wrong</h1>
            <p className="text-red-600 mb-6">{(this.state as any).error?.message || "An unexpected error occurred"}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-navy text-cream rounded-lg hover:bg-navy/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize PWA and notifications (non-blocking)
setTimeout(() => {
  try {
    // Initialize PWA features
    initializePWA();
    
    // Initialize notification system
    initializeNotifications();
  } catch (e) {
    console.warn('Initialization failed:', e);
  }
}, 2000);

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
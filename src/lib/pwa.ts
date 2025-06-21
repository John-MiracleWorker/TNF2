import { useState, useEffect } from 'react';

class PWAManager {
  private deferredPrompt: any = null;
  private updateAvailable = false;
  private updateReady = false;
  private installListeners: Function[] = [];
  private updateListeners: Function[] = [];
  private appVersion: string | null = null;

  constructor() {
    // Only initialize in production and in supported environments
    if (this.isServiceWorkerSupported() && import.meta.env.PROD) {
      this.setupEventListeners();
    }
  }

  private isServiceWorkerSupported(): boolean {
    // More comprehensive check for unsupported environments
    const isWebContainer = window.location.hostname.includes('stackblitz.io') ||
                          window.location.hostname.includes('webcontainer.io') ||
                          (window.location.hostname.includes('localhost') && import.meta.env.DEV);
    
    // Check if service workers are supported and not in unsupported environment
    return (
      'serviceWorker' in navigator && 
      !isWebContainer
    );
  }

  private setupEventListeners() {
    // Install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.notifyInstallListeners();
    });
    
    // Handle update available event
    if ('serviceWorker' in navigator) {
      // Check for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          this.appVersion = event.data.version;
          this.updateAvailable = true;
          this.notifyUpdateListeners();
        }
      });
      
      // Also check for update on page load
      window.addEventListener('load', () => {
        this.checkForUpdates();
      });
      
      // Check for updates when the app becomes visible again
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.checkForUpdates();
        }
      });
    }
  }

  async registerServiceWorker() {
    // Enhanced check with try-catch for better error handling
    if (!this.isServiceWorkerSupported()) {
      console.log('Service Worker not supported in this environment');
      return;
    }

    try {
      // Double-check environment before attempting registration
      if (window.location.hostname.includes('stackblitz.io') || 
          window.location.hostname.includes('webcontainer.io')) {
        console.log('Service Worker registration skipped in WebContainer environment');
        return;
      }

      // Use native service worker registration
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/sw.js', { 
          scope: '/',
          // Always update on page load in development to get the latest changes
          updateViaCache: import.meta.env.DEV ? 'none' : 'imports'
        });
        console.log('Service Worker registered successfully', registration);
        
        // Check immediately for waiting service worker
        if (registration.waiting) {
          this.updateReady = true;
          this.updateAvailable = true;
          this.notifyUpdateListeners();
        }
        
        // Add listener for new service workers
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is ready
                this.updateReady = true;
                this.updateAvailable = true;
                this.notifyUpdateListeners();
              }
            });
          }
        });

        // Add listener for push subscription changes
        try {
          // Check if we have a push subscription
          const subscription = await registration.pushManager.getSubscription();
          
          if (subscription) {
            console.log('Push subscription exists:', subscription.endpoint);
          } else {
            console.log('No push subscription found');
          }
        } catch (subError) {
          console.error('Error checking push subscription:', subError);
        }
      }
    } catch (error) {
      // Completely silent fail for development environments
      if (import.meta.env.DEV) {
        console.log('Service Worker registration not available in development');
      } else {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }
  
  async checkForUpdates() {
    if (!this.isServiceWorkerSupported()) return;
    
    try {
      // Get the current registration
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('Checking for service worker updates...');
        
        // Check if there's a waiting worker
        if (registration.waiting) {
          this.updateReady = true;
          this.updateAvailable = true;
          this.notifyUpdateListeners();
          return;
        }
        
        // Force update check
        await registration.update();
        
        // Check for version mismatch using cache
        const currentVersion = localStorage.getItem('app_version');
        const buildTimestamp = import.meta.env.VITE_BUILD_TIME || Date.now();
        
        // If we have a version stored and it's different from the current build
        if (currentVersion && currentVersion !== String(buildTimestamp)) {
          this.updateAvailable = true;
          this.notifyUpdateListeners();
        }
        
        // Store the current version
        localStorage.setItem('app_version', String(buildTimestamp));
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }

  skipWaiting() {
    if (this.updateAvailable && navigator.serviceWorker) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration && registration.waiting) {
          console.log('Sending SKIP_WAITING message to waiting service worker');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          // Reload the page after a short delay to ensure the new service worker activates
          setTimeout(() => {
            console.log('Reloading page to activate new service worker');
            window.location.reload();
          }, 500);
        }
      });
    }
  }

  // Install prompt functionality
  async promptInstall() {
    if (!this.deferredPrompt) return false;

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    // Notify listeners that install prompt is no longer available
    this.notifyInstallListeners();
    return outcome === 'accepted';
  }

  canInstall() {
    return !!this.deferredPrompt;
  }

  canUpdate() {
    return this.updateAvailable;
  }
  
  getAppVersion() {
    return this.appVersion;
  }

  // Observer pattern for install prompt
  addInstallListener(callback: Function) {
    this.installListeners.push(callback);
    // Immediately notify if prompt is already available
    if (this.deferredPrompt) {
      callback(true);
    }
    return () => {
      this.installListeners = this.installListeners.filter(cb => cb !== callback);
    };
  }

  private notifyInstallListeners() {
    const canInstall = this.canInstall();
    this.installListeners.forEach(callback => callback(canInstall));
  }

  // Observer pattern for updates
  addUpdateListener(callback: Function) {
    this.updateListeners.push(callback);
    // Immediately notify if update is already available
    if (this.updateAvailable) {
      callback(true, this.appVersion);
    }
    return () => {
      this.updateListeners = this.updateListeners.filter(cb => cb !== callback);
    };
  }

  private notifyUpdateListeners() {
    const canUpdate = this.canUpdate();
    this.updateListeners.forEach(callback => callback(canUpdate, this.appVersion));
  }
}

export const pwaManager = new PWAManager();

// Initialize PWA features
export function initializePWA() {
  try {
    // Only attempt in supported environments
    if (window.location.hostname.includes('stackblitz.io') || 
        window.location.hostname.includes('webcontainer.io')) {
      return;
    }
    
    // Register service worker
    pwaManager.registerServiceWorker();
    
    // Check for updates on page load
    pwaManager.checkForUpdates();
    
    // Set up periodic update checks (every 30 minutes)
    setInterval(() => {
      pwaManager.checkForUpdates();
    }, 30 * 60 * 1000);
  } catch (error) {
    // Silently handle PWA initialization errors in development
    console.log('PWA features not available in this environment');
  }
}

// React hook for using PWA features
export function usePWA() {
  const [canInstall, setCanInstall] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to install availability changes
    const removeInstallListener = pwaManager.addInstallListener((available: boolean) => {
      setCanInstall(available);
    });

    // Subscribe to update availability changes
    const removeUpdateListener = pwaManager.addUpdateListener((available: boolean, version: string | null) => {
      setUpdateAvailable(available);
      setAppVersion(version);
    });

    return () => {
      removeInstallListener();
      removeUpdateListener();
    };
  }, []);

  return {
    canInstall,
    promptInstall: () => pwaManager.promptInstall(),
    updateAvailable,
    appVersion,
    applyUpdate: () => pwaManager.skipWaiting(),
  };
}
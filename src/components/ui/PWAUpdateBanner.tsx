import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PWAUpdateBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  
  useEffect(() => {
    // Listen for update message from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        console.log('Update available', event.data.version);
        setAppVersion(event.data.version);
        setShowBanner(true);
      }
    };
    
    // Add message listener
    navigator.serviceWorker.addEventListener('message', handleMessage);
    
    // Check if there's already an active service worker registration
    const checkForUpdates = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          
          // Check if there's a waiting service worker
          if (registration && registration.waiting) {
            console.log('New service worker waiting');
            setShowBanner(true);
          }
          
          // Also check if there's an update available
          if (registration) {
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker is installed but waiting
                    console.log('New service worker installed and waiting');
                    setShowBanner(true);
                  }
                });
              }
            });
            
            // Check for updates every hour
            setInterval(() => {
              console.log('Checking for service worker updates');
              registration.update();
            }, 60 * 60 * 1000);
          }
        } catch (error) {
          console.error('Error checking for service worker updates', error);
        }
      }
    };
    
    checkForUpdates();
    
    // Initial check on load
    const checkForCacheVersion = () => {
      const currentVersion = localStorage.getItem('app_version');
      const buildTimestamp = import.meta.env.VITE_BUILD_TIME || Date.now();
      
      // If we have a version stored and it's different from the current build
      if (currentVersion && currentVersion !== String(buildTimestamp)) {
        setShowBanner(true);
      }
      
      // Store the current version
      localStorage.setItem('app_version', String(buildTimestamp));
    };
    
    checkForCacheVersion();
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);
  
  const handleUpdate = () => {
    // Force refresh
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration && registration.waiting) {
          // Send skip-waiting message
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    }
    
    // Hard reload the page to get the latest version
    window.location.reload();
    setShowBanner(false);
  };
  
  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          className="fixed bottom-4 right-4 z-50 max-w-md"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-secondary text-secondary-foreground p-4 rounded-lg shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <h3 className="text-base font-medium">Update Available</h3>
                <p className="text-sm mt-1">
                  A new version of TrueNorth is available. 
                  {appVersion && ` (v${appVersion})`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-secondary-foreground hover:text-secondary-foreground/70"
                onClick={() => setShowBanner(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 flex justify-end gap-3">
              <Button
                size="sm"
                onClick={handleUpdate}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Update Now
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
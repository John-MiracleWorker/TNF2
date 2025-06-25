import { useState, useEffect } from 'react';
import { usePWA } from '@/lib/pwa';
import { Button } from './button';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';

export function PWAUpdateBanner() {
  const { updateAvailable, applyUpdate } = usePWA();
  const [visible, setVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Delay showing the banner by 1 second to avoid flashing on page load
  useEffect(() => {
    if (updateAvailable && !isDismissed) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [updateAvailable, isDismissed]);

  const handleUpdateNow = () => {
    applyUpdate();
    setVisible(false);
  };

  const handleClose = () => {
    setVisible(false);
    setIsDismissed(true);

    // Reset dismiss after 24 hours
    setTimeout(() => {
      setIsDismissed(false);
    }, 24 * 60 * 60 * 1000);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-secondary text-secondary-foreground shadow-lg"
        >
          <div className="flex items-center">
            <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
            <span className="text-sm font-medium">A new version is available! Update now for the latest features and improvements.</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="secondary" size="sm" onClick={handleUpdateNow}>
              Update Now
            </Button>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
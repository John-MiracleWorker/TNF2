import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ArrowRight, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/lib/pwa';

export function PWAInstallBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const { canInstall, promptInstall } = usePWA();
  
  // Show banner when installation is available
  useEffect(() => {
    if (canInstall) {
      // Show after a delay to avoid immediate popup on first visit
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [canInstall]);
  
  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setIsVisible(false);
    }
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="max-w-md mx-auto bg-card shadow-lg rounded-lg overflow-hidden border border-secondary/20">
            <div className="flex items-start p-4">
              <div className="flex-1 ml-3 mr-4">
                <h3 className="font-semibold text-card-foreground">Install TrueNorth</h3>
                <p className="text-sm text-card-foreground/80 mt-1">
                  Add TrueNorth to your home screen for quick access to your spiritual journey.
                </p>
                <div className="flex space-x-2 mt-3">
                  <Button 
                    size="sm" 
                    variant="secondary"
                    className="font-medium"
                    onClick={handleInstall}
                  >
                    <Download className="mr-1 h-4 w-4" />
                    Install
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setIsVisible(false)}
                  >
                    <ArrowRight className="mr-1 h-4 w-4" />
                    Later
                  </Button>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-full -mt-1 -mr-1" 
                onClick={() => setIsVisible(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
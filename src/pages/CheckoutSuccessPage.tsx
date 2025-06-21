import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Simulate checking the payment status
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessionId]);

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center py-12 px-4">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            {isLoading ? (
              <div className="py-8">
                <Loader2 className="h-16 w-16 text-gold animate-spin mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-navy mb-2">Processing Your Payment</h1>
                <p className="text-navy/70">
                  Please wait while we confirm your payment...
                </p>
              </div>
            ) : (
              <>
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-navy mb-2">Payment Successful!</h1>
                <p className="text-navy/70 mb-6">
                  Thank you for subscribing to TrueNorth Pro. Your account has been upgraded and you now have access to all premium features.
                </p>
                
                <div className="space-y-4">
                  <Button 
                    asChild 
                    className="w-full bg-gold text-navy hover:bg-gold/90"
                  >
                    <Link to="/dashboard">
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    asChild 
                    className="w-full border-navy text-navy hover:bg-navy/5"
                  >
                    <Link to="/chat">
                      Start a Conversation
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CheckoutSuccessPage;
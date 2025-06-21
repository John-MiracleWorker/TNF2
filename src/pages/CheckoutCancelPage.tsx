import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const CheckoutCancelPage = () => {
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
            <XCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-navy mb-2">Payment Cancelled</h1>
            <p className="text-navy/70 mb-6">
              Your payment process was cancelled. No charges were made to your account.
            </p>
            
            <div className="space-y-4">
              <Button 
                asChild 
                className="w-full bg-gold text-navy hover:bg-gold/90"
              >
                <Link to="/pricing">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to Pricing
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                asChild 
                className="w-full border-navy text-navy hover:bg-navy/5"
              >
                <Link to="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CheckoutCancelPage;
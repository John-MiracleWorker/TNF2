import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { PRODUCTS } from '@/stripe-config';
import { createCheckoutSession, getUserSubscription, isSubscriptionActive } from '@/lib/stripe';
import { AuthContext } from '@/App';
import { useToast } from '@/hooks/use-toast';

const PricingPage = () => {
  const { session } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (session) {
      loadSubscription();
    } else {
      setIsLoadingSubscription(false);
    }
  }, [session]);

  const loadSubscription = async () => {
    try {
      const data = await getUserSubscription();
      setSubscription(data);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  const handleSubscribe = async (priceId: string, mode: 'subscription' | 'payment') => {
    if (!session) {
      // Redirect to login if not authenticated
      navigate('/login?redirect=pricing');
      return;
    }

    setIsLoading(true);
    try {
      const { url } = await createCheckoutSession(priceId, mode);
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create checkout session',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isCurrentPlan = (priceId: string) => {
    return subscription?.price_id === priceId && isSubscriptionActive(subscription?.subscription_status);
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Navbar />
      
      {/* Background with new mountain image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/serene-mountains-background.png" 
          alt="Peaceful mountains" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-cream/80"></div>
      </div>
      
      <main className="flex-grow pt-24 pb-16 relative z-10">
        <div className="container-custom mx-auto">
          <motion.div 
            className="mb-12 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold text-navy mb-4">Choose Your Plan</h1>
            <p className="text-lg text-navy/70 max-w-2xl mx-auto">
              Invest in your spiritual growth with TrueNorth's premium features and personalized guidance
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="border-navy/10 h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-2xl">Free Plan</CardTitle>
                  <CardDescription>Basic features to start your journey</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-navy">$0</span>
                    <span className="text-navy/60 ml-1">/ month</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                      <span>Limited AI conversations</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                      <span>Basic prayer tracking</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                      <span>Daily devotional access</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                      <span>Simple journal entries</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full border-navy text-navy hover:bg-navy/5"
                    asChild
                  >
                    <Link to="/register">Get Started</Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
            
            {/* Pro Plan */}
            {PRODUCTS.map((product, index) => (
              <motion.div
                key={product.priceId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="md:col-span-2"
              >
                <Card className="border-gold h-full flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mt-2 -mr-2">
                    <Badge className="bg-gold text-navy">Recommended</Badge>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-2xl">{product.name}</CardTitle>
                    <CardDescription>{product.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-navy">$10</span>
                      <span className="text-navy/60 ml-1">/ month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <ul className="space-y-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {product.features?.map((feature, i) => (
                        <li key={i} className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 mr-2 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {isLoadingSubscription ? (
                      <Button disabled className="w-full">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </Button>
                    ) : isCurrentPlan(product.priceId) ? (
                      <Button disabled className="w-full bg-green-600 hover:bg-green-700">
                        <Check className="mr-2 h-4 w-4" />
                        Current Plan
                      </Button>
                    ) : (
                      <Button 
                        className="w-full bg-gold text-navy hover:bg-gold/90"
                        onClick={() => handleSubscribe(product.priceId, product.mode)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Subscribe Now'
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <h3 className="text-xl font-semibold text-navy mb-4">Frequently Asked Questions</h3>
            <div className="max-w-3xl mx-auto space-y-6 text-left">
              <div>
                <h4 className="font-medium text-navy">Can I cancel my subscription anytime?</h4>
                <p className="text-navy/70">Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.</p>
              </div>
              <div>
                <h4 className="font-medium text-navy">Is my payment information secure?</h4>
                <p className="text-navy/70">Absolutely. We use Stripe, a PCI-compliant payment processor, to handle all transactions securely.</p>
              </div>
              <div>
                <h4 className="font-medium text-navy">What happens when my free trial ends?</h4>
                <p className="text-navy/70">After your trial period, you'll be automatically billed for the plan you selected unless you cancel beforehand.</p>
              </div>
              <div>
                <h4 className="font-medium text-navy">How does the AI guidance work?</h4>
                <p className="text-navy/70">TrueNorth uses advanced AI trained on biblical principles to provide personalized spiritual guidance while respecting your privacy.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PricingPage;
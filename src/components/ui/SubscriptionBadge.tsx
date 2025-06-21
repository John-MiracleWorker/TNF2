import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock } from 'lucide-react';
import { getUserSubscription, isSubscriptionActive } from '@/lib/stripe';

export function SubscriptionBadge() {
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const data = await getUserSubscription();
      setSubscription(data);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null;
  }

  if (!subscription || !isSubscriptionActive(subscription?.subscription_status)) {
    return null;
  }

  if (subscription?.cancel_at_period_end) {
    const endDate = new Date(subscription.current_period_end * 1000);
    const formattedDate = new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }).format(endDate);
    
    return (
      <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">
        <Clock className="h-3 w-3 mr-1" />
        Pro until {formattedDate}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="ml-2 bg-gold/20 text-gold border-gold/20 dark:bg-gold/20 dark:text-gold dark:border-gold/30">
      <Sparkles className="h-3 w-3 mr-1" />
      Pro
    </Badge>
  );
}
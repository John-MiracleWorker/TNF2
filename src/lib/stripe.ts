import { supabase } from './supabase';

export async function createCheckoutSession(priceId: string, mode: 'payment' | 'subscription') {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Get the current session for authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('You must be logged in to make a purchase');
    }

    // Get the current URL for success and cancel URLs
    const origin = window.location.origin;
    const successUrl = `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/checkout/cancel`;

    // Call the Supabase Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        price_id: priceId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        mode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export async function getUserSubscription() {
  try {
    // Get the current environment
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname.includes('stackblitz.io') ||
                         window.location.hostname.includes('127.0.0.1');
    
    // Special case for demo user
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email === 'demo@example.com') {
      console.log('Pro subscription simulation active for demo user');
      return {
        customer_id: 'cus_demo',
        subscription_id: 'sub_demo',
        subscription_status: 'active',
        price_id: 'price_1RWniVGWK1AYSv44HACsdk5J',
        current_period_start: Date.now() / 1000 - 86400,
        current_period_end: Date.now() / 1000 + 2592000,
        cancel_at_period_end: false,
        payment_method_brand: 'visa',
        payment_method_last4: '4242'
      };
    }
    
    // For development environments, check if we want to simulate pro subscriptions
    if (isDevelopment && localStorage.getItem('simulate_pro_subscription') === 'true') {
      console.log('Simulating pro subscription in development environment');
      return {
        customer_id: 'cus_sim_dev',
        subscription_id: 'sub_sim_dev',
        subscription_status: 'active',
        price_id: 'price_1RWniVGWK1AYSv44HACsdk5J',
        current_period_start: Date.now() / 1000 - 86400,
        current_period_end: Date.now() / 1000 + 2592000,
        cancel_at_period_end: false,
        payment_method_brand: 'visa',
        payment_method_last4: '4242'
      };
    }
    
    const { data, error } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .order('current_period_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100);
}

export function isSubscriptionActive(status?: string | null) {
  // Special case for demo user
  const checkDemoUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email === 'demo@example.com';
  };
  
  if (checkDemoUser()) {
    return true;
  }
  
  // Get the current environment
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname.includes('stackblitz.io') ||
                       window.location.hostname.includes('127.0.0.1');
  
  // For development environments, check if we want to simulate pro subscriptions
  if (isDevelopment && localStorage.getItem('simulate_pro_subscription') === 'true') {
    return true;
  }
  
  return status === 'active' || status === 'trialing';
}

// Helper function to toggle development mode pro simulation
export function toggleDevProSimulation(enabled: boolean) {
  if (enabled) {
    localStorage.setItem('simulate_pro_subscription', 'true');
  } else {
    localStorage.removeItem('simulate_pro_subscription');
  }
  
  // Reload to apply changes
  window.location.reload();
}

// Helper function to manage customer portal
export async function createCustomerPortalSession() {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('You must be logged in to access billing');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/stripe-customer-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        return_url: window.location.origin + '/profile'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create customer portal session');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
}
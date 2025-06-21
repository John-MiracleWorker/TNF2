// Enhanced notification utilities for TrueNorth application
import { supabase } from './supabase';

// Store VAPID public key
const VAPID_PUBLIC_KEY = 'BEnEePgvIPs4ab2TKywxuiAcLdtbCz1Ck0DTnZmBIHuqyP3Ir9HX76YatbdHjMdOb8VPm0nXNNUPneuqGsmQurw';

/**
 * Initialize notifications system - call this during app startup
 */
export async function initializeNotifications() {
  try {
    // Check if we're in development or unsupported environments
    if (import.meta.env.DEV || 
        window.location.hostname === 'localhost' ||
        window.location.hostname.includes('stackblitz.io') || 
        window.location.hostname.includes('webcontainer.io') ||
        window.location.hostname.includes('preview.stackblitz.io')) {
      console.log('Skipping service worker registration in development/unsupported environment');
      return;
    }
    
    // Check if logged in
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      console.log('Not logged in, skipping notification initialization');
      return;
    }
    
    // Register service worker if browser supports it
    if ('serviceWorker' in navigator) {
      try {
        console.log('Registering service worker...');
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('Service worker registered successfully:', registration);
        
        // If notification permission is granted, try to subscribe
        if (Notification.permission === 'granted') {
          await subscribeToPushNotifications();
        }
        
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    } else {
      console.log('Service workers not supported in this browser');
    }
  } catch (error) {
    console.error('Error initializing notifications:', error);
  }
}

/**
 * Request permission and subscribe to push notifications
 */
export async function enableNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported in this browser');
    return { success: false, reason: 'not_supported' };
  }
  
  try {
    // Request notification permission
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { success: false, reason: 'permission_denied' };
      }
    }
    
    // Subscribe to push notifications
    const subscribed = await subscribeToPushNotifications();
    return { success: subscribed, reason: subscribed ? null : 'subscription_failed' };
  } catch (error) {
    console.error('Error enabling notifications:', error);
    return { success: false, reason: 'error', details: error };
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<boolean> {
  try {
    if (!('PushManager' in window) || !('serviceWorker' in navigator)) {
      console.log('Push notifications not supported');
      return false;
    }

    // Check if notification permission is granted
    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    // Skip in development environments
    if (import.meta.env.DEV || 
        window.location.hostname === 'localhost' ||
        window.location.hostname.includes('stackblitz.io') || 
        window.location.hostname.includes('webcontainer.io')) {
      console.log('Skipping push subscription in development environment');
      return false;
    }

    // Register service worker if not already registered
    let registration;
    try {
      registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Service worker registered successfully', registration);
    } catch (regError) {
      console.error('Error registering service worker:', regError);
      return false;
    }

    // Wait for the service worker to be ready
    registration = await navigator.serviceWorker.ready;

    // Get existing subscription or create a new one
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('Already subscribed to push notifications');
      await saveSubscriptionToServer(subscription);
      return true;
    }

    // Subscribe the user
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      
      console.log('Subscribed to push notifications:', subscription);
      
      // Save the subscription on the server
      const saved = await saveSubscriptionToServer(subscription);
      return saved;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    }
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
}

/**
 * Save push subscription to the server
 */
async function saveSubscriptionToServer(subscription: PushSubscription): Promise<boolean> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('No active session');
      return false;
    }
    
    if (!supabaseUrl) {
      console.error("Missing Supabase URL configuration");
      return false;
    }
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/save-push-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ subscription })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save push subscription');
      }
      
      return true;
    } catch (err) {
      console.error("Error saving subscription:", err);
      return false;
    }
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return false;
  }
}

/**
 * Check notification status and provide detailed diagnostics
 */
export async function checkNotificationStatus(): Promise<{
  browserSupport: boolean;
  permission: string;
  serviceWorker: {
    supported: boolean;
    registered: boolean;
    active: boolean;
  };
  pushSubscription: {
    supported: boolean;
    subscribed: boolean;
    endpoint: string | null;
  };
  userPreferences: {
    enabled: boolean;
    pushEnabled: boolean;
  }
}> {
  // Check browser support
  const browserSupport = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  const permission = browserSupport ? Notification.permission : 'not-supported';
  
  // Service worker status
  let serviceWorkerSupported = 'serviceWorker' in navigator;
  let serviceWorkerRegistered = false;
  let serviceWorkerActive = false;
  let pushSupported = 'PushManager' in window;
  let pushSubscribed = false;
  let subscriptionEndpoint = null;
  
  if (serviceWorkerSupported) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      serviceWorkerRegistered = !!registration;
      serviceWorkerActive = !!registration?.active;
      
      if (registration && pushSupported) {
        const subscription = await registration.pushManager.getSubscription();
        pushSubscribed = !!subscription;
        subscriptionEndpoint = subscription?.endpoint || null;
      }
    } catch (error) {
      console.error('Error checking service worker status:', error);
    }
  }
  
  // Check user preferences
  let userPrefsEnabled = false;
  let pushPrefsEnabled = false;
  
  try {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('notification_preferences')
        .eq('id', data.user.id)
        .single();
      
      if (prefs && prefs.notification_preferences) {
        userPrefsEnabled = Object.values(prefs.notification_preferences)
          .some((value: any) => value === true);
      }
    }
  } catch (error) {
    console.error('Error checking user preferences:', error);
  }
  
  // Check push subscriptions in database
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { count } = await supabase
        .from('push_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
      
      pushPrefsEnabled = !!count && count > 0;
    }
  } catch (error) {
    console.error('Error checking push subscriptions:', error);
  }
  
  return {
    browserSupport,
    permission,
    serviceWorker: {
      supported: serviceWorkerSupported,
      registered: serviceWorkerRegistered,
      active: serviceWorkerActive
    },
    pushSubscription: {
      supported: pushSupported,
      subscribed: pushSubscribed,
      endpoint: subscriptionEndpoint
    },
    userPreferences: {
      enabled: userPrefsEnabled,
      pushEnabled: pushPrefsEnabled
    }
  };
}

/**
 * Helper function to convert base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Send test notification to verify everything is working
 */
export async function sendTestNotificationWithDiagnostics(): Promise<{
  success: boolean;
  steps: Array<{ step: string; status: 'success' | 'warning' | 'error'; message: string }>;
  finalStatus: string;
}> {
  const diagnosticSteps: Array<{ step: string; status: 'success' | 'warning' | 'error'; message: string }> = [];
  let overallSuccess = false;
  
  // Step 1: Check browser support
  if (!('Notification' in window)) {
    diagnosticSteps.push({
      step: 'Browser Support',
      status: 'error',
      message: 'Your browser does not support notifications'
    });
    return { success: false, steps: diagnosticSteps, finalStatus: 'Browser not supported' };
  } else {
    diagnosticSteps.push({
      step: 'Browser Support',
      status: 'success',
      message: 'Your browser supports notifications'
    });
  }
  
  // Step 2: Check permission
  if (Notification.permission === 'denied') {
    diagnosticSteps.push({
      step: 'Notification Permission',
      status: 'error',
      message: 'Notification permission denied by browser. Please update browser settings.'
    });
    return { success: false, steps: diagnosticSteps, finalStatus: 'Permission denied' };
  } else if (Notification.permission === 'granted') {
    diagnosticSteps.push({
      step: 'Notification Permission',
      status: 'success',
      message: 'Notification permission granted'
    });
  } else {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        diagnosticSteps.push({
          step: 'Notification Permission',
          status: 'success',
          message: 'Notification permission granted'
        });
      } else {
        diagnosticSteps.push({
          step: 'Notification Permission',
          status: 'error',
          message: 'Notification permission denied'
        });
        return { success: false, steps: diagnosticSteps, finalStatus: 'Permission denied' };
      }
    } catch (error) {
      diagnosticSteps.push({
        step: 'Notification Permission',
        status: 'error',
        message: 'Error requesting notification permission'
      });
      return { success: false, steps: diagnosticSteps, finalStatus: 'Permission error' };
    }
  }
  
  // Step 3: Check if we're in development environment
  if (import.meta.env.DEV || 
      window.location.hostname === 'localhost' ||
      window.location.hostname.includes('stackblitz.io') || 
      window.location.hostname.includes('webcontainer.io')) {
    diagnosticSteps.push({
      step: 'Environment Check',
      status: 'warning',
      message: 'Running in development environment - push notifications not available'
    });
    
    // Just send a local notification for testing
    try {
      const notification = new Notification('TrueNorth Test Notification', {
        body: 'This is a test notification to verify your settings are working correctly.',
        icon: '/TrueNorth Compass Logo copy.png',
        badge: '/TrueNorth Compass Logo copy.png',
        tag: 'test-notification'
      });
      
      diagnosticSteps.push({
        step: 'Local Notification',
        status: 'success',
        message: 'Local notification displayed successfully'
      });
      
      // Auto-close the notification after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
      
      return { 
        success: true, 
        steps: diagnosticSteps, 
        finalStatus: 'Local notifications working (development environment)' 
      };
    } catch (notifError) {
      diagnosticSteps.push({
        step: 'Local Notification',
        status: 'error',
        message: 'Failed to display local notification: ' + (notifError instanceof Error ? notifError.message : String(notifError))
      });
      return { success: false, steps: diagnosticSteps, finalStatus: 'Local notification failed' };
    }
  }
  
  // Step 4: Check service worker (production only)
  if (!('serviceWorker' in navigator)) {
    diagnosticSteps.push({
      step: 'Service Worker',
      status: 'error',
      message: 'Service workers not supported in your browser'
    });
    return { success: false, steps: diagnosticSteps, finalStatus: 'Service worker not supported' };
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      // Try to register the service worker
      try {
        const newRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        diagnosticSteps.push({
          step: 'Service Worker',
          status: 'success',
          message: 'Service worker registered successfully'
        });
      } catch (regError) {
        diagnosticSteps.push({
          step: 'Service Worker',
          status: 'error',
          message: 'Failed to register service worker: ' + (regError instanceof Error ? regError.message : String(regError))
        });
        return { success: false, steps: diagnosticSteps, finalStatus: 'Service worker registration failed' };
      }
    } else {
      diagnosticSteps.push({
        step: 'Service Worker',
        status: 'success',
        message: 'Service worker already registered'
      });
    }
  } catch (swError) {
    diagnosticSteps.push({
      step: 'Service Worker',
      status: 'error',
      message: 'Error checking service worker: ' + (swError instanceof Error ? swError.message : String(swError))
    });
    return { success: false, steps: diagnosticSteps, finalStatus: 'Service worker error' };
  }
  
  // Step 5: Check push subscription
  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        
        diagnosticSteps.push({
          step: 'Push Subscription',
          status: 'success',
          message: 'Created new push subscription'
        });
      } catch (subError) {
        diagnosticSteps.push({
          step: 'Push Subscription',
          status: 'error',
          message: 'Failed to create push subscription: ' + (subError instanceof Error ? subError.message : String(subError))
        });
        return { success: false, steps: diagnosticSteps, finalStatus: 'Push subscription failed' };
      }
    } else {
      diagnosticSteps.push({
        step: 'Push Subscription',
        status: 'success',
        message: 'Push subscription already exists'
      });
    }
    
    // Save subscription to server
    const saved = await saveSubscriptionToServer(subscription);
    if (!saved) {
      diagnosticSteps.push({
        step: 'Server Sync',
        status: 'warning',
        message: 'Failed to save subscription to server, but local setup is complete'
      });
    } else {
      diagnosticSteps.push({
        step: 'Server Sync',
        status: 'success',
        message: 'Subscription saved to server'
      });
    }
  } catch (error) {
    diagnosticSteps.push({
      step: 'Push Subscription',
      status: 'error',
      message: 'Error in push subscription process: ' + (error instanceof Error ? error.message : String(error))
    });
    return { success: false, steps: diagnosticSteps, finalStatus: 'Push subscription error' };
  }
  
  // Step 6: Send a local test notification
  try {
    const notification = new Notification('TrueNorth Test Notification', {
      body: 'This is a test notification to verify your settings are working correctly.',
      icon: '/TrueNorth Compass Logo copy.png',
      badge: '/TrueNorth Compass Logo copy.png',
      tag: 'test-notification'
    });
    
    diagnosticSteps.push({
      step: 'Local Notification',
      status: 'success',
      message: 'Local notification displayed successfully'
    });
    
    // Auto-close the notification after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
    
    overallSuccess = true;
  } catch (notifError) {
    diagnosticSteps.push({
      step: 'Local Notification',
      status: 'error',
      message: 'Failed to display local notification: ' + (notifError instanceof Error ? notifError.message : String(notifError))
    });
    // Continue anyway, as push might still work
  }
  
  // Step 7: Trigger a server push notification
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      diagnosticSteps.push({
        step: 'Server Push',
        status: 'error',
        message: 'User not authenticated'
      });
    } else {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        diagnosticSteps.push({
          step: 'Server Push',
          status: 'error',
          message: 'Missing Supabase URL configuration'
        });
      } else {
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            type: 'test',
            force: true
          })
        });
        
        if (response.ok) {
          diagnosticSteps.push({
            step: 'Server Push',
            status: 'success',
            message: 'Server push notification triggered successfully'
          });
          overallSuccess = true;
        } else {
          const errorData = await response.text();
          diagnosticSteps.push({
            step: 'Server Push',
            status: 'warning',
            message: `Server push request failed: ${response.status} - ${errorData}`
          });
        }
      }
    }
  } catch (pushError) {
    diagnosticSteps.push({
      step: 'Server Push',
      status: 'warning',
      message: 'Error triggering server push: ' + (pushError instanceof Error ? pushError.message : String(pushError))
    });
  }
  
  // Final status
  return { 
    success: overallSuccess,
    steps: diagnosticSteps, 
    finalStatus: overallSuccess ? 'Notifications working correctly' : 'Some notification features not working'
  };
}
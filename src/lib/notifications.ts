import { supabase } from './supabase';

// Store VAPID public key
const VAPID_PUBLIC_KEY = 'BEnEePgvIPs4ab2TKywxuiAcLdtbCz1Ck0DTnZmBIHuqyP3Ir9HX76YatbdHjMdOb8VPm0nXNNUPneuqGsmQurw';

// Create a function to manually trigger notifications generation
export async function triggerNotificationsGeneration(type = 'batch', force = true) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Missing Supabase URL configuration');
    }
    
    // Get authentication token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('No active session available');
    }

    const apiUrl = `${supabaseUrl}/functions/v1/generate-notifications`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        force
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error triggering notifications:', error);
    throw error;
  }
}

// Create a function to add a notification via Edge Function
export async function createNotification(
  title: string, 
  message: string, 
  type: string = 'info', 
  actionLink?: string
) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData.user) {
      console.log('User not authenticated');
      return false;
    }
    
    // Call Edge Function instead of direct database insert
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Authentication error:', sessionError);
      return false;
    }

    const apiUrl = `${supabaseUrl}/functions/v1/generate-notifications`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        type: 'single',
        notification: {
          title,
          message,
          type,
          action_link: actionLink
        },
        force: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error creating notification via Edge Function:', errorData);
      return false;
    }

    const result = await response.json();
    return result.success || false;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
}

// Mark a notification as read
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    // First check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('No active session for notification count');
      return 0;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('is_read', false);
    
    if (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
    
    return data?.length || 0;
  } catch (error) {
    // Gracefully handle errors and return 0 instead of throwing
    console.error('Error getting unread notification count:', error);
    return 0;
  }
}

// Request notification permission from the browser
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      // Already has permission, let's subscribe to push
      await subscribeToPushNotifications();
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // Permission granted, subscribe to push
      await subscribeToPushNotifications();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

// Check current notification permission status
export function checkNotificationPermission(): string {
  if (!('Notification' in window)) {
    return 'not-supported';
  }
  
  return Notification.permission;
}

// Send a test local browser notification
export async function sendTestNotification(): Promise<boolean> {
  try {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    const notification = new Notification('TrueNorth Test Notification', {
      body: 'This is a test notification to verify your settings are working correctly.',
      icon: '/TrueNorth Compass Logo.png',
      badge: '/TrueNorth Compass Logo.png',
      tag: 'test-notification',
      requireInteraction: false,
      silent: false
    });

    // Auto-close the notification after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return true;
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
}

// Send a test push notification via the backend
export async function sendTestPushNotification(): Promise<boolean> {
  try {
    // First make sure we're subscribed to push notifications
    const isSubscribed = await subscribeToPushNotifications();
    if (!isSubscribed) {
      return false;
    }

    // Get Supabase URL - handle potential undefined value
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error("Missing Supabase URL configuration");
      return false;
    }
    
    // Get authentication token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("No active session available");
      return false;
    }

    const apiUrl = `${supabaseUrl}/functions/v1/generate-notifications`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'test',
        force: true,
        title: 'TrueNorth Test Push Notification',
        message: 'This is a test notification that was manually generated to verify your notification system is working.',
        action_link: '/notifications'
      })
    }).catch(error => {
      console.error('Network error when sending test push notification:', error);
      return null;
    });

    if (!response) {
      console.error("Network request failed");
      return false;
    }

    if (!response.ok) {
      console.error(`HTTP error: ${response.status}`);
      return false;
    }

    const result = await response.json();
    return result.success || false;
  } catch (error) {
    console.error('Error sending test push notification:', error);
    return false;
  }
}

// Create a test notification (for development) - now uses Edge Function
export async function createTestNotification(): Promise<boolean> {
  try {
    const types = ['prayer', 'devotional', 'chat', 'habit_reminder', 'achievement', 'alert'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    const titles = {
      prayer: 'Prayer Request Update',
      devotional: 'New Devotional Available',
      chat: 'New Message from TrueNorth',
      habit_reminder: 'Habit Reminder',
      achievement: 'New Achievement Unlocked',
      alert: 'Important Update'
    };
    
    const messages = {
      prayer: 'Someone prayed for your request "Guidance for my family"',
      devotional: 'Your personalized devotional for today is ready',
      chat: 'TrueNorth has a new insight to share with you',
      habit_reminder: 'Don\'t forget your daily Bible reading',
      achievement: 'You\'ve earned the "Scripture Warrior" badge!',
      alert: 'Your subscription will renew in 3 days'
    };
    
    const links = {
      prayer: '/prayer',
      devotional: '/devotionals',
      chat: '/chat',
      habit_reminder: '/habits',
      achievement: '/scripture-memory',
      alert: '/profile'
    };
    
    return await createNotification(
      titles[randomType as keyof typeof titles],
      messages[randomType as keyof typeof messages],
      randomType,
      links[randomType as keyof typeof links]
    );
  } catch (error) {
    console.error('Error creating test notification:', error);
    return false;
  }
}

// Check if notifications are properly set up in the browser
export async function checkNotificationsSetup(): Promise<{
  permissionStatus: string;
  isSubscribed: boolean;
  serviceWorkerRegistered: boolean;
}> {
  let permissionStatus = 'not-supported';
  let isSubscribed = false;
  let serviceWorkerRegistered = false;

  try {
    // Check if notifications are supported
    if ('Notification' in window) {
      permissionStatus = Notification.permission;
      
      // Check if service worker is registered
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          serviceWorkerRegistered = !!registration;
          
          // Check if push subscription exists
          if (registration && 'pushManager' in registration) {
            const subscription = await registration.pushManager.getSubscription();
            isSubscribed = !!subscription;
          }
        } catch (error) {
          console.error('Error checking service worker registration:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error checking notifications setup:', error);
  }
  
  return { permissionStatus, isSubscribed, serviceWorkerRegistered };
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(): Promise<boolean> {
  try {
    if (!('PushManager' in window) || !('serviceWorker' in navigator)) {
      console.log('Push notifications not supported');
      return false;
    }

    // Check if we already have permission
    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted');
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
      } catch (err) {
        console.error("Error saving subscription:", err);
        // Continue even if saving fails - the subscription is still created in the browser
      }
      
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    }
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
}

// Helper function to convert base64 to Uint8Array
// (required for the applicationServerKey)
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

// Function to diagnose notification issues
export async function diagnoseNotificationIssues(): Promise<{
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    // Check browser notification permission
    const permissionStatus = checkNotificationPermission();
    
    if (permissionStatus === 'not-supported') {
      issues.push('Your browser does not support notifications');
      recommendations.push('Try using a modern browser like Chrome, Firefox, or Edge');
    } else if (permissionStatus === 'denied') {
      issues.push('Notification permission is denied in your browser');
      recommendations.push('Please enable notifications in your browser settings for this site');
    } else if (permissionStatus !== 'granted') {
      issues.push('Notification permission has not been granted');
      recommendations.push('Click the "Enable Notifications" button to grant permission');
    }

    // Check service worker and push subscription
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (!registration) {
          issues.push('Service worker is not registered');
          recommendations.push('Reload the page to register the service worker');
        } else if ('pushManager' in registration) {
          const subscription = await registration.pushManager.getSubscription();
          
          if (!subscription && permissionStatus === 'granted') {
            issues.push('Push subscription is not set up');
            recommendations.push('Click "Fix Issues" to set up push notifications');
          }
        }
      } catch (error) {
        console.error('Error checking service worker:', error);
        issues.push('Error checking service worker status');
      }
    } else {
      issues.push('Service workers are not supported in your browser');
      recommendations.push('Try using a modern browser with service worker support');
    }

    // Check database connection
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .limit(1);
        
      if (error) {
        issues.push('Cannot access notifications data');
        recommendations.push('Check your internet connection and try again later');
      }
    } catch (error) {
      issues.push('Error connecting to notification database');
      recommendations.push('Ensure you have a stable internet connection');
    }

    // Check edge function status
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        issues.push('No active user session');
        recommendations.push('Try signing out and back in again');
      } else {
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            type: 'test',
            noExecution: true
          })
        });
        
        if (!response.ok) {
          issues.push('Edge functions not accessible');
          recommendations.push('Edge functions might be down or misconfigured. Try again later.');
        }
      }
    } catch (error) {
      issues.push('Error checking edge function status');
      recommendations.push('There might be a network issue or the edge functions are unavailable');
    }

    if (issues.length === 0) {
      issues.push('No issues detected with notification system');
      recommendations.push('Try creating a test notification to verify everything works');
    }

  } catch (error) {
    console.error('Error diagnosing notification issues:', error);
    issues.push('Error during diagnosis');
    recommendations.push('An unexpected error occurred while checking your notification setup');
  }

  return { issues, recommendations };
}

// Function to fix common notification issues
export async function fixNotificationIssues(): Promise<{
  success: boolean;
  fixed: string[];
  remaining: string[];
}> {
  const fixed: string[] = [];
  const remaining: string[] = [];
  let success = false;

  try {
    // Step 1: Check and request notification permission
    const permissionStatus = checkNotificationPermission();
    
    if (permissionStatus === 'not-supported') {
      remaining.push('Browser does not support notifications');
    } else if (permissionStatus === 'denied') {
      remaining.push('Notification permission denied by browser');
    } else if (permissionStatus !== 'granted') {
      try {
        const granted = await requestNotificationPermission();
        if (granted) {
          fixed.push('Notification permission granted');
        } else {
          remaining.push('Failed to get notification permission');
        }
      } catch (error) {
        remaining.push('Error requesting permission');
      }
    }

    // Step 2: Check and register service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        fixed.push('Service worker registered');
        
        // Step 3: Set up push subscription
        if ('pushManager' in registration && permissionStatus === 'granted') {
          const subscription = await registration.pushManager.getSubscription();
          
          if (!subscription) {
            const subscribed = await subscribeToPushNotifications();
            if (subscribed) {
              fixed.push('Push subscription created');
            } else {
              remaining.push('Failed to create push subscription');
            }
          } else {
            fixed.push('Push subscription already exists');
          }
        }
      } catch (error) {
        console.error('Error registering service worker:', error);
        remaining.push('Failed to register service worker');
      }
    } else {
      remaining.push('Service workers not supported by browser');
    }

    // Step 4: Test notification system
    try {
      await triggerNotificationsGeneration('test', true);
      fixed.push('Notification generation test successful');
      success = true;
    } catch (error) {
      console.error('Error testing notification generation:', error);
      remaining.push('Notification generation test failed');
    }

    return { success, fixed, remaining };
  } catch (error) {
    console.error('Error fixing notification issues:', error);
    remaining.push('Unexpected error during fixes');
    return { success: false, fixed, remaining };
  }
}
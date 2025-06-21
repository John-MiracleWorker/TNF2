// TrueNorth Service Worker for Push Notifications
const VERSION = '1.0.0';
console.log(`TrueNorth Service Worker v${VERSION} initializing...`);

// Cache name with version for cache busting
const CACHE_NAME = `truenorth-cache-v${VERSION}`;

// Application shell files to cache for offline access
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/TrueNorth Compass Logo copy.png',
  '/serene-mountains-background.png'
];

// Install event - cache app shell resources
self.addEventListener('install', event => {
  console.log('Service worker installing...');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  // Cache app shell files
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell files...');
        return cache.addAll(APP_SHELL);
      })
      .catch(error => {
        console.error('Error caching app shell:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service worker activating...');
  
  // Claim clients to ensure the service worker controls all clients
  event.waitUntil(clients.claim());
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', event => {
  // Skip cross-origin requests like API calls
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        // Clone the request as it's a one-time use stream
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Skip caching if response is not valid
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response as it's a one-time use stream
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
            
          return response;
        });
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', event => {
  console.log('Push notification received:', event);
  
  if (!event.data) {
    console.log('Push event has no data');
    return;
  }
  
  try {
    // Parse the notification data
    const data = event.data.json();
    console.log('Push data:', data);
    
    // Default notification options
    const options = {
      body: data.body || data.message || 'New notification from TrueNorth',
      icon: '/TrueNorth Compass Logo copy.png',
      badge: '/TrueNorth Compass Logo copy.png',
      tag: data.tag || 'default-notification',
      data: {
        url: data.url || data.action_link || '/',
        ...data
      },
      actions: data.actions || [],
      requireInteraction: data.requireInteraction !== false,
      silent: data.silent === true
    };
    
    // Show the notification
    event.waitUntil(
      self.registration.showNotification(data.title || 'TrueNorth', options)
    );
  } catch (error) {
    console.error('Error showing push notification:', error);
    
    // Fallback notification in case of parsing error
    event.waitUntil(
      self.registration.showNotification('TrueNorth Update', {
        body: 'You have a new notification',
        icon: '/TrueNorth Compass Logo copy.png',
        badge: '/TrueNorth Compass Logo copy.png'
      })
    );
  }
});

// Notification click event - handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  // Get the notification data
  const data = event.notification.data || {};
  const url = data.url || '/notifications';
  
  // Handle action clicks if present
  if (event.action) {
    console.log('Notification action clicked:', event.action);
    // Handle specific actions here if needed
  }
  
  // Open or focus the relevant page
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Check if there's already an open window
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no matching window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Message event - handle messages from the main thread
self.addEventListener('message', event => {
  console.log('Message received in service worker:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle other message types as needed
});

// Push subscription change event
self.addEventListener('pushsubscriptionchange', event => {
  console.log('Push subscription changed');
  
  // Re-subscribe with new details
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then(subscription => {
        // Send the new subscription to the server
        const baseUrl = self.location.origin;
        
        return fetch(`${baseUrl}/api/update-push-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            oldEndpoint: event.oldSubscription ? event.oldSubscription.endpoint : null,
            newSubscription: subscription
          })
        });
      })
  );
});

console.log('TrueNorth Service Worker initialized successfully');
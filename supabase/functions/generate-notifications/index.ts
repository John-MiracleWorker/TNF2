// Supabase Edge Function for generating and sending notifications
// This function is triggered by scheduled events or manual requests

// Import dependencies
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1'
import webPush from 'https://esm.sh/web-push@3.6.7'

// Set up VAPID keys for web push
// In production, these should be environment variables
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || 'BEnEePgvIPs4ab2TKywxuiAcLdtbCz1Ck0DTnZmBIHuqyP3Ir9HX76YatbdHjMdOb8VPm0nXNNUPneuqGsmQurw'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || 'uE6JK9yk9m5Y1X6SjGxwccnL0TvqMbgDvOWEP4GdTK0'

// Set up VAPID details
webPush.setVapidDetails(
  'mailto:tiuni65@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

// Define notification templates
const NOTIFICATION_TEMPLATES = {
  prayer_reminder: {
    title: 'Prayer Time',
    body: 'Take a moment to pray for your active prayer requests.',
    icon: '/TrueNorth Compass Logo copy.png',
    url: '/prayer',
    tag: 'prayer-reminder'
  },
  bible_reading: {
    title: 'Daily Bible Reading',
    body: 'Your daily scripture reading is ready for you.',
    icon: '/TrueNorth Compass Logo copy.png',
    url: '/bible',
    tag: 'bible-reading'
  },
  devotional: {
    title: 'Daily Devotional',
    body: 'Your personalized devotional is ready for reflection.',
    icon: '/TrueNorth Compass Logo copy.png',
    url: '/devotionals',
    tag: 'devotional'
  },
  habit_reminder: {
    title: 'Spiritual Habits',
    body: 'Don\'t forget to log your spiritual habits for today.',
    icon: '/TrueNorth Compass Logo copy.png',
    url: '/habits',
    tag: 'habit-reminder'
  },
  // Special templates
  achievement: (achievementName: string) => ({
    title: 'Achievement Unlocked!',
    body: `You've earned the "${achievementName}" achievement.`,
    icon: '/TrueNorth Compass Logo copy.png',
    url: '/scripture-memory',
    tag: 'achievement'
  }),
  prayer_answered: (prayerTitle: string) => ({
    title: 'Prayer Answered',
    body: `"${prayerTitle}" has been marked as answered!`,
    icon: '/TrueNorth Compass Logo copy.png',
    url: '/prayer',
    tag: 'prayer-update'
  })
}

serve(async (req) => {
  try {
    // Parse request
    const { method, headers } = req
    
    // Handle preflight CORS
    if (method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      })
    }
    
    // For security, ensure this is a POST request
    if (method !== 'POST') {
      return new Response(JSON.stringify({ 
        error: 'Method not allowed' 
      }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Get request body
    const body = await req.json()
    
    // Set up Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )
    
    // Get JWT token from Authorization header
    const authHeader = headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    
    // Create user-based client for RLS
    let supabaseClient = supabaseAdmin
    let userId = null
    
    if (token) {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
      if (error) {
        return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      if (user) {
        userId = user.id
        supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') || '',
          Deno.env.get('SUPABASE_ANON_KEY') || '',
          {
            global: { headers: { Authorization: `Bearer ${token}` } }
          }
        )
      }
    }
    
    // Get notification type and options
    const { type, notification, force, noExecution } = body
    
    // If noExecution flag is set, just return success (used for testing edge function connectivity)
    if (noExecution === true) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Edge function is accessible, execution skipped' 
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Handle different notification generation types
    
    // Single notification for a specific user
    if (type === 'single' && notification && userId) {
      const notificationData = {
        user_id: userId,
        title: notification.title,
        message: notification.message,
        type: notification.type || 'info',
        is_read: false,
        action_link: notification.action_link
      }
      
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert(notificationData)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create notification: ${error.message}`)
      }
      
      // Attempt to send push notification if available
      await sendPushNotification(userId, notificationData)
      
      return new Response(JSON.stringify({ 
        success: true, 
        notification: data 
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Test notification
    else if (type === 'test' && userId) {
      const testNotification = {
        user_id: userId,
        title: 'Test Notification',
        message: 'This is a test notification to verify your notification system is working correctly.',
        type: 'test',
        is_read: false,
        action_link: '/notifications',
        created_at: new Date().toISOString()
      }
      
      // Save to database
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert(testNotification)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create test notification: ${error.message}`)
      }
      
      // Send push notification
      await sendPushNotification(userId, testNotification)
      
      return new Response(JSON.stringify({ 
        success: true, 
        notification: data 
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Batch notifications for all users
    else if (type === 'batch') {
      // This would be triggered by a cron job or scheduler
      const notifications = await generateBatchNotifications(supabaseAdmin, force === true)
      
      return new Response(JSON.stringify({ 
        success: true, 
        notifications_count: notifications.length,
        notifications: notifications.length <= 10 ? notifications : notifications.slice(0, 10) 
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Invalid request
    else {
      return new Response(JSON.stringify({ 
        error: 'Invalid notification request' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
  } catch (err) {
    console.error('Error processing request:', err)
    
    return new Response(JSON.stringify({ 
      error: err.message || 'Internal server error' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// Function to generate batch notifications for all users
async function generateBatchNotifications(supabase: any, force = false) {
  const generatedNotifications = []
  
  // Get all users with notification preferences
  const { data: users, error: userError } = await supabase
    .from('user_preferences')
    .select('id, notification_preferences')
  
  if (userError) {
    console.error('Error fetching users:', userError)
    return []
  }
  
  // Get current time
  const now = new Date()
  const hour = now.getHours()
  const dayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday
  
  // For each user, check preferences and generate appropriate notifications
  for (const user of users) {
    try {
      const userId = user.id
      const preferences = user.notification_preferences || {}
      
      // Skip users who have disabled notifications (all preferences false)
      if (!Object.values(preferences).some(val => val === true)) {
        continue
      }
      
      // Check for quiet hours
      if (preferences.quiet_hours?.enabled) {
        const quietStart = preferences.quiet_hours.start || '22:00'
        const quietEnd = preferences.quiet_hours.end || '08:00'
        
        const quietStartHour = parseInt(quietStart.split(':')[0])
        const quietEndHour = parseInt(quietEnd.split(':')[0])
        
        // Skip if current hour is within quiet hours
        if (isWithinQuietHours(hour, quietStartHour, quietEndHour)) {
          continue
        }
      }
      
      // Check notification frequency
      const frequency = preferences.frequency || 'daily'
      
      // For custom schedules, check if today is a selected day
      if (frequency === 'custom') {
        const customDays = preferences.custom_days || []
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        const today = days[dayOfWeek]
        
        if (!customDays.includes(today) && !force) {
          continue
        }
      }
      
      // For weekly frequency, only send on Sundays (or forced)
      if (frequency === 'weekly' && dayOfWeek !== 0 && !force) {
        continue
      }
      
      // For monthly frequency, only send on the 1st day of the month (or forced)
      if (frequency === 'monthly' && now.getDate() !== 1 && !force) {
        continue
      }
      
      // Now generate appropriate notifications based on time of day and preferences
      const notificationsToSend = []
      
      // Morning (7-10): Prayer reminder, Bible reading
      if ((hour >= 7 && hour <= 10) || force) {
        if (preferences.prayer_reminders) {
          notificationsToSend.push(createNotification(userId, 'prayer_reminder'))
        }
        
        if (preferences.bible_reading) {
          notificationsToSend.push(createNotification(userId, 'bible_reading'))
        }
      }
      
      // Afternoon (12-16): Habit tracking reminder
      if ((hour >= 12 && hour <= 16) || force) {
        notificationsToSend.push(createNotification(userId, 'habit_reminder'))
      }
      
      // Evening (18-21): Devotional reminder, journaling
      if ((hour >= 18 && hour <= 21) || force) {
        if (preferences.journal_prompts) {
          notificationsToSend.push(createNotification(userId, 'devotional'))
        }
      }
      
      // Insert notifications into database
      if (notificationsToSend.length > 0) {
        const { data, error } = await supabase
          .from('notifications')
          .insert(notificationsToSend)
          .select()
        
        if (error) {
          console.error(`Error inserting notifications for user ${userId}:`, error)
        } else if (data) {
          // Send push notifications for each notification
          for (const notification of data) {
            await sendPushNotification(userId, notification)
            generatedNotifications.push(notification)
          }
        }
      }
    } catch (userError) {
      console.error(`Error processing notifications for user ${user.id}:`, userError)
    }
  }
  
  return generatedNotifications
}

// Helper function to create a notification object
function createNotification(userId: string, type: string, data?: any) {
  const template = typeof NOTIFICATION_TEMPLATES[type] === 'function'
    ? NOTIFICATION_TEMPLATES[type](data)
    : NOTIFICATION_TEMPLATES[type]
    
  return {
    user_id: userId,
    title: template.title,
    message: template.body,
    type,
    is_read: false,
    action_link: template.url,
    created_at: new Date().toISOString()
  }
}

// Helper to check if current hour is within quiet hours
function isWithinQuietHours(currentHour: number, startHour: number, endHour: number) {
  if (startHour < endHour) {
    // Simple case: 22:00 to 08:00
    return currentHour >= startHour && currentHour < endHour
  } else {
    // Wrapped case: 22:00 to 08:00 (crosses midnight)
    return currentHour >= startHour || currentHour < endHour
  }
}

// Function to send push notification to a user
async function sendPushNotification(userId: string, notification: any) {
  try {
    // Get user's push subscriptions
    const { data: subscriptions, error } = await createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )
      .from('push_subscriptions')
      .select('subscription_json')
      .eq('user_id', userId)
    
    if (error || !subscriptions || subscriptions.length === 0) {
      return false
    }
    
    // Prepare notification payload
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      icon: '/TrueNorth Compass Logo copy.png',
      badge: '/TrueNorth Compass Logo copy.png',
      tag: notification.type,
      url: notification.action_link,
      timestamp: new Date().getTime()
    })
    
    // Send push notification to each subscription
    const pushPromises = subscriptions.map(async (sub) => {
      try {
        const subscription = sub.subscription_json
        await webPush.sendNotification(subscription, payload)
        return true
      } catch (pushError) {
        console.error('Push error:', pushError)
        
        // If subscription is expired or invalid, we should delete it
        if (
          pushError.statusCode === 404 || // Subscription not found
          pushError.statusCode === 410    // Subscription gone/expired
        ) {
          try {
            // Delete invalid subscription
            await createClient(
              Deno.env.get('SUPABASE_URL') || '',
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
            )
              .from('push_subscriptions')
              .delete()
              .eq('user_id', userId)
              .eq('subscription_json->endpoint', subscription.endpoint)
          } catch (deleteError) {
            console.error('Failed to delete invalid subscription:', deleteError)
          }
        }
        
        return false
      }
    })
    
    const results = await Promise.all(pushPromises)
    return results.some(result => result === true)
  } catch (error) {
    console.error('Error sending push notification:', error)
    return false
  }
}
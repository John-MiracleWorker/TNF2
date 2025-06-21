// Supabase Edge Function for saving push notification subscriptions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1'

serve(async (req) => {
  try {
    // Handle preflight CORS
    if (req.method === 'OPTIONS') {
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
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ 
        error: 'Method not allowed' 
      }), { 
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parse request body
    const body = await req.json()
    const { subscription } = body
    
    if (!subscription || !subscription.endpoint) {
      return new Response(JSON.stringify({ 
        error: 'Invalid subscription data' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Set up Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )
    
    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]
    
    if (!token) {
      return new Response(JSON.stringify({ 
        error: 'Missing authentication' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Get user info from token
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !user) {
      return new Response(JSON.stringify({ 
        error: 'Invalid authentication' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // First check if this subscription already exists
    const { data: existingSubscription, error: existingError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint')
      .eq('user_id', user.id)
      .eq('endpoint', subscription.endpoint)
      .maybeSingle()
    
    if (existingError) {
      console.error('Error checking for existing subscription:', existingError)
    }
    
    let result
    
    if (existingSubscription) {
      // Update existing subscription
      const { data, error: updateError } = await supabaseAdmin
        .from('push_subscriptions')
        .update({
          subscription_json: subscription,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubscription.id)
        .select()
        .single()
        
      if (updateError) {
        throw new Error(`Failed to update subscription: ${updateError.message}`)
      }
      
      result = data
    } else {
      // Create new subscription
      const { data, error: insertError } = await supabaseAdmin
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          subscription_json: subscription
        })
        .select()
        .single()
        
      if (insertError) {
        throw new Error(`Failed to save subscription: ${insertError.message}`)
      }
      
      result = data
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      subscription: result 
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
    
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
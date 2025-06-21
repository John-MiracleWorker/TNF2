import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.1'
import Stripe from 'https://esm.sh/stripe@11.17.0'

// Initialize Stripe with your secret key
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

// Get the webhook signing secret from environment variables
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

serve(async (req) => {
  try {
    // Get the signature from the headers
    const signature = req.headers.get('stripe-signature')
    
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Get the raw request body
    const body = await req.text()
    
    // Verify the webhook signature
    let event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error(`Webhook signature verification failed:`, err)
      return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )
    
    // Handle specific webhook events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        
        if (session.mode === 'subscription') {
          // Process subscription checkout
          await handleSubscriptionCheckout(session, supabaseAdmin)
        } else if (session.mode === 'payment') {
          // Process one-time payment
          await handleOneTimePayment(session, supabaseAdmin)
        }
        
        break
      }
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        await handleSubscriptionChange(subscription, supabaseAdmin)
        break
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        await handleSubscriptionCancelled(subscription, supabaseAdmin)
        break
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        if (invoice.subscription) {
          // Update subscription record with latest payment
          await handleInvoicePaid(invoice, supabaseAdmin)
        }
        break
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        if (invoice.subscription) {
          // Update subscription record with payment failure
          await handleInvoicePaymentFailed(invoice, supabaseAdmin)
        }
        break
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('Error processing webhook:', error)
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// Helper functions for handling various webhook events

async function handleSubscriptionCheckout(session, supabaseAdmin) {
  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(session.subscription)
  
  // Get customer ID from session
  const customerId = session.customer
  
  // Get user ID from metadata or find by customer ID
  let userId = session.metadata?.user_id
  
  if (!userId) {
    const { data: customerData } = await supabaseAdmin
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .maybeSingle()
    
    userId = customerData?.user_id
  }
  
  if (!userId) {
    throw new Error(`No user found for customer: ${customerId}`)
  }
  
  // Get the first item's price ID
  const priceId = subscription.items.data[0].price.id
  
  // Update subscription in database
  const { error: subError } = await supabaseAdmin
    .from('stripe_subscriptions')
    .upsert({
      subscription_id: subscription.id,
      customer_id: customerId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end
    }, {
      onConflict: 'customer_id'
    })
  
  if (subError) {
    throw new Error(`Failed to update subscription: ${subError.message}`)
  }
  
  // Create notification for user
  await createUserNotification(
    userId, 
    'Subscription Active', 
    'Your TrueNorth Pro subscription is now active! Enjoy all the premium features.',
    'subscription',
    '/profile',
    supabaseAdmin
  )
}

async function handleOneTimePayment(session, supabaseAdmin) {
  // Process one-time payment checkout
  const customerId = session.customer
  
  // Get payment intent details
  const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent)
  
  // Get user ID from metadata or find by customer ID
  let userId = session.metadata?.user_id
  
  if (!userId) {
    const { data: customerData } = await supabaseAdmin
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .maybeSingle()
    
    userId = customerData?.user_id
  }
  
  if (!userId) {
    throw new Error(`No user found for customer: ${customerId}`)
  }
  
  // Record the order in the database
  const { error: orderError } = await supabaseAdmin
    .from('stripe_orders')
    .insert({
      checkout_session_id: session.id,
      payment_intent_id: session.payment_intent,
      customer_id: customerId,
      amount_subtotal: session.amount_subtotal,
      amount_total: session.amount_total,
      currency: session.currency,
      payment_status: paymentIntent.status,
      status: 'completed'
    })
  
  if (orderError) {
    throw new Error(`Failed to record order: ${orderError.message}`)
  }
  
  // Create notification for user
  await createUserNotification(
    userId, 
    'Payment Successful', 
    'Your payment was successful. Thank you for your purchase!',
    'payment',
    '/profile',
    supabaseAdmin
  )
}

async function handleSubscriptionChange(subscription, supabaseAdmin) {
  // Get customer ID from subscription
  const customerId = subscription.customer
  
  // Get the first item's price ID
  const priceId = subscription.items.data[0].price.id
  
  // Get payment method details
  let paymentMethodBrand = null
  let paymentMethodLast4 = null
  
  if (subscription.default_payment_method) {
    const paymentMethod = await stripe.paymentMethods.retrieve(subscription.default_payment_method)
    if (paymentMethod.card) {
      paymentMethodBrand = paymentMethod.card.brand
      paymentMethodLast4 = paymentMethod.card.last4
    }
  }
  
  // Update subscription in database
  const { error: subError } = await supabaseAdmin
    .from('stripe_subscriptions')
    .upsert({
      subscription_id: subscription.id,
      customer_id: customerId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      payment_method_brand: paymentMethodBrand,
      payment_method_last4: paymentMethodLast4
    }, {
      onConflict: 'customer_id'
    })
  
  if (subError) {
    throw new Error(`Failed to update subscription: ${subError.message}`)
  }
  
  // Get user ID from customer record
  const { data: customerData } = await supabaseAdmin
    .from('stripe_customers')
    .select('user_id')
    .eq('customer_id', customerId)
    .maybeSingle()
  
  if (customerData?.user_id) {
    // Create notification for user if subscription was updated
    if (event.type === 'customer.subscription.updated') {
      await createUserNotification(
        customerData.user_id,
        'Subscription Updated',
        'Your subscription details have been updated.',
        'subscription',
        '/profile',
        supabaseAdmin
      )
    }
  }
}

async function handleSubscriptionCancelled(subscription, supabaseAdmin) {
  // Get customer ID from subscription
  const customerId = subscription.customer
  
  // Update subscription in database
  const { error: subError } = await supabaseAdmin
    .from('stripe_subscriptions')
    .update({
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end
    })
    .eq('customer_id', customerId)
  
  if (subError) {
    throw new Error(`Failed to update subscription: ${subError.message}`)
  }
  
  // Get user ID from customer record
  const { data: customerData } = await supabaseAdmin
    .from('stripe_customers')
    .select('user_id')
    .eq('customer_id', customerId)
    .maybeSingle()
  
  if (customerData?.user_id) {
    // Create notification for user
    await createUserNotification(
      customerData.user_id,
      'Subscription Cancelled',
      'Your subscription has been cancelled. Access will continue until the end of your current billing period.',
      'subscription',
      '/profile',
      supabaseAdmin
    )
  }
}

async function handleInvoicePaid(invoice, supabaseAdmin) {
  // Update subscription payment details
  const customerId = invoice.customer
  const subscriptionId = invoice.subscription
  
  // Get payment method details
  let paymentMethodBrand = null
  let paymentMethodLast4 = null
  
  if (invoice.payment_intent) {
    const paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent)
    if (paymentIntent.payment_method) {
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method)
      if (paymentMethod.card) {
        paymentMethodBrand = paymentMethod.card.brand
        paymentMethodLast4 = paymentMethod.card.last4
      }
    }
  }
  
  // Update subscription in database
  const { error: subError } = await supabaseAdmin
    .from('stripe_subscriptions')
    .update({
      status: 'active',
      payment_method_brand: paymentMethodBrand,
      payment_method_last4: paymentMethodLast4
    })
    .eq('customer_id', customerId)
  
  if (subError) {
    throw new Error(`Failed to update subscription: ${subError.message}`)
  }
  
  // Get user ID from customer record
  const { data: customerData } = await supabaseAdmin
    .from('stripe_customers')
    .select('user_id')
    .eq('customer_id', customerId)
    .maybeSingle()
  
  if (customerData?.user_id) {
    // Create notification for recurring payments
    if (!invoice.billing_reason || invoice.billing_reason === 'subscription_cycle') {
      await createUserNotification(
        customerData.user_id,
        'Payment Successful',
        'Your subscription payment was successful. Thank you!',
        'payment',
        '/profile',
        supabaseAdmin
      )
    }
  }
}

async function handleInvoicePaymentFailed(invoice, supabaseAdmin) {
  // Update subscription status
  const customerId = invoice.customer
  
  // Update subscription in database
  const { error: subError } = await supabaseAdmin
    .from('stripe_subscriptions')
    .update({
      status: 'past_due'
    })
    .eq('customer_id', customerId)
  
  if (subError) {
    throw new Error(`Failed to update subscription: ${subError.message}`)
  }
  
  // Get user ID from customer record
  const { data: customerData } = await supabaseAdmin
    .from('stripe_customers')
    .select('user_id')
    .eq('customer_id', customerId)
    .maybeSingle()
  
  if (customerData?.user_id) {
    // Create notification for user
    await createUserNotification(
      customerData.user_id,
      'Payment Failed',
      'We were unable to process your subscription payment. Please update your payment method.',
      'alert',
      '/profile',
      supabaseAdmin
    )
  }
}

// Helper function to create notifications
async function createUserNotification(userId, title, message, type, actionLink, supabaseAdmin) {
  const { error } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
      action_link: actionLink
    })
  
  if (error) {
    console.error(`Failed to create notification: ${error.message}`)
  }
}
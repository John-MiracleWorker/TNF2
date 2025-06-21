/*
  # Fix Stripe Integration Schema

  1. New Types
    - Add conditional creation of enum types for order status and subscription status
  
  2. Tables
    - stripe_customers (with user_id foreign key)
    - stripe_subscriptions (with customer_id reference)
    - stripe_orders (for payment tracking)
  
  3. Views
    - stripe_user_subscriptions (customer subscription data)
    - stripe_user_orders (customer order history)
  
  4. Security
    - Row Level Security for all tables
*/

-- Create new stripe_order_status enum type if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stripe_order_status') THEN
    CREATE TYPE stripe_order_status AS ENUM ('pending', 'completed', 'canceled');
  END IF;
END $$;

-- Create new stripe_subscription_status enum type if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stripe_subscription_status') THEN
    CREATE TYPE stripe_subscription_status AS ENUM (
      'not_started',
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused'
    );
  END IF;
END $$;

-- Create stripe_customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Create stripe_subscriptions table
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  customer_id TEXT NOT NULL UNIQUE REFERENCES stripe_customers(customer_id),
  subscription_id TEXT,
  price_id TEXT,
  current_period_start BIGINT,
  current_period_end BIGINT,
  cancel_at_period_end BOOLEAN DEFAULT false,
  payment_method_brand TEXT,
  payment_method_last4 TEXT,
  status stripe_subscription_status NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Create stripe_orders table
CREATE TABLE IF NOT EXISTS stripe_orders (
  id BIGSERIAL PRIMARY KEY,
  checkout_session_id TEXT NOT NULL,
  payment_intent_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  amount_subtotal BIGINT NOT NULL,
  amount_total BIGINT NOT NULL,
  currency TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  status stripe_order_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Create or replace stripe_user_subscriptions view
CREATE OR REPLACE VIEW stripe_user_subscriptions AS
  SELECT 
    sc.customer_id,
    ss.subscription_id,
    ss.status AS subscription_status,
    ss.price_id,
    ss.current_period_start,
    ss.current_period_end,
    ss.cancel_at_period_end,
    ss.payment_method_brand,
    ss.payment_method_last4
  FROM stripe_customers sc
  JOIN stripe_subscriptions ss ON sc.customer_id = ss.customer_id
  WHERE sc.deleted_at IS NULL
    AND ss.deleted_at IS NULL;

-- Create or replace stripe_user_orders view
CREATE OR REPLACE VIEW stripe_user_orders AS
  SELECT 
    sc.customer_id,
    so.id AS order_id,
    so.checkout_session_id,
    so.payment_intent_id,
    so.amount_subtotal,
    so.amount_total,
    so.currency,
    so.payment_status,
    so.status AS order_status,
    so.created_at AS order_date
  FROM stripe_customers sc
  JOIN stripe_orders so ON sc.customer_id = so.customer_id
  WHERE sc.deleted_at IS NULL
    AND so.deleted_at IS NULL;

-- Add RLS policies for stripe_subscriptions if table exists and doesn't already have RLS enabled
DO $$ 
BEGIN
  -- Check if table exists and RLS is not enabled
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stripe_subscriptions' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stripe_subscriptions' AND schemaname = 'public' AND rowsecurity) THEN
      ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
    END IF;
  END IF;
END $$;

-- Create policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_subscriptions' 
    AND schemaname = 'public' 
    AND policyname = 'Users can view their own subscription data'
  ) THEN
    CREATE POLICY "Users can view their own subscription data" ON stripe_subscriptions
      FOR SELECT
      USING (
        customer_id IN (
          SELECT customer_id 
          FROM stripe_customers 
          WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
      );
  END IF;
END $$;

-- Add RLS policies for stripe_orders if table exists and doesn't already have RLS enabled
DO $$ 
BEGIN
  -- Check if table exists and RLS is not enabled
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stripe_orders' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stripe_orders' AND schemaname = 'public' AND rowsecurity) THEN
      ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;
    END IF;
  END IF;
END $$;

-- Create policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_orders' 
    AND schemaname = 'public' 
    AND policyname = 'Users can view their own order data'
  ) THEN
    CREATE POLICY "Users can view their own order data" ON stripe_orders
      FOR SELECT
      USING (
        customer_id IN (
          SELECT customer_id 
          FROM stripe_customers 
          WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
      );
  END IF;
END $$;

-- Add RLS policies for stripe_customers if table exists and doesn't already have RLS enabled
DO $$ 
BEGIN
  -- Check if table exists and RLS is not enabled
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stripe_customers' AND schemaname = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stripe_customers' AND schemaname = 'public' AND rowsecurity) THEN
      ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
    END IF;
  END IF;
END $$;

-- Create policy if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stripe_customers' 
    AND schemaname = 'public' 
    AND policyname = 'Users can view their own customer data'
  ) THEN
    CREATE POLICY "Users can view their own customer data" ON stripe_customers
      FOR SELECT
      USING (
        user_id = auth.uid() AND deleted_at IS NULL
      );
  END IF;
END $$;
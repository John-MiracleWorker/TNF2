/*
  # Database Admin Functions

  1. New Functions
    - `get_tables` - Returns a list of all tables in the public schema
    - `get_table_columns` - Returns a list of all columns for a given table
    - `execute_sql_query` - Safely executes a SQL query (read-only)
    - `get_database_stats` - Returns statistics about the database

  2. Security
    - All functions are restricted to users with the `is_admin` flag
*/

-- Function to get all tables in public schema
CREATE OR REPLACE FUNCTION get_tables()
RETURNS TABLE (table_name text) SECURITY DEFINER AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Permission denied: admin access required';
  END IF;

  RETURN QUERY
  SELECT t.tablename::text
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;

-- Function to get columns for a specific table
CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
RETURNS TABLE (column_name text) SECURITY DEFINER AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Permission denied: admin access required';
  END IF;

  -- Validate table name to prevent SQL injection
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = table_name
  ) THEN
    RAISE EXCEPTION 'Table % does not exist', table_name;
  END IF;

  RETURN QUERY
  SELECT c.column_name::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' 
    AND c.table_name = table_name
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql;

-- Function to safely execute a SQL query (read-only)
CREATE OR REPLACE FUNCTION execute_sql_query(query_text text)
RETURNS jsonb SECURITY DEFINER AS $$
DECLARE
  result jsonb;
  query_type text;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Permission denied: admin access required';
  END IF;

  -- Check if this is a read-only query
  query_type := lower(substring(trim(query_text) from 1 for 6));
  
  IF query_type NOT IN ('select', 'show', 'explai') THEN
    RAISE EXCEPTION 'Only SELECT, SHOW, and EXPLAIN queries are allowed';
  END IF;

  -- Execute the query
  EXECUTE 'SELECT array_to_json(array_agg(row_to_json(t)))::jsonb FROM (' || query_text || ') t' INTO result;
  
  RETURN result;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Query error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to get database statistics
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS jsonb SECURITY DEFINER AS $$
DECLARE
  stats jsonb;
  table_count integer;
  view_count integer;
  function_count integer;
  table_sizes jsonb;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Permission denied: admin access required';
  END IF;

  -- Get counts
  SELECT COUNT(*) INTO table_count FROM pg_tables WHERE schemaname = 'public';
  SELECT COUNT(*) INTO view_count FROM pg_views WHERE schemaname = 'public';
  SELECT COUNT(*) INTO function_count FROM pg_proc 
    JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
    WHERE pg_namespace.nspname = 'public';

  -- Get table sizes (top 10 by row count)
  EXECUTE '
    SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb)
    FROM (
      SELECT 
        c.relname as table_name,
        c.reltuples::bigint as row_count,
        pg_size_pretty(pg_total_relation_size(c.oid)) as size
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = ''public''
        AND c.relkind = ''r''
      ORDER BY c.reltuples DESC
      LIMIT 10
    ) t
  ' INTO table_sizes;

  -- Build the stats object
  stats := jsonb_build_object(
    'table_count', table_count,
    'view_count', view_count,
    'function_count', function_count,
    'table_sizes', table_sizes
  );

  RETURN stats;
EXCEPTION
  WHEN others THEN
    -- If advanced stats fail, return basic counts
    stats := jsonb_build_object(
      'table_count', (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'),
      'tables', (SELECT jsonb_agg(tablename) FROM pg_tables WHERE schemaname = 'public')
    );
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;
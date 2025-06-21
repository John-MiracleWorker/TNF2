/**
 * Error handler utility for gracefully handling database errors
 */

// Handle database errors in a graceful way
export function handleDatabaseError(error: any, fallbackValue: any = null, errorMessage?: string): any {
  // Improved error handling for database errors
  if (error) {
    // Specific error code handling
    if (error.code === '42P01') {
      // PostgreSQL code for "relation does not exist"
      console.warn(`Database table missing: ${errorMessage || error.message}`);
      return fallbackValue;
    }
    
    // Handle PGRST116 error (no rows returned) for single queries
    if (error.code === 'PGRST116') {
      console.log(`No data found: ${errorMessage || 'No rows returned'}`);
      return fallbackValue;
    }
    
    // More general database connection errors
    if (
      error.code === '28P01' || // Wrong password
      error.code === '3D000' || // Database does not exist
      error.message?.includes('connection') ||
      error.message?.includes('network')
    ) {
      console.error(`Database connection error: ${errorMessage || error.message}`);
      return fallbackValue;
    }
    
    // Permissions errors
    if (
      error.code === '42501' || // Insufficient privilege
      error.message?.includes('permission')
    ) {
      console.error(`Database permission error: ${errorMessage || error.message}`);
      return fallbackValue;
    }
    
    // General database errors with better logging
    console.error(errorMessage || 'Database error:', error);
    
    // For migration issues or schema problems, provide more info
    if (error.message?.includes('does not exist') || 
        error.message?.includes('function') || 
        error.message?.includes('column')) {
      console.error('This appears to be a database schema issue. Please run all migrations.');
    }
    
    return fallbackValue;
  }
  
  // If no error, just return the fallback value (this shouldn't normally happen)
  return fallbackValue;
}

// Wrap database query functions to handle missing table errors gracefully
export function withErrorHandling<T>(dbFunction: () => Promise<T>, fallbackValue: T): Promise<T> {
  return dbFunction().catch(error => {
    // If it's a "relation does not exist" error or similar schema error, return fallback
    if (error && (
        error.code === '42P01' || 
        error.code === 'PGRST116' ||
        (error.message && (
          error.message.includes('relation') && error.message.includes('does not exist') ||
          error.message.includes('function') && error.message.includes('does not exist')
        ))
    )) {
      console.warn(`Database access error: ${error.message || JSON.stringify(error)}`);
      console.warn('This is likely a database schema issue. Please run all migrations.');
      return fallbackValue;
    }
    
    // Re-throw other errors
    throw error;
  });
}
// Netlify scheduled function to check YouTube livestreams and process completed ones
// This function is triggered automatically by Netlify's scheduler (every 15 minutes)

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    console.log('Livestream monitor function triggered');
    
    // Get Supabase URL and service role key from environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    
    // Call the Supabase edge function to check livestream status
    const response = await fetch(`${supabaseUrl}/functions/v1/livestream-monitor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        // You can specify channels to check, or leave empty to check all monitored channels
        channelIds: [],
        force: false // Set to true for testing to force process even old streams
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to check livestreams: ${response.status} - ${text}`);
    }

    const data = await response.json();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Livestream check completed',
        processed: data.processed || 0,
        results: data.results || []
      })
    };
  } catch (error) {
    console.error('Error in livestream monitor function:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error checking livestreams',
        error: error.message
      })
    };
  }
};
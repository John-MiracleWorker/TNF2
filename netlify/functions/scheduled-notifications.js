// Netlify scheduled function to trigger Supabase Edge Function for notifications
// This is triggered automatically by Netlify's scheduler (see netlify.toml)

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    console.log('Scheduled notifications function triggered');
    
    // Get Supabase URL and service role key from environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    
    // Call the Supabase edge function to generate notifications
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({
        type: 'batch',
        force: false
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to trigger notifications: ${response.status} - ${text}`);
    }

    const data = await response.json();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Notifications triggered successfully',
        notifications_count: data.notifications_count || 0
      })
    };
  } catch (error) {
    console.error('Error in scheduled notifications function:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error triggering notifications',
        error: error.message
      })
    };
  }
};
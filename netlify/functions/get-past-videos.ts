import fetch from 'node-fetch'; // Use node-fetch for making HTTP requests

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY; // Use process.env for Node.js environment variables

export const handler = async (event: any) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: 'OK',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  // Check if the YouTube API key is configured
  if (!YOUTUBE_API_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'YouTube API key not configured' }),
    };
  }

  let channelId;
  try {
    const body = JSON.parse(event.body);
    channelId = body.channelId;
  } catch (parseError) {
    console.error('Error parsing request body:', parseError);
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  if (!channelId) {
    return {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
      body: JSON.stringify({ error: 'channelId is required' }),
    };
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=10&type=video&eventType=completed`,
      {
        headers: { 'Accept': 'application/json' },
      }
    ) as any; // Cast to any to avoid TypeScript errors with node-fetch and Response

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API Error:', response.status, errorText);
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to fetch from YouTube API', details: errorText }),
      };
    }

    const data = await response.json();

    const videos = data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      publishedAt: new Date(item.snippet.publishedAt),
      thumbnail: item.snippet.thumbnails.high.url,
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Consider restricting this in production
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ videos }),
    };
  } catch (error) {
    console.error('Error fetching past videos:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message }),
    };
  }
};
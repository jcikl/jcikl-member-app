/**
 * Netlify Serverless Function
 * Delete Image from Cloudinary
 * 
 * Endpoint: /.netlify/functions/cloudinary-delete
 */

const crypto = require('crypto');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const { publicId } = JSON.parse(event.body);

    if (!publicId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'publicId is required' }),
      };
    }

    console.log('🗑️ [Netlify Function] Deleting image:', {
      publicId,
      timestamp: new Date().toISOString(),
    });

    // Get Cloudinary credentials from environment variables
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    // Validate environment variables
    if (!cloudName || !apiKey || !apiSecret) {
      console.error('❌ Missing Cloudinary environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Server configuration error',
          message: 'Missing Cloudinary credentials',
        }),
      };
    }

    // Generate timestamp
    const timestamp = Math.round(Date.now() / 1000);

    // Generate signature for deletion
    // Format: public_id={publicId}&timestamp={timestamp}{api_secret}
    const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`;
    
    const signature = crypto
      .createHash('sha256')
      .update(`${paramsToSign}${apiSecret}`)
      .digest('hex');

    console.log('🔐 [Netlify Function] Signature generated for deletion');

    // Call Cloudinary Destroy API
    const formData = new URLSearchParams();
    formData.append('public_id', publicId);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    const result = await response.json();

    console.log('📡 [Netlify Function] Cloudinary response:', result);

    if (result.result === 'ok') {
      console.log('✅ [Netlify Function] Image deleted successfully');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Image deleted successfully',
          result: result,
        }),
      };
    } else if (result.result === 'not found') {
      console.log('⚠️ [Netlify Function] Image not found');
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Image not found',
          result: result,
        }),
      };
    } else {
      console.error('❌ [Netlify Function] Deletion failed:', result);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Failed to delete image',
          result: result,
        }),
      };
    }
  } catch (error) {
    console.error('❌ [Netlify Function] Error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};


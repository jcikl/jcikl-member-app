/**
 * Netlify Serverless Function
 * Generate Cloudinary Upload Signature
 * 
 * Endpoint: /.netlify/functions/cloudinary-signature
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
    const { publicId, folder } = JSON.parse(event.body);

    console.log('📝 [Netlify Function] Generating signature:', {
      publicId,
      folder,
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

    // Build upload parameters
    const uploadParams = {
      timestamp: timestamp,
    };

    // Add folder or public_id for overwrite
    if (publicId) {
      // Overwrite mode
      uploadParams.public_id = publicId;
      uploadParams.overwrite = true;
      uploadParams.invalidate = true;
      console.log('♻️ [Netlify Function] Overwrite mode:', publicId);
    } else if (folder) {
      // New upload mode
      uploadParams.folder = folder;
      console.log('📁 [Netlify Function] New upload to folder:', folder);
    }

    // Generate signature
    // Format: key1=value1&key2=value2&...&keyN=valueN{api_secret}
    const paramsToSign = Object.keys(uploadParams)
      .sort()
      .map(key => `${key}=${uploadParams[key]}`)
      .join('&');

    const signature = crypto
      .createHash('sha256')
      .update(`${paramsToSign}${apiSecret}`)
      .digest('hex');

    console.log('✅ [Netlify Function] Signature generated successfully');

    // Return signature data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        signature: signature,
        timestamp: timestamp,
        apiKey: apiKey,
        cloudName: cloudName,
        ...uploadParams,
      }),
    };
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


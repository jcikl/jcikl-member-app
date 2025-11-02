/**
 * Cloud Functions for JCI KL Membership App
 * Firebase Cloud Functions
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Generate Cloudinary signature for secure uploads
 * 生成 Cloudinary 签名用于安全上传
 * 
 * Request body:
 * {
 *   publicId?: string,  // If provided, will overwrite existing image
 *   folder?: string,    // Target folder
 * }
 * 
 * Response:
 * {
 *   signature: string,
 *   timestamp: number,
 *   apiKey: string,
 *   publicId?: string,
 *   folder?: string,
 * }
 */
export const generateCloudinarySignature = functions
  .region('us-central1')  // Default region (matches Firebase project default)
  .https.onCall(async (data, context) => {
    try {
      // ✅ Check authentication
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated to upload images'
        );
      }

      console.log('🔐 [generateCloudinarySignature] Request from user:', {
        uid: context.auth.uid,
        email: context.auth.token.email,
        publicId: data.publicId,
        folder: data.folder,
      });

      // Get Cloudinary config from environment
      const cloudName = functions.config().cloudinary?.cloud_name;
      const apiKey = functions.config().cloudinary?.api_key;
      const apiSecret = functions.config().cloudinary?.api_secret;

      if (!cloudName || !apiKey || !apiSecret) {
        console.error('❌ [generateCloudinarySignature] Missing Cloudinary config');
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Cloudinary configuration is missing'
        );
      }

      // Generate timestamp
      const timestamp = Math.round(Date.now() / 1000);

      // Build upload parameters
      const uploadParams: Record<string, any> = {
        timestamp,
      };

      // Add folder or public_id
      if (data.publicId) {
        // Overwrite mode
        uploadParams.public_id = data.publicId;
        uploadParams.overwrite = true;
        uploadParams.invalidate = true;
        console.log('♻️ [generateCloudinarySignature] Overwrite mode:', data.publicId);
      } else if (data.folder) {
        // New upload mode
        uploadParams.folder = data.folder;
        console.log('📁 [generateCloudinarySignature] New upload to folder:', data.folder);
      }

      // Generate signature
      const paramsToSign = Object.keys(uploadParams)
        .sort()
        .map(key => `${key}=${uploadParams[key]}`)
        .join('&');

      const signature = crypto
        .createHash('sha256')
        .update(`${paramsToSign}${apiSecret}`)
        .digest('hex');

      console.log('✅ [generateCloudinarySignature] Signature generated successfully');

      return {
        signature,
        timestamp,
        apiKey,
        cloudName,
        ...uploadParams,
      };
    } catch (error: any) {
      console.error('❌ [generateCloudinarySignature] Error:', error);
      throw new functions.https.HttpsError(
        'internal',
        error.message || 'Failed to generate signature'
      );
    }
  });

/**
 * Delete image from Cloudinary
 * 从 Cloudinary 删除图片
 * 
 * Request body:
 * {
 *   publicId: string,
 * }
 */
export const deleteCloudinaryImage = functions
  .region('us-central1')  // Default region (matches Firebase project default)
  .https.onCall(async (data, context) => {
    try {
      // ✅ Check authentication
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated'
        );
      }

      console.log('🗑️ [deleteCloudinaryImage] Request from user:', {
        uid: context.auth.uid,
        publicId: data.publicId,
      });

      // Get Cloudinary config
      const cloudName = functions.config().cloudinary?.cloud_name;
      const apiKey = functions.config().cloudinary?.api_key;
      const apiSecret = functions.config().cloudinary?.api_secret;

      if (!cloudName || !apiKey || !apiSecret) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Cloudinary configuration is missing'
        );
      }

      const timestamp = Math.round(Date.now() / 1000);

      // Generate deletion signature
      const paramsToSign = `public_id=${data.publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto
        .createHash('sha256')
        .update(paramsToSign)
        .digest('hex');

      // Call Cloudinary Destroy API
      const formData = new URLSearchParams();
      formData.append('public_id', data.publicId);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', apiKey);
      formData.append('signature', signature);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await response.json();

      console.log('✅ [deleteCloudinaryImage] Image deleted:', result);

      return { success: true, result };
    } catch (error: any) {
      console.error('❌ [deleteCloudinaryImage] Error:', error);
      throw new functions.https.HttpsError(
        'internal',
        error.message || 'Failed to delete image'
      );
    }
  });


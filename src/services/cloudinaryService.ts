/**
 * Cloudinary Service
 * Cloudinary 图片上传服务（使用 Signed Upload + Firebase Cloud Functions）
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  apiKey: string;
  folder: string;
}

interface SignatureResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  publicId?: string;
  folder?: string;
  overwrite?: boolean;
  invalidate?: boolean;
}

interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}

class CloudinaryService {
  private config: CloudinaryConfig;

  constructor() {
    this.config = {
      cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
      uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
      apiKey: import.meta.env.VITE_CLOUDINARY_API_KEY,
      folder: import.meta.env.VITE_CLOUDINARY_FOLDER,
    };
  }

  /**
   * Extract publicId from Cloudinary URL
   * 从 Cloudinary URL 中提取 publicId
   */
  extractPublicId(url: string): string | null {
    try {
      if (!url.includes('cloudinary.com')) return null;
      
      // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{filename}.{format}
      // Or with transformations: .../upload/{transformations}/v{version}/{folder}/{filename}.{format}
      const parts = url.split('/upload/');
      if (parts.length !== 2) return null;
      
      const afterUpload = parts[1];
      
      // Remove transformations if present (they don't start with 'v')
      const segments = afterUpload.split('/');
      const versionIndex = segments.findIndex(s => s.startsWith('v') && /^v\d+$/.test(s));
      
      // Get everything after version (or from start if no version)
      const pathAfterVersion = versionIndex >= 0 
        ? segments.slice(versionIndex + 1) 
        : segments;
      
      // Remove file extension from last segment
      const lastSegment = pathAfterVersion[pathAfterVersion.length - 1];
      const filenameWithoutExt = lastSegment.split('.')[0];
      
      // Reconstruct publicId (folder + filename without extension)
      pathAfterVersion[pathAfterVersion.length - 1] = filenameWithoutExt;
      const publicId = pathAfterVersion.join('/');
      
      console.log(`🔍 [Cloudinary] Extracted publicId:`, {
        originalUrl: url,
        publicId,
        segments: pathAfterVersion,
      });
      
      return publicId;
    } catch (error) {
      console.error(`❌ [Cloudinary] Failed to extract publicId:`, error);
      return null;
    }
  }

  /**
   * Get signature from Firebase Cloud Function
   * 从 Firebase Cloud Function 获取签名
   */
  private async getSignature(publicId?: string, folder?: string): Promise<SignatureResponse> {
    try {
      console.log(`🔐 [Cloudinary] Requesting signature from Cloud Function:`, {
        publicId,
        folder,
      });

      const functions = getFunctions();
      const generateSignature = httpsCallable<
        { publicId?: string; folder?: string },
        SignatureResponse
      >(functions, 'generateCloudinarySignature');

      const result = await generateSignature({ publicId, folder });

      console.log(`✅ [Cloudinary] Signature received:`, {
        timestamp: result.data.timestamp,
        hasSignature: !!result.data.signature,
        publicId: result.data.publicId,
        folder: result.data.folder,
      });

      return result.data;
    } catch (error: any) {
      console.error(`❌ [Cloudinary] Failed to get signature:`, error);
      throw new Error(`Signature generation failed: ${error.message}`);
    }
  }

  /**
   * Upload image to Cloudinary using Signed Upload
   * 使用签名上传到 Cloudinary（如果提供 oldUrl，将覆盖原图片以节省存储空间）
   */
  async uploadImage(file: File, folder?: string, oldUrl?: string): Promise<UploadResult> {
    try {
      // 尝试从旧 URL 提取 publicId
      const oldPublicId = oldUrl ? this.extractPublicId(oldUrl) : null;
      
      console.log(`☁️ [Cloudinary] Starting signed upload:`, {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(2)} KB`,
        fileType: file.type,
        targetFolder: folder || this.config.folder,
        willOverwrite: !!oldPublicId,
        oldPublicId,
      });

      // 🔐 Step 1: Get signature from Cloud Function
      const signatureData = await this.getSignature(
        oldPublicId || undefined,
        oldPublicId ? undefined : (folder || this.config.folder)
      );

      // 🆕 Step 2: Build FormData with signature
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', signatureData.apiKey);
      formData.append('timestamp', signatureData.timestamp.toString());
      formData.append('signature', signatureData.signature);
      
      // Add upload parameters
      if (signatureData.publicId) {
        formData.append('public_id', signatureData.publicId);
        formData.append('overwrite', 'true');
        formData.append('invalidate', 'true');
        console.log(`♻️ [Cloudinary] Will overwrite existing image:`, signatureData.publicId);
      } else if (signatureData.folder) {
        formData.append('folder', signatureData.folder);
        console.log(`📁 [Cloudinary] Will upload to folder:`, signatureData.folder);
      }

      console.log(`📤 [Cloudinary] Sending signed request to:`, 
        `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`);

      // 🚀 Step 3: Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      console.log(`📡 [Cloudinary] Response status:`, response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [Cloudinary] Upload failed:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error('Upload failed');
      }

      const data = await response.json();

      console.log(`✅ [Cloudinary] Signed upload successful:`, {
        url: data.secure_url,
        publicId: data.public_id,
        format: data.format,
        width: data.width,
        height: data.height,
        bytes: data.bytes,
        wasOverwritten: !!oldPublicId,
      });

      return {
        success: true,
        url: data.secure_url,
        publicId: data.public_id,
      };
    } catch (error: any) {
      console.error('❌ [Cloudinary] Upload error:', error);
      return {
        success: false,
        error: error.message || 'Upload failed',
      };
    }
  }

  /**
   * Generate optimized image URL
   */
  getOptimizedUrl(
    url: string,
    options: {
      width?: number;
      height?: number;
      quality?: 'auto' | number;
      format?: 'auto' | 'webp' | 'jpg' | 'png';
    } = {}
  ): string {
    const { width, height, quality = 'auto', format = 'auto' } = options;

    const transformations: string[] = [];

    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    if (quality) transformations.push(`q_${quality}`);
    if (format) transformations.push(`f_${format}`);

    if (transformations.length === 0) return url;

    // Insert transformations into Cloudinary URL
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/${transformations.join(',')}/${parts[1]}`;
    }

    return url;
  }

  /**
   * Delete image from Cloudinary
   * Note: This should be implemented server-side with Firebase Cloud Functions
   */
  async deleteImage(publicId: string): Promise<boolean> {
    try {
      // Deletion requires API secret, must be done server-side
      console.warn('Delete image should be implemented server-side. Public ID:', publicId);
      // TODO: Implement via Firebase Cloud Function
      return true;
    } catch (error) {
      console.error('Delete image error:', error);
      return false;
    }
  }

  /**
   * Get Cloudinary config
   */
  getConfig(): CloudinaryConfig {
    return { ...this.config };
  }
}

export const cloudinaryService = new CloudinaryService();




/**
 * Cloudinary Service
 * Cloudinary 图片上传服务（使用 Signed Upload + Netlify Functions）
 */

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
  wasOverwritten?: boolean; // True only if signed upload successfully overwrote an existing image
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
      
      // ⚠️ CRITICAL: Decode each segment (handles %20, %2F, etc.)
      const decodedSegments = pathAfterVersion.map(segment => decodeURIComponent(segment));
      const publicId = decodedSegments.join('/');
      
      console.log(`🔍 [Cloudinary] Extracted publicId:`, {
        originalUrl: url,
        publicId,
        encodedSegments: pathAfterVersion,
        decodedSegments,
      });
      
      return publicId;
    } catch (error) {
      console.error(`❌ [Cloudinary] Failed to extract publicId:`, error);
      return null;
    }
  }

  /**
   * Get signature from Netlify Serverless Function
   * 从 Netlify Serverless Function 获取签名
   */
  private async getSignature(publicId?: string, folder?: string): Promise<SignatureResponse | null> {
    try {
      console.log(`🔐 [Cloudinary] Requesting signature from Netlify Function:`, {
        publicId,
        folder,
      });

      // Call Netlify Function
      // In production: /.netlify/functions/cloudinary-signature
      // In development: http://localhost:8888/.netlify/functions/cloudinary-signature
      const netlifyFunctionUrl = import.meta.env.DEV
        ? 'http://localhost:8888/.netlify/functions/cloudinary-signature'
        : '/.netlify/functions/cloudinary-signature';

      const response = await fetch(netlifyFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicId, folder }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ [Cloudinary] Netlify Function error:`, errorData);
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result: SignatureResponse = await response.json();

      console.log(`✅ [Cloudinary] Signature received from Netlify:`, {
        timestamp: result.timestamp,
        hasSignature: !!result.signature,
        publicId: result.publicId,
        folder: result.folder,
      });

      return result;
    } catch (error: any) {
      console.error(`❌ [Cloudinary] Failed to get signature:`, error);
      console.warn(`⚠️ [Cloudinary] Falling back to unsigned upload (overwrite disabled)`);
      return null;  // Return null to trigger fallback
    }
  }

  /**
   * Upload image to Cloudinary using Signed Upload (with fallback to Unsigned)
   * 使用签名上传到 Cloudinary（如果提供 oldUrl，将覆盖原图片以节省存储空间）
   * 如果签名获取失败，回退到 unsigned upload（不支持覆盖）
   */
  async uploadImage(file: File, folder?: string, oldUrl?: string): Promise<UploadResult> {
    try {
      // 尝试从旧 URL 提取 publicId
      const oldPublicId = oldUrl ? this.extractPublicId(oldUrl) : null;
      
      console.log(`☁️ [Cloudinary] Starting upload:`, {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(2)} KB`,
        fileType: file.type,
        targetFolder: folder || this.config.folder,
        willAttemptOverwrite: !!oldPublicId,
        oldPublicId,
      });

      // 🔐 Step 1: Try to get signature from Cloud Function
      const signatureData = await this.getSignature(
        oldPublicId || undefined,
        oldPublicId ? undefined : (folder || this.config.folder)
      );

      const formData = new FormData();
      formData.append('file', file);

      // 🆕 Step 2: Build FormData (Signed or Unsigned)
      if (signatureData) {
        // ✅ Signed Upload (with overwrite support)
        console.log(`🔐 [Cloudinary] Using signed upload`);
        formData.append('api_key', signatureData.apiKey);
        formData.append('timestamp', signatureData.timestamp.toString());
        formData.append('signature', signatureData.signature);
        
        if (signatureData.publicId) {
          formData.append('public_id', signatureData.publicId);
          formData.append('overwrite', 'true');
          formData.append('invalidate', 'true');
          console.log(`♻️ [Cloudinary] Will overwrite existing image:`, signatureData.publicId);
        } else if (signatureData.folder) {
          formData.append('folder', signatureData.folder);
          console.log(`📁 [Cloudinary] Will upload to folder:`, signatureData.folder);
        }
      } else {
        // ⚠️ Fallback to Unsigned Upload (no overwrite)
        console.warn(`⚠️ [Cloudinary] Using unsigned upload (fallback - overwrite disabled)`);
        formData.append('upload_preset', this.config.uploadPreset);
        formData.append('folder', folder || this.config.folder);
      }

      const cloudName = signatureData?.cloudName || this.config.cloudName;
      console.log(`📤 [Cloudinary] Sending request to:`, 
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);

      // 🚀 Step 3: Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
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

      console.log(`✅ [Cloudinary] Upload successful:`, {
        url: data.secure_url,
        publicId: data.public_id,
        format: data.format,
        width: data.width,
        height: data.height,
        bytes: data.bytes,
        wasOverwritten: !!oldPublicId && !!signatureData,
        uploadMode: signatureData ? 'signed' : 'unsigned (fallback)',
      });

      return {
        success: true,
        url: data.secure_url,
        publicId: data.public_id,
        wasOverwritten: !!oldPublicId && !!signatureData, // Only true if signed upload with old publicId
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
   * Delete image from Cloudinary via Netlify Function
   * 通过 Netlify Function 从 Cloudinary 删除图片
   */
  async deleteImage(publicId: string): Promise<boolean> {
    try {
      console.log('🗑️ [Cloudinary] Requesting image deletion:', { publicId });

      // 🚧 In development mode without Netlify Dev, skip actual deletion
      if (import.meta.env.DEV) {
        console.warn('⚠️ [Cloudinary] Development mode: Skipping actual Cloudinary deletion');
        console.warn('💡 [Cloudinary] To enable deletion in dev, run: netlify dev');
        console.warn('🔧 [Cloudinary] Image will only be removed from UI, not from Cloudinary');
        return true; // Return success to update UI
      }

      // Call Netlify Function (production only)
      const netlifyFunctionUrl = '/.netlify/functions/cloudinary-delete';

      const response = await fetch(netlifyFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicId }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ [Cloudinary] Image deleted successfully from Cloudinary:', publicId);
        return true;
      } else if (response.status === 404) {
        console.warn('⚠️ [Cloudinary] Image not found in Cloudinary:', publicId);
        return true; // Consider not found as success (already deleted)
      } else {
        console.error('❌ [Cloudinary] Failed to delete image:', result);
        return false;
      }
    } catch (error: any) {
      console.error('❌ [Cloudinary] Delete image error:', error);
      
      // In development, treat errors as success (UI-only deletion)
      if (import.meta.env.DEV) {
        console.warn('⚠️ [Cloudinary] Dev mode: Treating as success (UI-only deletion)');
        return true;
      }
      
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




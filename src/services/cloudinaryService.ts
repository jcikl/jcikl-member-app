/**
 * Cloudinary Service
 * Cloudinary 图片上传服务
 */

interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  apiKey: string;
  folder: string;
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
      
      // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
      const parts = url.split('/upload/');
      if (parts.length !== 2) return null;
      
      // Remove version and transformations
      const pathParts = parts[1].split('/');
      const lastSegments = pathParts.slice(-2); // Get folder and filename
      
      // Remove file extension
      const filename = lastSegments[1].split('.')[0];
      const publicId = `${lastSegments[0]}/${filename}`;
      
      console.log(`🔍 [Cloudinary] Extracted publicId:`, {
        originalUrl: url,
        publicId,
      });
      
      return publicId;
    } catch (error) {
      console.error(`❌ [Cloudinary] Failed to extract publicId:`, error);
      return null;
    }
  }

  /**
   * Upload image to Cloudinary
   * 如果提供 oldUrl，将覆盖原图片以节省存储空间
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
        cloudName: this.config.cloudName,
        willOverwrite: !!oldPublicId,
        oldPublicId,
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', this.config.uploadPreset);
      
      // 🆕 如果有旧的 publicId，使用它来覆盖（节省存储空间）
      if (oldPublicId) {
        formData.append('public_id', oldPublicId);
        formData.append('overwrite', 'true');
        formData.append('invalidate', 'true'); // 清除 CDN 缓存
        console.log(`♻️ [Cloudinary] Will overwrite existing image:`, oldPublicId);
      } else {
        formData.append('folder', folder || this.config.folder);
      }

      console.log(`📤 [Cloudinary] Sending request to:`, `https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`,
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




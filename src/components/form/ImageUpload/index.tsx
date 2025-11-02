import React, { useState, useEffect } from 'react';
import { Upload, message, Button, Popconfirm } from 'antd';
import { PlusOutlined, LoadingOutlined, DeleteOutlined } from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload';
import { globalSystemService } from '@/config';
import { cloudinaryService } from '@/services/cloudinaryService';

interface ImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  maxSize?: number;
  accept?: string;
  folder?: string;
}

/**
 * Image Upload Component
 * 图片上传组件(集成Cloudinary)
 */
export const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  maxSize,
  accept = 'image/*',
  folder,
}) => {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>(value);

  console.log(`🖼️ [ImageUpload] Component initialized:`, {
    folder,
    hasInitialValue: !!value,
    initialUrl: value,
  });

  // 🔧 FIX: Sync imageUrl with value prop changes
  useEffect(() => {
    console.log(`🔄 [ImageUpload] Value changed:`, {
      newValue: value,
      currentImageUrl: imageUrl,
      willUpdate: value !== imageUrl,
    });
    setImageUrl(value);
  }, [value]);

  const beforeUpload = (file: File) => {
    console.log(`📤 [ImageUpload] File selected:`, {
      name: file.name,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      type: file.type,
      folder,
    });

    // Validate file type
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      console.error(`❌ [ImageUpload] Invalid file type: ${file.type}`);
      message.error('只能上传图片文件！');
      return Upload.LIST_IGNORE;  // Reject but don't upload
    }

    // Validate file size
    const isValidSize = globalSystemService.validateFileSize(file, true);
    if (!isValidSize) {
      const maxSizeMB = (maxSize || globalSystemService.getConfig('MAX_IMAGE_SIZE')) / 1024 / 1024;
      console.error(`❌ [ImageUpload] File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB > ${maxSizeMB}MB`);
      message.error(`图片大小不能超过 ${maxSizeMB}MB！`);
      return Upload.LIST_IGNORE;  // Reject but don't upload
    }

    console.log(`✅ [ImageUpload] File validation passed, will trigger customRequest`);
    return true;  // Allow upload to trigger customRequest
  };

  const handleUpload = async (file: RcFile) => {
    try {
      setLoading(true);
      console.log(`⏳ [ImageUpload] Starting upload to Cloudinary...`, {
        fileName: file.name,
        folder: folder || 'default',
        hasOldImage: !!value,
        oldImageUrl: value,
        willOverwrite: !!value,
      });

      // 🆕 Upload to Cloudinary, pass old URL for overwriting (save storage)
      const result = await cloudinaryService.uploadImage(file, folder, value);

      console.log(`📡 [ImageUpload] Cloudinary response:`, result);

      if (result.success && result.url) {
        console.log(`✅ [ImageUpload] Upload successful:`, {
          url: result.url,
          publicId: result.publicId,
          folder,
          overwrittenOldImage: result.wasOverwritten || false,
          hadOldImage: !!value,
        });
        
        setImageUrl(result.url);
        onChange?.(result.url);
        
        console.log(`🔄 [ImageUpload] onChange callback triggered with URL:`, result.url);
        
        // Show appropriate success message based on actual operation
        if (result.wasOverwritten) {
          message.success('图片已更新（覆盖旧图片，节省存储空间）');
        } else if (value) {
          message.warning('图片已更新（创建新文件，旧文件仍存在）');
        } else {
          message.success('图片上传成功');
        }
      } else {
        console.error(`❌ [ImageUpload] Upload failed:`, result.error);
        message.error(result.error || '上传失败');
      }
    } catch (error) {
      console.error('❌ [ImageUpload] Upload error:', error);
      message.error('上传失败，请重试');
    } finally {
      setLoading(false);
      console.log(`🏁 [ImageUpload] Upload process completed`);
    }
  };

  /**
   * Handle image deletion
   * 处理图片删除
   */
  const handleDelete = async () => {
    if (!imageUrl) return;

    try {
      setLoading(true);
      console.log(`🗑️ [ImageUpload] Starting image deletion:`, { imageUrl });

      // Extract public ID from Cloudinary URL
      const publicId = cloudinaryService['extractPublicId'](imageUrl);
      
      if (!publicId) {
        console.error(`❌ [ImageUpload] Failed to extract publicId from URL:`, imageUrl);
        message.error('无法删除：无效的图片URL');
        return;
      }

      console.log(`📝 [ImageUpload] Extracted publicId:`, publicId);

      // Delete from Cloudinary
      const success = await cloudinaryService.deleteImage(publicId);

      if (success) {
        console.log(`✅ [ImageUpload] Image deleted successfully`);
        
        // Clear local state
        setImageUrl(undefined);
        onChange?.('');
        
        // Show appropriate message based on environment
        if (import.meta.env.DEV) {
          message.success('图片已从表单移除（开发环境：仅UI删除）');
        } else {
          message.success('图片已删除（已从 Cloudinary 永久删除）');
        }
      } else {
        console.error(`❌ [ImageUpload] Failed to delete image`);
        message.error('删除失败，请重试');
      }
    } catch (error) {
      console.error('❌ [ImageUpload] Delete error:', error);
      message.error('删除失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const uploadButton = (
    <div>
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>上传图片</div>
    </div>
  );

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Upload
        name="file"
        listType="picture-card"
        className="image-uploader"
        showUploadList={false}
        beforeUpload={beforeUpload}
        customRequest={({ file }) => handleUpload(file as RcFile)}
        accept={accept}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="upload" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          uploadButton
        )}
      </Upload>
      
      {/* Delete button (only show when image exists) */}
      {imageUrl && !loading && (
        <Popconfirm
          title="确定要删除这张图片吗？"
          description={
            import.meta.env.DEV
              ? "开发环境：图片将从表单移除，但不会从 Cloudinary 删除。"
              : "删除后将从 Cloudinary 永久移除，且无法恢复。"
          }
          onConfirm={handleDelete}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            size="small"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 10,
            }}
            title={import.meta.env.DEV ? "开发环境：仅UI删除" : "永久删除"}
          >
            删除
          </Button>
        </Popconfirm>
      )}
    </div>
  );
};

export default ImageUpload;


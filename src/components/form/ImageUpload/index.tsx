import React, { useState } from 'react';
import { Upload, message } from 'antd';
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons';
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
      return false;
    }

    // Validate file size
    const isValidSize = globalSystemService.validateFileSize(file, true);
    if (!isValidSize) {
      const maxSizeMB = (maxSize || globalSystemService.getConfig('MAX_IMAGE_SIZE')) / 1024 / 1024;
      console.error(`❌ [ImageUpload] File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB > ${maxSizeMB}MB`);
      message.error(`图片大小不能超过 ${maxSizeMB}MB！`);
      return false;
    }

    console.log(`✅ [ImageUpload] File validation passed`);
    return false; // Prevent default upload, handle manually
  };

  const handleUpload = async (file: RcFile) => {
    try {
      setLoading(true);
      console.log(`⏳ [ImageUpload] Starting upload to Cloudinary...`, {
        fileName: file.name,
        folder: folder || 'default',
      });

      // Upload to Cloudinary
      const result = await cloudinaryService.uploadImage(file, folder);

      console.log(`📡 [ImageUpload] Cloudinary response:`, result);

      if (result.success && result.url) {
        console.log(`✅ [ImageUpload] Upload successful:`, {
          url: result.url,
          publicId: result.publicId,
          folder,
        });
        
        setImageUrl(result.url);
        onChange?.(result.url);
        
        console.log(`🔄 [ImageUpload] onChange callback triggered with URL:`, result.url);
        message.success('图片上传成功');
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

  const uploadButton = (
    <div>
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>上传图片</div>
    </div>
  );

  return (
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
  );
};

export default ImageUpload;


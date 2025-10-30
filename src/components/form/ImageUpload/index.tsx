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

  const beforeUpload = (file: File) => {
    // Validate file type
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
      return false;
    }

    // Validate file size
    const isValidSize = globalSystemService.validateFileSize(file, true);
    if (!isValidSize) {
      const maxSizeMB = (maxSize || globalSystemService.getConfig('MAX_IMAGE_SIZE')) / 1024 / 1024;
      message.error(`图片大小不能超过 ${maxSizeMB}MB！`);
      return false;
    }

    return false; // Prevent default upload, handle manually
  };

  const handleUpload = async (file: RcFile) => {
    try {
      setLoading(true);

      // Upload to Cloudinary
      const result = await cloudinaryService.uploadImage(file, folder);

      if (result.success && result.url) {
        setImageUrl(result.url);
        onChange?.(result.url);
        message.success('图片上传成功');
      } else {
        message.error(result.error || '上传失败');
      }
    } catch (error) {
      console.error('Upload error:', error);
      message.error('上传失败，请重试');
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


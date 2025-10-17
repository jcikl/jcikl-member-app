import React, { useState } from 'react';
import { Upload, Button, Progress, message, Image } from 'antd';
import { InboxOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

// 类型定义
import type { FileUploadZoneProps, UploadedFile } from './types';

// 样式
import './styles.css';

const { Dragger } = Upload;

/**
 * FileUploadZone Component
 * 文件上传区域组件
 */
export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  accept = 'image/*,.pdf',
  maxSize = 10,
  maxCount = 5,
  multiple = true,
  onUpload,
  onChange,
  defaultFileList = [],
  disabled = false,
  className = '',
}) => {
  const [fileList, setFileList] = useState<UploadedFile[]>(defaultFileList);

  /**
   * 处理文件上传
   */
  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    const uploadFile = file as File;

    // 文件大小验证
    if (uploadFile.size > maxSize * 1024 * 1024) {
      message.error(`文件大小不能超过 ${maxSize}MB`);
      onError?.(new Error('文件过大'));
      return;
    }

    try {
      const results = await onUpload([uploadFile]);
      const result = results[0];

      const newFile: UploadedFile = {
        uid: result.uid,
        name: uploadFile.name,
        size: uploadFile.size,
        type: uploadFile.type,
        url: result.url,
        status: 'done',
        percent: 100,
      };

      const updated = [...fileList, newFile];
      setFileList(updated);
      onChange?.(updated);
      onSuccess?.(result);
      message.success('上传成功');
    } catch (error) {
      onError?.(error as Error);
      message.error('上传失败');
    }
  };

  /**
   * 删除文件
   */
  const handleRemove = (file: UploadedFile) => {
    const updated = fileList.filter(f => f.uid !== file.uid);
    setFileList(updated);
    onChange?.(updated);
  };

  /**
   * 渲染文件项
   */
  const renderFileItem = (file: UploadedFile) => {
    return (
      <div key={file.uid} className="file-upload-zone__item">
        <div className="file-upload-zone__preview">
          {file.type.startsWith('image/') && file.url ? (
            <Image src={file.url} alt={file.name} width={56} height={56} />
          ) : (
            <div className="file-upload-zone__icon">📄</div>
          )}
        </div>

        <div className="file-upload-zone__info">
          <div className="file-upload-zone__name">{file.name}</div>
          <div className="file-upload-zone__size">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </div>

          {file.status === 'uploading' && (
            <Progress percent={file.percent} size="small" />
          )}

          {file.status === 'done' && (
            <div className="file-upload-zone__status success">
              <CheckCircleOutlined /> 上传完成
            </div>
          )}

          {file.status === 'error' && (
            <div className="file-upload-zone__status error">
              <CloseCircleOutlined /> {file.error || '上传失败'}
            </div>
          )}
        </div>

        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemove(file)}
        />
      </div>
    );
  };

  return (
    <div className={`file-upload-zone ${className}`}>
      <Dragger
        accept={accept}
        multiple={multiple}
        customRequest={handleUpload}
        showUploadList={false}
        disabled={disabled || fileList.length >= maxCount}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p className="ant-upload-hint">
          支持 {accept}，最大 {maxSize}MB，最多 {maxCount} 个文件
        </p>
      </Dragger>

      {fileList.length > 0 && (
        <div className="file-upload-zone__list">
          {fileList.map(renderFileItem)}
        </div>
      )}

      {fileList.length > 0 && (
        <div className="file-upload-zone__progress">
          <div className="file-upload-zone__progress-label">
            <span>总进度</span>
            <span>{fileList.filter(f => f.status === 'done').length} / {fileList.length} 完成</span>
          </div>
          <Progress
            percent={(fileList.filter(f => f.status === 'done').length / fileList.length) * 100}
            status="active"
          />
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;


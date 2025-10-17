/**
 * FileUploadZone Types
 */

export interface UploadedFile {
  uid: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  status: 'uploading' | 'done' | 'error';
  percent?: number;
  error?: string;
}

export interface UploadResult {
  uid: string;
  url: string;
  publicId?: string;
}

export interface FileUploadZoneProps {
  accept?: string;
  maxSize?: number;
  maxCount?: number;
  multiple?: boolean;
  onUpload: (files: File[]) => Promise<UploadResult[]>;
  onChange?: (fileList: UploadedFile[]) => void;
  defaultFileList?: UploadedFile[];
  uploadService?: 'cloudinary' | 'firebase' | 'custom';
  disabled?: boolean;
  className?: string;
}


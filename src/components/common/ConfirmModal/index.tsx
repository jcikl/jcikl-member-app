import { Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { confirm } = Modal;

/**
 * Confirm Modal Utilities
 * 确认弹窗工具函数
 */

export const showConfirm = (
  title: string,
  content: string,
  onOk: () => void | Promise<void>
) => {
  confirm({
    title,
    content,
    icon: <ExclamationCircleOutlined />,
    okText: '确认',
    cancelText: '取消',
    onOk,
  });
};

export const showDeleteConfirm = (
  itemName: string,
  onConfirm: () => void | Promise<void>
) => {
  confirm({
    title: '确认删除',
    content: `确定要删除"${itemName}"吗？此操作不可撤销。`,
    icon: <ExclamationCircleOutlined />,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: onConfirm,
  });
};

export const showWarningConfirm = (
  title: string,
  content: string,
  onConfirm: () => void | Promise<void>
) => {
  confirm({
    title,
    content,
    icon: <ExclamationCircleOutlined />,
    okText: '继续',
    okType: 'danger',
    cancelText: '取消',
    onOk: onConfirm,
  });
};



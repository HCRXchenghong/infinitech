import { extractErrorMessage } from '@infinitech/contracts';

export function buildDataManagementErrorMessage(prefix, error) {
  if (error?.request && !error?.response) {
    return `${prefix}: 网络连接失败，请检查网络或服务器状态`;
  }
  return `${prefix}: ${extractErrorMessage(error, '未知错误')}`;
}

export function saveDataManagementJsonFile(jsonString, filename) {
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

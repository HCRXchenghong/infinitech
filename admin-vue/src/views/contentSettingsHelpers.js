import {
  createAdminCarouselForm,
  createAdminPushMessageForm,
  normalizeAdminPushMessageFormState,
  validateAdminImageFile,
} from '@infinitech/admin-core';

export function createEmptyPushMessageForm() {
  return createAdminPushMessageForm();
}

export function resetPushMessageForm(target) {
  Object.assign(target, createEmptyPushMessageForm());
}

export function fillPushMessageForm(target, message = {}) {
  Object.assign(target, normalizeAdminPushMessageFormState(message));
}

export function createEmptyCarousel() {
  return createAdminCarouselForm();
}

export function resetCarousel(target) {
  Object.assign(target, createEmptyCarousel());
}

export function validateImageFile(file, maxMB = 10) {
  return validateAdminImageFile(file, maxMB);
}

function dataUrlToJpegFile(dataUrl, fileName) {
  const byteString = atob(dataUrl.split(',')[1]);
  const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeString });
  return new File([blob], fileName, { type: 'image/jpeg' });
}

export function compressImageTo1MB(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          const maxSide = 4000;
          let targetWidth = img.width;
          let targetHeight = img.height;
          const maxOriginalSide = Math.max(img.width, img.height);
          if (maxOriginalSide > maxSide) {
            const scale = maxSide / maxOriginalSide;
            targetWidth = Math.round(img.width * scale);
            targetHeight = Math.round(img.height * scale);
          }

          canvas.width = targetWidth;
          canvas.height = targetHeight;
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          const targetSizeBytes = 1 * 1024 * 1024;
          let quality = 0.92;
          let currentCanvas = canvas;
          let dataUrl = '';

          const calcSize = (url) => {
            const base64 = url.split(',')[1] || '';
            return Math.ceil(base64.length * 3 / 4);
          };

          const compress = () => {
            dataUrl = currentCanvas.toDataURL('image/jpeg', quality);
            const sizeBytes = calcSize(dataUrl);

            if (sizeBytes <= targetSizeBytes) {
              resolve(dataUrlToJpegFile(dataUrl, file.name));
              return;
            }

            if (quality > 0.3) {
              quality -= 0.05;
              compress();
              return;
            }

            const nextCanvas = document.createElement('canvas');
            const nextCtx = nextCanvas.getContext('2d');
            if (!nextCtx) {
              resolve(dataUrlToJpegFile(dataUrl, file.name));
              return;
            }

            const nextWidth = Math.max(800, Math.round(currentCanvas.width * 0.85));
            const nextHeight = Math.max(800, Math.round(currentCanvas.height * 0.85));

            if (nextWidth < 800 || nextHeight < 800) {
              resolve(dataUrlToJpegFile(dataUrl, file.name));
              return;
            }

            nextCanvas.width = nextWidth;
            nextCanvas.height = nextHeight;
            nextCtx.drawImage(currentCanvas, 0, 0, nextWidth, nextHeight);
            currentCanvas = nextCanvas;
            quality = 0.85;
            compress();
          };

          compress();
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

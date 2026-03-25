export function createEmptyNotificationForm() {
  return {
    title: '',
    source: '悦享e食',
    cover: '',
    content: {
      blocks: []
    }
  };
}

export function normalizeNotificationContent(content) {
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch (error) {
      return { blocks: [] };
    }
  }
  if (content && typeof content === 'object') {
    return content;
  }
  return { blocks: [] };
}

export function createBlock(type) {
  const block = { type };
  if (type === 'p' || type === 'h2' || type === 'quote') {
    block.text = '';
  } else if (type === 'ul') {
    block.items = [''];
  } else if (type === 'img') {
    block.url = '';
    block.caption = '';
  }
  return block;
}

export function moveBlock(blocks, index, direction) {
  const target = index + direction;
  if (!Array.isArray(blocks)) return;
  if (target < 0 || target >= blocks.length) return;
  [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
}

const BLOCK_TYPE_NAMES = {
  p: '段落',
  h2: '标题',
  quote: '引用',
  ul: '列表',
  img: '图片'
};

export function getBlockTypeName(type) {
  return BLOCK_TYPE_NAMES[type] || type;
}

export function validateImageFile(file, maxMB) {
  const isImage = Boolean(file?.type) && file.type.startsWith('image/');
  const isLtLimit = Number(file?.size || 0) / 1024 / 1024 < maxMB;

  if (!isImage) {
    return { valid: false, message: '只能上传图片文件' };
  }
  if (!isLtLimit) {
    return { valid: false, message: `图片大小不能超过 ${maxMB}MB` };
  }
  return { valid: true, message: '' };
}

export function buildNotificationPayload(formValue, isPublished) {
  return {
    title: formValue.title,
    source: formValue.source,
    cover: formValue.cover,
    content: JSON.stringify(formValue.content),
    is_published: isPublished
  };
}

export const blockTypeLabel = {
  p: '段落',
  h2: '标题',
  quote: '引用',
  ul: '列表',
  img: '图片'
};

let blockKeySeed = 1;
function nextBlockKey() {
  blockKeySeed += 1;
  return `block_${Date.now()}_${blockKeySeed}`;
}

export function createDefaultEditorForm() {
  return {
    title: '',
    source: '悦享e食',
    cover: '',
    blocks: []
  };
}

export function createBlock(type = 'p') {
  if (type === 'ul') {
    return { key: nextBlockKey(), type, items: [''] };
  }
  if (type === 'img') {
    return { key: nextBlockKey(), type, url: '', caption: '' };
  }
  return { key: nextBlockKey(), type, text: '' };
}

export function normalizeBlocks(blocks) {
  if (!Array.isArray(blocks)) return [];

  return blocks.map((raw) => {
    const type = String(raw?.type || 'p');
    if (type === 'ul') {
      const items = Array.isArray(raw?.items)
        ? raw.items.map((item) => String(item || ''))
        : [''];
      return { key: nextBlockKey(), type: 'ul', items: items.length ? items : [''] };
    }
    if (type === 'img') {
      return {
        key: nextBlockKey(),
        type: 'img',
        url: String(raw?.url || ''),
        caption: String(raw?.caption || '')
      };
    }
    if (type === 'h2' || type === 'quote' || type === 'p') {
      return { key: nextBlockKey(), type, text: String(raw?.text || '') };
    }
    return { key: nextBlockKey(), type: 'p', text: String(raw?.text || '') };
  });
}

export function parseContent(raw) {
  if (!raw) return [];

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.blocks)) {
        return normalizeBlocks(parsed.blocks);
      }
      return normalizeBlocks([]);
    } catch (error) {
      const lines = raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ type: 'p', text: line }));
      return normalizeBlocks(lines);
    }
  }

  if (Array.isArray(raw)) {
    return normalizeBlocks(raw);
  }

  if (typeof raw === 'object' && Array.isArray(raw.blocks)) {
    return normalizeBlocks(raw.blocks);
  }

  return [];
}

export function sanitizeBlocks(blocks) {
  return (Array.isArray(blocks) ? blocks : [])
    .map((block) => {
      if (block.type === 'ul') {
        const items = (block.items || []).map((item) => String(item || '').trim()).filter(Boolean);
        return { type: 'ul', items };
      }
      if (block.type === 'img') {
        return {
          type: 'img',
          url: String(block.url || '').trim(),
          caption: String(block.caption || '').trim()
        };
      }
      return {
        type: block.type,
        text: String(block.text || '').trim()
      };
    })
    .filter((block) => {
      if (block.type === 'ul') return Array.isArray(block.items) && block.items.length > 0;
      if (block.type === 'img') return Boolean(block.url);
      return Boolean(block.text);
    });
}

export function moveBlock(blocks, index, direction) {
  if (!Array.isArray(blocks)) return;
  const target = index + direction;
  if (target < 0 || target >= blocks.length) return;
  [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
}

export function buildPayload(formValue, published) {
  const blocks = sanitizeBlocks(formValue.blocks);
  return {
    title: formValue.title.trim(),
    source: (formValue.source || '悦享e食').trim() || '悦享e食',
    cover: formValue.cover,
    content: JSON.stringify({ blocks }),
    is_published: published
  };
}

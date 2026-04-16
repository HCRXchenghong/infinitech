export const DEFAULT_NOTIFICATION_SOURCE = "悦享e食";

export const NOTIFICATION_BLOCK_TYPE_LABELS = Object.freeze({
  p: "段落",
  h2: "标题",
  quote: "引用",
  ul: "列表",
  img: "图片",
});

const NOTIFICATION_BLOCK_TYPES = new Set(
  Object.keys(NOTIFICATION_BLOCK_TYPE_LABELS),
);

let notificationBlockKeySeed = 0;

function nextNotificationBlockKey() {
  notificationBlockKeySeed += 1;
  return `notification_block_${Date.now()}_${notificationBlockKeySeed}`;
}

function trimText(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeBlockType(type) {
  const normalizedType = String(type || "p");
  return NOTIFICATION_BLOCK_TYPES.has(normalizedType) ? normalizedType : "p";
}

function appendBlockKey(block, withKey) {
  if (!withKey) {
    return block;
  }
  return {
    key: nextNotificationBlockKey(),
    ...block,
  };
}

function normalizeListItems(items, { preserveEmptyListItem = false, trim = false } = {}) {
  const sourceItems = Array.isArray(items) ? items : [];
  const normalizedItems = trim
    ? sourceItems.map((item) => trimText(item)).filter(Boolean)
    : sourceItems.map((item) => String(item == null ? "" : item));

  if (normalizedItems.length > 0) {
    return normalizedItems;
  }
  return preserveEmptyListItem ? [""] : [];
}

function normalizeBlock(raw = {}, options = {}) {
  const type = normalizeBlockType(raw?.type);
  const withKey = Boolean(options.withKey);

  if (type === "ul") {
    return appendBlockKey(
      {
        type,
        items: normalizeListItems(raw?.items, {
          preserveEmptyListItem: options.preserveEmptyListItem,
          trim: options.trim,
        }),
      },
      withKey,
    );
  }

  if (type === "img") {
    return appendBlockKey(
      {
        type,
        url: options.trim ? trimText(raw?.url) : String(raw?.url == null ? "" : raw.url),
        caption: options.trim
          ? trimText(raw?.caption)
          : String(raw?.caption == null ? "" : raw.caption),
      },
      withKey,
    );
  }

  return appendBlockKey(
    {
      type,
      text: options.trim ? trimText(raw?.text) : String(raw?.text == null ? "" : raw.text),
    },
    withKey,
  );
}

export function createNotificationEditorForm() {
  return {
    title: "",
    source: DEFAULT_NOTIFICATION_SOURCE,
    cover: "",
    blocks: [],
  };
}

export function createNotificationBlock(type = "p", options = {}) {
  const normalizedType = normalizeBlockType(type);
  const withKey = Boolean(options.withKey);

  if (normalizedType === "ul") {
    return appendBlockKey(
      {
        type: normalizedType,
        items: [""],
      },
      withKey,
    );
  }

  if (normalizedType === "img") {
    return appendBlockKey(
      {
        type: normalizedType,
        url: "",
        caption: "",
      },
      withKey,
    );
  }

  return appendBlockKey(
    {
      type: normalizedType,
      text: "",
    },
    withKey,
  );
}

export function normalizeNotificationBlocks(blocks, options = {}) {
  if (!Array.isArray(blocks)) {
    return [];
  }
  return blocks.map((block) => normalizeBlock(block, options));
}

export function parseNotificationContent(raw, options = {}) {
  const normalizeOptions = {
    withKey: Boolean(options.withKeys),
    preserveEmptyListItem: Boolean(options.preserveEmptyListItem),
    trim: Boolean(options.trim),
  };

  if (!raw) {
    return [];
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parseNotificationContent(parsed, options);
    } catch (_error) {
      const lines = raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ type: "p", text: line }));
      return normalizeNotificationBlocks(lines, normalizeOptions);
    }
  }

  if (Array.isArray(raw)) {
    return normalizeNotificationBlocks(raw, normalizeOptions);
  }

  if (typeof raw === "object") {
    if (Array.isArray(raw.blocks)) {
      return normalizeNotificationBlocks(raw.blocks, normalizeOptions);
    }
    if (raw.text !== undefined) {
      return normalizeNotificationBlocks(
        [{ type: "p", text: raw.text }],
        normalizeOptions,
      );
    }
  }

  return [];
}

export function sanitizeNotificationBlocks(blocks) {
  return normalizeNotificationBlocks(blocks, { trim: true })
    .filter((block) => {
      if (block.type === "ul") {
        return Array.isArray(block.items) && block.items.length > 0;
      }
      if (block.type === "img") {
        return Boolean(block.url);
      }
      return Boolean(block.text);
    });
}

export function parseNotificationDisplayBlocks(raw) {
  return sanitizeNotificationBlocks(parseNotificationContent(raw));
}

export function moveNotificationBlock(blocks, index, direction) {
  if (!Array.isArray(blocks)) {
    return;
  }
  const target = index + direction;
  if (target < 0 || target >= blocks.length) {
    return;
  }
  [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
}

export function getNotificationBlockTypeName(type) {
  return NOTIFICATION_BLOCK_TYPE_LABELS[type] || type;
}

export function validateNotificationImageFile(file, maxMB) {
  const isImage = Boolean(file?.type) && file.type.startsWith("image/");
  const isLtLimit = Number(file?.size || 0) / 1024 / 1024 < maxMB;

  if (!isImage) {
    return { valid: false, message: "只能上传图片文件" };
  }
  if (!isLtLimit) {
    return { valid: false, message: `图片大小不能超过 ${maxMB}MB` };
  }
  return { valid: true, message: "" };
}

export function buildNotificationPayload(formValue = {}, isPublished = false) {
  const rawBlocks = Array.isArray(formValue.blocks)
    ? formValue.blocks
    : formValue.content?.blocks;
  const blocks = sanitizeNotificationBlocks(rawBlocks);

  return {
    title: trimText(formValue.title),
    source: trimText(formValue.source) || DEFAULT_NOTIFICATION_SOURCE,
    cover: trimText(formValue.cover),
    content: JSON.stringify({ blocks }),
    is_published: Boolean(isPublished),
  };
}

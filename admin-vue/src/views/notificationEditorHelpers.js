import {
  buildNotificationPayload as buildSharedNotificationPayload,
  createNotificationBlock,
  createNotificationEditorForm,
  getNotificationBlockTypeName,
  moveNotificationBlock,
  parseNotificationContent,
  validateNotificationImageFile,
} from '@infinitech/domain-core';

export function createEmptyNotificationForm() {
  const form = createNotificationEditorForm();
  return {
    title: form.title,
    source: form.source,
    cover: form.cover,
    content: {
      blocks: [],
    },
  };
}

export function normalizeNotificationContent(content) {
  return {
    blocks: parseNotificationContent(content, {
      preserveEmptyListItem: true,
    }),
  };
}

export function createBlock(type) {
  return createNotificationBlock(type);
}

export function moveBlock(blocks, index, direction) {
  moveNotificationBlock(blocks, index, direction);
}

export function getBlockTypeName(type) {
  return getNotificationBlockTypeName(type);
}

export function validateImageFile(file, maxMB) {
  return validateNotificationImageFile(file, maxMB);
}

export function buildNotificationPayload(formValue, isPublished) {
  return buildSharedNotificationPayload(formValue, isPublished);
}

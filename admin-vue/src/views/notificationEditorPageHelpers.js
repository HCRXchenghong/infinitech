import {
  buildNotificationPayload,
  createNotificationBlock,
  createNotificationEditorForm,
  moveNotificationBlock,
  NOTIFICATION_BLOCK_TYPE_LABELS,
  parseNotificationContent,
  sanitizeNotificationBlocks,
} from '@infinitech/domain-core';

export const blockTypeLabel = NOTIFICATION_BLOCK_TYPE_LABELS;

export function createDefaultEditorForm() {
  return createNotificationEditorForm();
}

export function createBlock(type = 'p') {
  return createNotificationBlock(type, { withKey: true });
}

export function parseContent(raw) {
  return parseNotificationContent(raw, {
    withKeys: true,
    preserveEmptyListItem: true,
  });
}

export function sanitizeBlocks(blocks) {
  return sanitizeNotificationBlocks(blocks);
}

export function moveBlock(blocks, index, direction) {
  moveNotificationBlock(blocks, index, direction);
}

export function buildPayload(formValue, published) {
  return buildNotificationPayload(formValue, published);
}

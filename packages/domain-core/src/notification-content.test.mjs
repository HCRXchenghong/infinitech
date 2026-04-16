import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNotificationPayload,
  createNotificationBlock,
  createNotificationEditorForm,
  DEFAULT_NOTIFICATION_SOURCE,
  getNotificationBlockTypeName,
  moveNotificationBlock,
  parseNotificationContent,
  parseNotificationDisplayBlocks,
  sanitizeNotificationBlocks,
  validateNotificationImageFile,
} from "./notification-content.js";

test("notification content helpers normalize editor and display blocks", () => {
  const editorBlocks = parseNotificationContent(
    JSON.stringify({
      blocks: [
        { type: "p", text: "第一段" },
        { type: "ul", items: [" 选项一 ", "", "选项二"] },
        { type: "img", url: "/uploads/cover.png", caption: " 封面 " },
      ],
    }),
    { withKeys: true, preserveEmptyListItem: true },
  );

  assert.equal(editorBlocks.length, 3);
  assert.match(editorBlocks[0].key, /^notification_block_/);
  assert.deepEqual(editorBlocks[1].items, [" 选项一 ", "", "选项二"]);

  assert.deepEqual(parseNotificationDisplayBlocks("第一行\n\n第二行"), [
    { type: "p", text: "第一行" },
    { type: "p", text: "第二行" },
  ]);
});

test("notification content helpers sanitize and serialize payloads", () => {
  assert.deepEqual(
    sanitizeNotificationBlocks([
      { type: "p", text: "  段落  " },
      { type: "ul", items: [" 条目A ", " ", "条目B"] },
      { type: "img", url: " /asset/demo.png ", caption: " 配图 " },
      { type: "quote", text: "   " },
    ]),
    [
      { type: "p", text: "段落" },
      { type: "ul", items: ["条目A", "条目B"] },
      { type: "img", url: "/asset/demo.png", caption: "配图" },
    ],
  );

  assert.deepEqual(
    buildNotificationPayload(
      {
        title: "  平台通知 ",
        source: " ",
        cover: " /cover.png ",
        content: {
          blocks: [
            { type: "p", text: " 主文 " },
            { type: "img", url: " /inline.png ", caption: "" },
          ],
        },
      },
      true,
    ),
    {
      title: "平台通知",
      source: DEFAULT_NOTIFICATION_SOURCE,
      cover: "/cover.png",
      content:
        '{"blocks":[{"type":"p","text":"主文"},{"type":"img","url":"/inline.png","caption":""}]}',
      is_published: true,
    },
  );
});

test("notification content helpers keep editor primitives stable", () => {
  const form = createNotificationEditorForm();
  const firstBlock = createNotificationBlock("ul", { withKey: true });
  const secondBlock = createNotificationBlock("img", { withKey: true });
  const blocks = [firstBlock, secondBlock];

  moveNotificationBlock(blocks, 0, 1);

  assert.equal(form.source, DEFAULT_NOTIFICATION_SOURCE);
  assert.equal(firstBlock.type, "ul");
  assert.deepEqual(firstBlock.items, [""]);
  assert.equal(secondBlock.type, "img");
  assert.equal(blocks[0].type, "img");
  assert.equal(getNotificationBlockTypeName("quote"), "引用");
  assert.deepEqual(validateNotificationImageFile({ type: "text/plain", size: 10 }, 2), {
    valid: false,
    message: "只能上传图片文件",
  });
});

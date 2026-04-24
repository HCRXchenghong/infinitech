import test from "node:test";
import assert from "node:assert/strict";

import {
  createRiderAppealPageLogic,
  DEFAULT_RIDER_APPEAL_LIST,
  getRiderAppealStatusText,
} from "./rider-appeal-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  return instance;
}

test("rider appeal helpers expose stable defaults and status copy", () => {
  assert.equal(DEFAULT_RIDER_APPEAL_LIST.length, 2);
  assert.equal(getRiderAppealStatusText("pending"), "审核中");
  assert.equal(getRiderAppealStatusText("approved"), "已通过");
  assert.equal(getRiderAppealStatusText("rejected"), "已拒绝");
  assert.equal(getRiderAppealStatusText("unknown"), "未知");
});

test("rider appeal page delegates view and create actions when handlers are injected", () => {
  const viewedAppeals = [];
  const created = [];
  const component = createRiderAppealPageLogic({
    onViewAppeal(appeal) {
      viewedAppeals.push(appeal.id);
    },
    onCreateAppeal() {
      created.push("create");
    },
  });
  const page = instantiatePage(component);

  page.viewAppeal(page.appealList[0]);
  page.createAppeal();

  assert.deepEqual(viewedAppeals, [1]);
  assert.deepEqual(created, ["create"]);
});

test("rider appeal page falls back to shared toast copy without injected handlers", () => {
  const toasts = [];
  const component = createRiderAppealPageLogic({
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
    },
  });
  const page = instantiatePage(component);

  page.viewAppeal(page.appealList[0]);
  page.createAppeal();

  assert.deepEqual(toasts, [
    {
      title: "查看申诉详情",
      icon: "none",
    },
    {
      title: "发起新申诉",
      icon: "none",
    },
  ]);
});

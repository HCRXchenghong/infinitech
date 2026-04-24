import test from "node:test";
import assert from "node:assert/strict";

import {
  createRiderTaskDetailPageLogic,
  formatRiderTaskDetailDistance,
  normalizeRiderTaskDetailId,
} from "./rider-task-detail-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  if (typeof component.onLoad === "function") {
    instance.onLoad = component.onLoad.bind(instance);
  }

  for (const [name, handler] of Object.entries(component.methods || {})) {
    instance[name] = handler.bind(instance);
  }

  for (const [name, getter] of Object.entries(component.computed || {})) {
    Object.defineProperty(instance, name, {
      get: () => getter.call(instance),
      enumerable: true,
      configurable: true,
    });
  }

  return instance;
}

test("rider task detail helpers normalize ids and format task distance", () => {
  assert.equal(normalizeRiderTaskDetailId({ id: " task-1 " }), "task-1");
  assert.equal(
    formatRiderTaskDetailDistance({ status: "pending", shopDistance: 320 }),
    "320m",
  );
  assert.equal(
    formatRiderTaskDetailDistance({
      status: "delivering",
      customerDistance: 2.8,
    }),
    "2.8km",
  );
  assert.equal(
    formatRiderTaskDetailDistance({ status: "delivering", customerDistance: "" }),
    "--",
  );
});

test("rider task detail page loads reasons, executes task actions and reports exceptions", async () => {
  const toasts = [];
  const modalPromises = [];
  const actionCalls = [];
  const scheduledTimeouts = [];

  const riderOrderStore = {
    myOrders: [
      {
        id: "task-1",
        status: "delivering",
        customerDistance: 3.2,
      },
    ],
  };

  const component = createRiderTaskDetailPageLogic({
    riderOrderStore,
    async advanceTask(taskId) {
      actionCalls.push(["advance", taskId]);
    },
    async loadTaskReportReasons() {
      return ["联系不上顾客", "道路拥堵"];
    },
    callTaskPhone(task) {
      actionCalls.push(["phone", task.id]);
    },
    navigateTask(task) {
      actionCalls.push(["navigate", task.id]);
    },
    openTaskChat(task) {
      actionCalls.push(["chat", task.id]);
    },
    async submitTaskException(task, reason) {
      actionCalls.push(["report", task.id, reason]);
    },
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
      showLoading(payload) {
        toasts.push({ loading: payload.title });
      },
      hideLoading() {
        toasts.push({ hidden: true });
      },
      showModal(payload) {
        const result = payload.success({ confirm: true });
        if (result && typeof result.then === "function") {
          modalPromises.push(result);
        }
      },
      navigateBack() {
        actionCalls.push(["back"]);
      },
    },
    setTimeoutFn(callback) {
      scheduledTimeouts.push(callback);
      return scheduledTimeouts.length;
    },
  });
  const page = instantiatePage(component);

  page.onLoad({ id: "task-1" });
  await page.loadReportReasons();
  assert.equal(page.task.id, "task-1");
  assert.deepEqual(page.reportReasons, ["联系不上顾客", "道路拥堵"]);
  assert.equal(page.formatTaskDistance(page.task), "3.2km");

  page.callPhone();
  page.sendMessage();
  page.navigate(page.task);
  page.showReport = true;
  await page.handleReport("联系不上顾客");
  page.completeTask();
  await Promise.all(modalPromises);
  scheduledTimeouts[0]();

  assert.deepEqual(actionCalls, [
    ["phone", "task-1"],
    ["chat", "task-1"],
    ["navigate", "task-1"],
    ["report", "task-1", "联系不上顾客"],
    ["advance", "task-1"],
    ["back"],
  ]);
  assert.deepEqual(toasts.slice(-5), [
    { loading: "提交中..." },
    { title: "上报成功", icon: "success" },
    { hidden: true },
    { title: "订单已完成！", icon: "success" },
    { hidden: true },
  ].slice(0, 4));
});

test("rider task detail page handles missing task and failed operations cleanly", async () => {
  const toasts = [];
  const modalPromises = [];

  const component = createRiderTaskDetailPageLogic({
    riderOrderStore: {
      myOrders: [{ id: "task-2", status: "pending", shopDistance: 180 }],
    },
    async advanceTask() {
      throw new Error("advance failed");
    },
    async submitTaskException() {
      throw new Error("上报失败");
    },
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
      showLoading() {},
      hideLoading() {},
      showModal(payload) {
        const result = payload.success({ confirm: true });
        if (result && typeof result.then === "function") {
          modalPromises.push(result);
        }
      },
    },
  });
  const page = instantiatePage(component);

  page.callPhone();
  page.onLoad({ id: "task-2" });
  await page.handleReport("道路拥堵");
  page.completeTask();
  await Promise.all(modalPromises);

  assert.deepEqual(toasts, [
    { title: "订单信息异常", icon: "none" },
    { title: "上报失败", icon: "none" },
    { title: "操作失败", icon: "none" },
  ]);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRiderFilteredTasks,
  buildRiderTaskTabs,
  createRiderTasksPageLogic,
} from "./rider-tasks-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

  for (const hookName of ["onLoad", "onShow", "onReady"]) {
    if (typeof component[hookName] === "function") {
      instance[hookName] = component[hookName].bind(instance);
    }
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

test("rider tasks helpers build tabs and filter task lists by current tab", () => {
  const orders = [
    { id: "task-1", status: "pending" },
    { id: "task-2", status: "delivering" },
    { id: "task-3", status: "pending" },
  ];

  assert.deepEqual(buildRiderTaskTabs(orders), [
    { label: "待取货", count: 2 },
    { label: "配送中", count: 1 },
  ]);
  assert.deepEqual(
    buildRiderFilteredTasks(orders, 0).map((item) => item.id),
    ["task-1", "task-3"],
  );
  assert.deepEqual(
    buildRiderFilteredTasks(orders, 1).map((item) => item.id),
    ["task-2"],
  );
});

test("rider tasks page loads report reasons, advances tasks, opens task actions and submits exceptions", async () => {
  const toasts = [];
  const routes = [];
  const modalPromises = [];
  const scheduledTimeouts = [];
  const actionCalls = [];
  let loadRiderDataCount = 0;
  let advancedTaskId = "";

  const riderOrderStore = {
    myOrders: [
      { id: "task-1", status: "pending" },
      { id: "task-2", status: "delivering" },
    ],
  };

  const component = createRiderTasksPageLogic({
    riderOrderStore,
    async advanceTask(taskId) {
      advancedTaskId = taskId;
    },
    async loadRiderData() {
      loadRiderDataCount += 1;
    },
    async loadTaskReportReasons() {
      return ["商家出餐慢", "联系不上顾客"];
    },
    callTaskPhone(task) {
      actionCalls.push(["phone", task.id]);
    },
    navigateTask(task) {
      actionCalls.push(["navigate", task.id]);
    },
    openCustomerTaskChat(task) {
      actionCalls.push(["customer-chat", task.id]);
    },
    openMerchantTaskChat(task) {
      actionCalls.push(["merchant-chat", task.id]);
    },
    async submitTaskException(task, reason) {
      actionCalls.push(["report", task.id, reason]);
    },
    uniApp: {
      getSystemInfoSync() {
        return { statusBarHeight: 30 };
      },
      showModal(payload) {
        const result = payload.success({ confirm: true });
        if (result && typeof result.then === "function") {
          modalPromises.push(result);
        }
      },
      showToast(payload) {
        toasts.push(payload);
      },
      showLoading(payload) {
        toasts.push({ loading: payload.title });
      },
      hideLoading() {
        toasts.push({ hidden: true });
      },
      switchTab({ url }) {
        routes.push(url);
      },
      navigateTo({ url }) {
        routes.push(url);
      },
    },
    setTimeoutFn(callback) {
      scheduledTimeouts.push(callback);
      return scheduledTimeouts.length;
    },
  });
  const page = instantiatePage(component);

  page.onLoad();
  await page.loadReportReasons();
  assert.equal(page.statusBarHeight, 30);
  assert.deepEqual(page.reportReasons, ["商家出餐慢", "联系不上顾客"]);
  assert.deepEqual(page.tabs, [
    { label: "待取货", count: 1 },
    { label: "配送中", count: 1 },
  ]);
  assert.deepEqual(
    page.filteredTasks.map((item) => item.id),
    ["task-1"],
  );

  await page.onShow();
  assert.equal(loadRiderDataCount, 1);

  page.goToHall();
  assert.deepEqual(routes, ["/pages/hall/index"]);
  scheduledTimeouts[0]();
  assert.equal(page.isNavigating, false);

  page.goToDetail({ id: "task-9" });
  assert.deepEqual(routes, [
    "/pages/hall/index",
    "/pages/tasks/detail?id=task-9",
  ]);
  scheduledTimeouts[1]();
  assert.equal(page.isNavigating, false);

  page.handleAdvanceTask({ id: "task-1", status: "pending" });
  await Promise.all(modalPromises);
  assert.equal(advancedTaskId, "task-1");
  assert.equal(page.currentTab, 1);
  assert.equal(toasts.at(-1).title, "开始配送！");

  page.callCustomer({ id: "task-2" });
  assert.equal(page.showContact, true);
  page.openCustomerChat({ id: "task-2" });
  page.openMerchantChat({ id: "task-2" });
  page.callCustomerPhone({ id: "task-2" });
  page.navigate({ id: "task-2" });
  page.showReportModal({ id: "task-2" });
  assert.equal(page.showReport, true);
  await page.handleReport("商家出餐慢");
  assert.deepEqual(actionCalls, [
    ["customer-chat", "task-2"],
    ["merchant-chat", "task-2"],
    ["phone", "task-2"],
    ["navigate", "task-2"],
    ["report", "task-2", "商家出餐慢"],
  ]);
  assert.equal(page.showReport, false);
  assert.deepEqual(toasts.slice(-3), [
    { loading: "提交中..." },
    { title: "上报成功", icon: "success" },
    { hidden: true },
  ]);
});

test("rider tasks page falls back on report errors and missing current task", async () => {
  const toasts = [];
  const component = createRiderTasksPageLogic({
    riderOrderStore: { myOrders: [] },
    async submitTaskException() {
      throw new Error("上报失败");
    },
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
      showLoading() {},
      hideLoading() {},
    },
  });
  const page = instantiatePage(component);

  await page.handleReport("商家出餐慢");
  page.currentTask = { id: "task-3" };
  await page.handleReport("商家出餐慢");

  assert.deepEqual(toasts, [
    { title: "订单信息异常", icon: "none" },
    { title: "上报失败", icon: "none" },
  ]);
});

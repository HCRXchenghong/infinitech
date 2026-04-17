import test from "node:test";
import assert from "node:assert/strict";

import { createWalletBillsPageLogic } from "./wallet-bills-page.js";

function instantiatePage(component) {
  const instance = {
    ...component.data(),
  };

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

test("wallet bills page summarizes transactions and merges detail payloads", async () => {
  const loadingTitles = [];
  const toasts = [];
  const component = createWalletBillsPageLogic({
    request: async (payload) => {
      if (payload.url.startsWith("/api/wallet/transactions/withdraw_1")) {
        return {
          transactionId: "withdraw_1",
          paymentMethod: "bank_card",
          createdAt: "2026-04-17 09:32:00",
          withdraw: {
            arrivalText: "T+1",
            transferResult: "审核中",
            thirdPartyOrderId: "po_1",
            thirdPartyTransactionId: "pt_1",
          },
        };
      }

      return {
        data: {
          items: [
            {
              transactionId: "income_1",
              type: "income",
              status: "pending",
              amount: 800,
              paymentMethod: "admin",
              createdAt: "2026-04-17 08:00:00",
            },
            {
              transactionId: "withdraw_1",
              type: "withdraw",
              status: "processing",
              amount: 500,
              paymentMethod: "bank_card",
              createdAt: "2026-04-17 09:00:00",
            },
          ],
        },
      };
    },
    buildAuthorizationHeader(token) {
      return { Authorization: `Bearer ${token}` };
    },
    userType: "rider",
    filterOptions: [
      { label: "全部", value: "" },
      { label: "订单收入", value: "income" },
    ],
    txTypeLabels: {
      income: "订单收入",
    },
    formatStatusLabel(status, type) {
      if (status === "pending" && type === "income") {
        return "冻结中";
      }
      return "";
    },
    uniApp: {
      getSystemInfoSync() {
        return { statusBarHeight: 18 };
      },
      getStorageSync(key) {
        if (key === "userProfile") {
          return { id: "rider_1" };
        }
        if (key === "token") {
          return "token_2";
        }
        return "";
      },
      showLoading(payload) {
        loadingTitles.push(payload.title);
      },
      hideLoading() {
        loadingTitles.push("hide");
      },
      showToast(payload) {
        toasts.push(payload);
      },
      navigateBack() {},
    },
  });
  const page = instantiatePage(component);

  component.onLoad.call(page);
  await page.loadBills(false);
  await page.openDetail(page.transactions[1]);

  assert.equal(page.statusBarHeight, 18);
  assert.equal(page.incomeAmount, 800);
  assert.equal(page.expenseAmount, 500);
  assert.equal(page.amountText(page.transactions[0]), "+¥8.00");
  assert.equal(page.amountText(page.transactions[1]), "-¥5.00");
  assert.equal(page.statusLabel("pending", "income"), "冻结中");
  assert.equal(page.detailVisible, true);
  assert.match(page.detailTx.description, /ARRIVAL:T\+1/);
  assert.match(page.detailTx.description, /TRANSFER:审核中/);
  assert.equal(page.detailRows[1].value, "-¥5.00");
  assert.equal(page.detailRows[3].value, "bank_card");
  assert.deepEqual(loadingTitles, ["正在加载详情", "hide"]);
  assert.deepEqual(toasts, []);
});

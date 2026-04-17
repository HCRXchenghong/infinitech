import test from "node:test";
import assert from "node:assert/strict";

import {
  createPhoneContactHelper,
  normalizePhoneNumber,
} from "./phone-contact.js";

test("phone contact helper normalizes phone numbers consistently", () => {
  assert.equal(normalizePhoneNumber("138-1234-5678"), "13812345678");
  assert.equal(normalizePhoneNumber(""), "");
});

test("phone contact helper records audit payloads and forwards makePhoneCall", async () => {
  const auditCalls = [];
  const makePhoneCalls = [];
  const helper = createPhoneContactHelper({
    recordPhoneContactClick: async (payload) => {
      auditCalls.push(payload);
    },
    uniApp: {
      getSystemInfoSync() {
        return { uniPlatform: "app-plus" };
      },
      makePhoneCall(payload) {
        makePhoneCalls.push(payload);
        payload.success();
      },
    },
  });

  const result = await helper.makePhoneCall({
    targetRole: "merchant",
    targetId: "shop_1",
    targetPhone: "138-1234-5678",
    entryPoint: "order_detail",
    scene: "order_contact",
    orderId: "order_1",
  });

  assert.deepEqual(result, {
    success: true,
    phoneNumber: "13812345678",
  });
  assert.equal(auditCalls[0].targetPhone, "13812345678");
  assert.equal(auditCalls[0].clientPlatform, "app-plus");
  assert.equal(makePhoneCalls[0].phoneNumber, "13812345678");
});

test("phone contact helper rejects invalid phone numbers", async () => {
  const helper = createPhoneContactHelper({
    uniApp: {
      makePhoneCall() {},
    },
  });

  await assert.rejects(() => helper.makePhoneCall({ targetPhone: "abc" }), {
    message: "invalid phone number",
  });
});

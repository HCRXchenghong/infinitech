import test from "node:test";
import assert from "node:assert/strict";

import {
  createRiderPersonalInfoPageLogic,
  getRiderVerificationStatusHint,
  getRiderVerificationStatusText,
  isValidRiderIdCardNumber,
  maskRiderIdCardNumber,
  normalizeRiderPersonalInfoProfile,
} from "./rider-personal-info-page.js";

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

test("rider personal info helpers normalize verification status and id cards", () => {
  assert.deepEqual(normalizeRiderPersonalInfoProfile({ data: { nickname: "骑手" } }), {
    nickname: "骑手",
  });
  assert.equal(getRiderVerificationStatusText({ is_verified: true }), "已通过平台审核");
  assert.equal(
    getRiderVerificationStatusText({
      real_name: "张三",
      id_card_number: "110101199001011234",
    }),
    "资料已保存，待平台审核",
  );
  assert.equal(getRiderVerificationStatusText({}), "请先完善实名资料");
  assert.match(getRiderVerificationStatusHint({ is_verified: true }), /重新进入平台审核/);
  assert.match(getRiderVerificationStatusHint({}), /人工审核/);
  assert.equal(isValidRiderIdCardNumber("11010119900101123X"), true);
  assert.equal(isValidRiderIdCardNumber("11010119900101123Z"), false);
  assert.equal(maskRiderIdCardNumber("110101199001011234"), "110101********1234");
  assert.equal(maskRiderIdCardNumber(""), "未认证");
});

test("rider personal info page loads profile and updates editable fields", async () => {
  const updates = [];
  const toasts = [];
  const modals = [];
  let profile = {
    nickname: "旧昵称",
    real_name: "",
    id_card_number: "",
    is_verified: false,
  };
  const component = createRiderPersonalInfoPageLogic({
    async getRiderProfile() {
      return { data: profile };
    },
    async updateRiderProfile(payload) {
      updates.push(payload);
      profile = {
        ...profile,
        ...payload,
      };
    },
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
      showModal(payload) {
        modals.push(payload);
        const contentMap = {
          修改昵称: "新昵称",
          真实姓名: "张三",
          身份证号: "11010119900101123X",
        };
        payload.success({
          confirm: true,
          content: contentMap[payload.title] || "",
        });
      },
    },
  });
  const page = instantiatePage(component);

  await page.loadProfile();
  await page.editNickname();
  await page.editRealName();
  await page.editIDCard();

  assert.equal(page.profile.nickname, "新昵称");
  assert.equal(page.profile.real_name, "张三");
  assert.equal(page.profile.id_card_number, "11010119900101123X");
  assert.equal(page.verificationStatusText, "资料已保存，待平台审核");
  assert.deepEqual(updates, [
    { nickname: "新昵称" },
    { real_name: "张三" },
    { id_card_number: "11010119900101123X" },
  ]);
  assert.equal(modals.length, 3);
  assert.deepEqual(toasts, [
    { title: "更新成功", icon: "success" },
    { title: "更新成功", icon: "success" },
    { title: "更新成功", icon: "success" },
  ]);
});

test("rider personal info page rejects invalid id card input before update", async () => {
  const updates = [];
  const toasts = [];
  const component = createRiderPersonalInfoPageLogic({
    async getRiderProfile() {
      return {
        id_card_number: "",
      };
    },
    async updateRiderProfile(payload) {
      updates.push(payload);
    },
    uniApp: {
      showToast(payload) {
        toasts.push(payload);
      },
      showModal(payload) {
        payload.success({
          confirm: true,
          content: "invalid",
        });
      },
    },
  });
  const page = instantiatePage(component);

  await page.editIDCard();

  assert.deepEqual(updates, []);
  assert.deepEqual(toasts, [{ title: "身份证号格式错误", icon: "none" }]);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMedicineSupportModalCopy,
  buildMedicineSupportModalTitle,
  DEFAULT_MEDICINE_RUNTIME_SETTINGS,
  MEDICINE_HOME_TEXTS,
  normalizeMedicineRuntimeSettings,
  resolveMedicineHotlinePhone,
} from "./medicine-home.js";

test("medicine home helpers normalize runtime settings", () => {
  assert.deepEqual(normalizeMedicineRuntimeSettings(), {
    ...DEFAULT_MEDICINE_RUNTIME_SETTINGS,
  });
  assert.deepEqual(
    normalizeMedicineRuntimeSettings({
      service_phone: " 12345 ",
      medicine_support_phone: " 400-800 ",
      medicine_support_title: " 夜间热线 ",
      medicine_support_subtitle: " 24h 响应 ",
      medicine_delivery_description: " 送药\\n到家 ",
      medicine_season_tip: " 注意保暖 ",
    }),
    {
      service_phone: "12345",
      medicine_support_phone: "400-800",
      medicine_support_title: "夜间热线",
      medicine_support_subtitle: "24h 响应",
      medicine_delivery_description: "送药\n到家",
      medicine_season_tip: "注意保暖",
    },
  );
});

test("medicine home helpers keep hotline and modal copy stable", () => {
  assert.equal(
    resolveMedicineHotlinePhone({
      medicine_support_phone: " 400-800 ",
      service_phone: " 12345 ",
    }),
    "400-800",
  );
  assert.equal(
    resolveMedicineHotlinePhone({ service_phone: " 12345 " }),
    "12345",
  );
  assert.equal(
    buildMedicineSupportModalTitle(MEDICINE_HOME_TEXTS, {
      medicine_support_title: "夜间热线",
    }),
    "联系夜间热线",
  );
  assert.equal(
    buildMedicineSupportModalCopy(MEDICINE_HOME_TEXTS, "", {}),
    MEDICINE_HOME_TEXTS.supportModalFallback,
  );
  assert.equal(
    buildMedicineSupportModalCopy(
      MEDICINE_HOME_TEXTS,
      "400-800",
      { medicine_support_subtitle: "24h 响应" },
    ),
    "即将拨打 400-800\n24h 响应",
  );
});

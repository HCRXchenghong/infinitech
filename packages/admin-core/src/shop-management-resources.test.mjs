import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAdminShopBasicPayload,
  buildAdminShopImagePayload,
  buildAdminShopMenuPayload,
  buildAdminShopReviewPayload,
  buildAdminShopStaffPayload,
  buildAdminShopTagPayload,
  createAdminShopBasicFormState,
  createAdminShopImageFormState,
  createAdminShopMenuFormState,
  createAdminShopReviewFormState,
  createAdminShopReviewListParams,
  createAdminShopStaffFormState,
  createAdminShopTagFormState,
  createEmptyAdminShopReviewForm,
  formatAdminShopAge,
  formatAdminShopDate,
  formatAdminShopDateTime,
  getAdminFoodBusinessLicense,
  getAdminMerchantQualification,
  hasAdminShopStaffRecord,
  normalizeAdminShopDateValue,
  normalizeAdminShopDetail,
  normalizeAdminShopReview,
  normalizeAdminShopTextList,
  parseAdminShopImages,
  splitAdminShopText,
  validateAdminShopReviewForm,
  validateAdminShopStaffForm,
} from "./shop-management-resources.js";

test("shop management resources normalize shop detail presentation", () => {
  assert.deepEqual(normalizeAdminShopTextList('["口碑商家","配送快"]'), [
    "口碑商家",
    "配送快",
  ]);
  assert.deepEqual(normalizeAdminShopTextList("满减多, 深夜营业"), [
    "满减多",
    "深夜营业",
  ]);
  assert.deepEqual(splitAdminShopText("口碑商家,\n配送快，满减多"), [
    "口碑商家",
    "配送快",
    "满减多",
  ]);
  assert.deepEqual(parseAdminShopImages('["a.png","b.png"]'), [
    "a.png",
    "b.png",
  ]);
  assert.equal(
    getAdminMerchantQualification({ businessLicenseImage: " https://merchant.png " }),
    "https://merchant.png",
  );
  assert.equal(
    getAdminFoodBusinessLicense({ foodLicenseImage: " https://food.png " }),
    "https://food.png",
  );
  assert.deepEqual(
    normalizeAdminShopDetail({
      id: 12,
      name: " 旗舰店 ",
      phone: " 13800138000 ",
      merchant_type: "takeout",
      business_category_key: "food",
      business_category: "美食",
      rating: "4.8",
      monthly_sales: "20",
      business_hours: "09:00-21:00",
      isActive: 1,
      is_today_recommended: "true",
      today_recommend_position: "3",
      tags: '["口碑商家","配送快"]',
      discounts: "满减多,夜宵券",
      menu_notes: "推荐爆品",
      employee_name: " 李四 ",
      employee_age: "23",
      id_card_expire_at: "2026-05-01T12:30:00+08:00",
      employment_start_at: "2024-01-02T09:00:00+08:00",
      businessLicenseImage: "https://merchant.png",
      foodLicenseImage: "https://food.png",
    }),
    {
      id: 12,
      name: "旗舰店",
      phone: "13800138000",
      merchant_type: "takeout",
      business_category_key: "food",
      business_category: "美食",
      rating: 4.8,
      monthly_sales: "20",
      business_hours: "09:00-21:00",
      isActive: true,
      is_today_recommended: "true",
      today_recommend_position: "3",
      tags: ["口碑商家", "配送快"],
      discounts: ["满减多", "夜宵券"],
      menu_notes: "推荐爆品",
      employee_name: " 李四 ",
      employee_age: "23",
      id_card_expire_at: "2026-05-01T12:30:00+08:00",
      employment_start_at: "2024-01-02T09:00:00+08:00",
      businessLicenseImage: "https://merchant.png",
      foodLicenseImage: "https://food.png",
      orderType: "",
      merchantType: "takeout",
      businessCategoryKey: "food",
      businessCategory: "美食",
      category: "",
      monthlySales: 20,
      businessHours: "09:00-21:00",
      address: "",
      announcement: "",
      isTodayRecommended: true,
      todayRecommendPosition: 3,
      merchantQualification: "https://merchant.png",
      foodBusinessLicense: "https://food.png",
      logo: "",
      coverImage: "",
      backgroundImage: "",
      menuNotes: "推荐爆品",
      employeeName: "李四",
      employeeAge: 23,
      employeePosition: "",
      idCardFrontImage: "",
      idCardBackImage: "",
      idCardExpireAt: "2026-05-01",
      healthCertFrontImage: "",
      healthCertBackImage: "",
      healthCertExpireAt: "",
      employmentStartAt: "2024-01-02",
      employmentEndAt: "",
    },
  );
});

test("shop management resources create stable admin shop form states and payloads", () => {
  assert.deepEqual(
    createAdminShopReviewListParams({ page: "2", pageSize: "50" }),
    { page: 2, pageSize: 50 },
  );

  assert.deepEqual(
    createAdminShopBasicFormState(
      {
        name: "旗舰店",
        todayRecommendPosition: 0,
        merchantQualification: "https://merchant.png",
      },
      {
        merchantTypeOption: { key: "takeout", legacyOrderTypeLabel: "外卖类" },
        businessCategoryOption: { key: "food", label: "美食" },
      },
    ),
    {
      name: "旗舰店",
      phone: "",
      orderType: "外卖类",
      merchantType: "takeout",
      businessCategoryKey: "food",
      businessCategory: "美食",
      rating: 0,
      monthlySales: 0,
      businessHours: "",
      address: "",
      announcement: "",
      isActive: false,
      isTodayRecommended: false,
      todayRecommendPosition: 1,
      merchantQualification: "https://merchant.png",
      foodBusinessLicense: "",
    },
  );

  assert.deepEqual(
    buildAdminShopBasicPayload(
      {
        name: " 旗舰店 ",
        phone: " 13800138000 ",
        rating: "4.5",
        monthlySales: "88",
        businessHours: "09:00-21:00",
        address: " 软件园 ",
        announcement: " 欢迎光临 ",
        isActive: 1,
        isTodayRecommended: true,
        todayRecommendPosition: "4",
        merchantQualification: " https://merchant.png ",
        foodBusinessLicense: " https://food.png ",
      },
      {
        merchantTypeOption: { key: "takeout", legacyOrderTypeLabel: "外卖类" },
        businessCategoryOption: { key: "food", label: "美食" },
      },
    ),
    {
      name: "旗舰店",
      phone: "13800138000",
      orderType: "外卖类",
      merchantType: "takeout",
      businessCategoryKey: "food",
      businessCategory: "美食",
      rating: 4.5,
      monthlySales: 88,
      businessHours: "09:00-21:00",
      address: "软件园",
      announcement: "欢迎光临",
      isActive: true,
      isTodayRecommended: true,
      todayRecommendPosition: 4,
      merchantQualification: "https://merchant.png",
      foodBusinessLicense: "https://food.png",
    },
  );

  assert.deepEqual(createAdminShopImageFormState({ logo: "a", coverImage: "b" }), {
    logo: "a",
    coverImage: "b",
    backgroundImage: "",
  });
  assert.deepEqual(buildAdminShopImagePayload({ logo: " a ", coverImage: " b " }), {
    logo: "a",
    coverImage: "b",
    backgroundImage: "",
  });

  assert.deepEqual(
    createAdminShopTagFormState({ tags: ["口碑商家"], discounts: ["满减多"] }),
    { tagsText: "口碑商家", discountsText: "满减多" },
  );
  assert.deepEqual(buildAdminShopTagPayload({ tagsText: "口碑商家,配送快", discountsText: "满减多\n夜宵券" }), {
    tags: ["口碑商家", "配送快"],
    discounts: ["满减多", "夜宵券"],
  });

  assert.deepEqual(createAdminShopMenuFormState({ menuNotes: "推荐爆品" }), {
    menuNotes: "推荐爆品",
  });
  assert.deepEqual(buildAdminShopMenuPayload({ menuNotes: " 推荐爆品 " }), {
    menuNotes: "推荐爆品",
  });
});

test("shop management resources validate staff forms and preserve display semantics", () => {
  assert.equal(formatAdminShopDateTime("2026-04-16T12:34:00+08:00"), "2026-04-16 12:34");
  assert.equal(formatAdminShopDate("2026-04-16T12:34:00+08:00"), "2026-04-16");
  assert.equal(normalizeAdminShopDateValue("2026-04-16T12:34:00+08:00"), "2026-04-16");
  assert.equal(formatAdminShopAge(23), "23 岁");
  assert.equal(formatAdminShopAge(0), "-");

  assert.deepEqual(createAdminShopStaffFormState({ employeeName: "张三" }), {
    employeeName: "张三",
    employeeAge: 0,
    employeePosition: "",
    idCardFrontImage: "",
    idCardBackImage: "",
    idCardExpireAt: "",
    healthCertFrontImage: "",
    healthCertBackImage: "",
    healthCertExpireAt: "",
    employmentStartAt: "",
    employmentEndAt: "",
  });
  assert.equal(hasAdminShopStaffRecord({ employeePosition: "店长" }), true);
  assert.equal(hasAdminShopStaffRecord({}), false);

  assert.deepEqual(validateAdminShopStaffForm({}), {
    valid: false,
    message: "请填写员工姓名",
    normalized: {
      employeeName: "",
      employeeAge: 0,
      employeePosition: "",
      idCardFrontImage: "",
      idCardBackImage: "",
      idCardExpireAt: "",
      healthCertFrontImage: "",
      healthCertBackImage: "",
      healthCertExpireAt: "",
      employmentStartAt: "",
      employmentEndAt: "",
    },
  });

  assert.deepEqual(
    validateAdminShopStaffForm({
      employeeName: "张三",
      employeeAge: -1,
    }),
    {
      valid: false,
      message: "年龄不能小于 0",
      normalized: {
        employeeName: "张三",
        employeeAge: -1,
        employeePosition: "",
        idCardFrontImage: "",
        idCardBackImage: "",
        idCardExpireAt: "",
        healthCertFrontImage: "",
        healthCertBackImage: "",
        healthCertExpireAt: "",
        employmentStartAt: "",
        employmentEndAt: "",
      },
    },
  );

  assert.deepEqual(
    validateAdminShopStaffForm({
      employeeName: "张三",
      employeeAge: 20,
      employmentStartAt: "2026-05-02",
      employmentEndAt: "2026-05-01",
    }),
    {
      valid: false,
      message: "离职时间不能早于入职时间",
      normalized: {
        employeeName: "张三",
        employeeAge: 20,
        employeePosition: "",
        idCardFrontImage: "",
        idCardBackImage: "",
        idCardExpireAt: "",
        healthCertFrontImage: "",
        healthCertBackImage: "",
        healthCertExpireAt: "",
        employmentStartAt: "2026-05-02",
        employmentEndAt: "2026-05-01",
      },
    },
  );

  assert.deepEqual(
    buildAdminShopStaffPayload({
      employeeName: " 张三 ",
      employeeAge: "21.9",
      employeePosition: " 店长 ",
      idCardExpireAt: "2026-05-01T12:34:00+08:00",
    }),
    {
      employeeName: "张三",
      employeeAge: 21,
      employeePosition: "店长",
      idCardFrontImage: "",
      idCardBackImage: "",
      idCardExpireAt: "2026-05-01",
      healthCertFrontImage: "",
      healthCertBackImage: "",
      healthCertExpireAt: null,
      employmentStartAt: null,
      employmentEndAt: null,
    },
  );
});

test("shop management resources normalize reviews and build stable review payloads", () => {
  assert.deepEqual(createEmptyAdminShopReviewForm(), {
    userId: "",
    orderId: "",
    userName: "",
    userAvatar: "",
    rating: 5,
    content: "",
    images: [],
    reply: "",
  });

  assert.deepEqual(
    normalizeAdminShopReview(
      {
        id: 9,
        user_id: 88,
        order_id: 66,
        user_name: " 张三 ",
        user_avatar: " https://avatar.png ",
        rating: "4.5",
        content: " 很好 ",
        reply: " 欢迎再来 ",
        images: '["a.png","b.png"]',
        created_at: "2026-04-16T12:34:00+08:00",
      },
      "shop-1",
    ),
    {
      id: "9",
      shopId: "shop-1",
      userId: "88",
      orderId: "66",
      userName: "张三",
      userAvatar: "https://avatar.png",
      rating: 4.5,
      content: "很好",
      reply: "欢迎再来",
      images: ["a.png", "b.png"],
      createdAt: "2026-04-16T12:34:00+08:00",
    },
  );

  assert.deepEqual(
    createAdminShopReviewFormState({
      id: 1,
      userName: "张三",
      rating: 0,
      content: "好评",
      images: "img-a,img-b",
    }),
    {
      userId: "",
      orderId: "",
      userName: "张三",
      userAvatar: "",
      rating: 5,
      content: "好评",
      images: ["img-a", "img-b"],
      reply: "",
      id: "1",
      shopId: "",
      createdAt: "",
    },
  );

  assert.deepEqual(validateAdminShopReviewForm({ content: "" }), {
    valid: false,
    message: "评论内容不能为空",
    normalized: {
      userId: "",
      orderId: "",
      userName: "",
      userAvatar: "",
      rating: 0,
      content: "",
      images: [],
      reply: "",
      id: "",
      shopId: "",
      createdAt: "",
    },
  });

  assert.deepEqual(
    validateAdminShopReviewForm({ content: "好评", rating: 6 }),
    {
      valid: false,
      message: "评分范围必须在 1 - 5 之间",
      normalized: {
        userId: "",
        orderId: "",
        userName: "",
        userAvatar: "",
        rating: 6,
        content: "好评",
        images: [],
        reply: "",
        id: "",
        shopId: "",
        createdAt: "",
      },
    },
  );

  assert.deepEqual(
    buildAdminShopReviewPayload(
      {
        userId: " 88 ",
        orderId: " 66 ",
        userName: " ",
        userAvatar: " https://avatar.png ",
        rating: "4.5",
        content: " 很好 ",
        images: '["a.png","b.png"]',
        reply: " 欢迎再来 ",
      },
      "shop-1",
    ),
    {
      shopId: "shop-1",
      userId: "88",
      orderId: "66",
      userName: "匿名用户",
      userAvatar: "https://avatar.png",
      rating: 4.5,
      content: "很好",
      images: ["a.png", "b.png"],
      reply: "欢迎再来",
    },
  );
});

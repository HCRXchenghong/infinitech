import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConsumerProfileReviewQuery,
  buildConsumerProfileReviewShopPath,
  countConsumerProfileReviewsWithImages,
  countConsumerProfileReviewsWithReply,
  createProfileMyReviewsPage,
  extractConsumerProfileReviewPage,
  filterConsumerProfileReviews,
  formatConsumerProfileReviewDate,
  formatConsumerProfileReviewRating,
  normalizeConsumerProfileReviewErrorMessage,
  normalizeConsumerProfileReviewImages,
  normalizeConsumerProfileReviewItem,
  renderConsumerProfileReviewStars,
  resolveConsumerProfileReviewUserIds,
} from "./profile-my-reviews.js";

test("profile my reviews helpers normalize identity and queries", () => {
  assert.deepEqual(
    resolveConsumerProfileReviewUserIds({
      profile: { id: "user-1", phone: "13800000000" },
      storageUserId: "user-1",
    }),
    ["user-1", "13800000000"],
  );
  assert.deepEqual(buildConsumerProfileReviewQuery("2", "30"), {
    page: 2,
    pageSize: 30,
  });
  assert.equal(
    buildConsumerProfileReviewShopPath("shop 1"),
    "/pages/shop/detail/index?id=shop%201",
  );
});

test("profile my reviews helpers normalize pages and presentation", () => {
  assert.deepEqual(normalizeConsumerProfileReviewImages('["a.png","b.png"]'), [
    "a.png",
    "b.png",
  ]);
  assert.deepEqual(
    normalizeConsumerProfileReviewItem(
      {
        id: "review-1",
        shop_id: "shop-1",
        shop_name: "",
        rating: "4.2",
        images: "cover.png",
        content: "",
        created_at: "2026-04-16T10:00:00Z",
      },
      0,
    ),
    {
      id: "review-1",
      shopId: "shop-1",
      shopName: "商家",
      shopLogo: "",
      shopCoverImage: "",
      rating: 4.2,
      images: ["cover.png"],
      content: "未填写文字评价",
      reply: "",
      createdAt: "2026-04-16T10:00:00Z",
      created_at: "2026-04-16T10:00:00Z",
    },
  );
  assert.deepEqual(
    extractConsumerProfileReviewPage({
      data: {
        list: [
          {
            id: "review-2",
            shopId: "shop-2",
            shopName: "店铺 2",
            rating: 5,
            images: ["1.png"],
            reply: "感谢支持",
          },
        ],
        total: 8,
        avgRating: "4.6",
      },
    }),
    {
      list: [
        {
          id: "review-2",
          shopId: "shop-2",
          shopName: "店铺 2",
          shopLogo: "",
          shopCoverImage: "",
          rating: 5,
          images: ["1.png"],
          content: "未填写文字评价",
          reply: "感谢支持",
          createdAt: "",
          created_at: "",
        },
      ],
      total: 8,
      avgRating: 4.6,
    },
  );
  assert.equal(formatConsumerProfileReviewRating("4.28"), "4.3");
  assert.equal(renderConsumerProfileReviewStars(3.6), "★★★★☆");
  assert.equal(formatConsumerProfileReviewDate("2026-04-16T10:00:00Z"), "2026-04-16");
});

test("profile my reviews helpers filter reviews and normalize errors", () => {
  const reviews = [
    { id: "1", images: ["a.png"], reply: "" },
    { id: "2", images: [], reply: "谢谢" },
    { id: "3", images: [], reply: "" },
  ];
  assert.deepEqual(
    filterConsumerProfileReviews(reviews, "with_images").map((item) => item.id),
    ["1"],
  );
  assert.deepEqual(
    filterConsumerProfileReviews(reviews, "with_reply").map((item) => item.id),
    ["2"],
  );
  assert.equal(countConsumerProfileReviewsWithImages(reviews), 1);
  assert.equal(countConsumerProfileReviewsWithReply(reviews), 1);
  assert.equal(
    normalizeConsumerProfileReviewErrorMessage(
      { response: { data: { error: "读取失败" } } },
      "fallback",
    ),
    "读取失败",
  );
});

test("profile my reviews page picks the first non-empty identity and opens preview routes", async () => {
  const previews = [];
  const navigation = [];
  const originalUni = globalThis.uni;

  globalThis.uni = {
    getStorageSync(key) {
      if (key === "userProfile") {
        return { id: "user-1", phone: "13812345678" };
      }
      if (key === "userId") {
        return "";
      }
      return null;
    },
    showToast() {},
    previewImage(payload) {
      previews.push(payload);
    },
    navigateTo({ url }) {
      navigation.push(url);
    },
  };

  try {
    const page = createProfileMyReviewsPage({
      fetchUserReviews: async (userId) => {
        if (userId === "user-1") {
          return { data: { list: [], total: 0, avgRating: 0 } };
        }
        return {
          data: {
            list: [
              {
                id: "review-1",
                shopId: "shop-2",
                shopName: "店铺 2",
                images: ["https://example.com/review.png"],
              },
            ],
            total: 1,
            avgRating: 4.8,
          },
        };
      },
    });
    const instance = {
      ...page.data(),
      ...page.methods,
      userId: "user-1",
      userIdCandidates: ["user-1", "13812345678"],
    };

    await instance.loadReviews(true);
    instance.previewImage(["https://example.com/review.png"], 0);
    instance.goShop("shop-2");

    assert.equal(instance.userId, "13812345678");
    assert.equal(instance.reviews.length, 1);
    assert.equal(instance.avgRating, 4.8);
    assert.equal(previews[0].current, "https://example.com/review.png");
    assert.deepEqual(navigation, ["/pages/shop/detail/index?id=shop-2"]);
  } finally {
    globalThis.uni = originalUni;
  }
});

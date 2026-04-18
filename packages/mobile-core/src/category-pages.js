function trimCategoryPageText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeDecodeCategoryPageText(value) {
  const text = trimCategoryPageText(value);
  if (!text) {
    return "";
  }

  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

function toCategoryPageNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCategoryPageKeywords(keywords) {
  const source = Array.isArray(keywords) ? keywords : [keywords];
  return Array.from(
    new Set(
      source
        .map((keyword) => trimCategoryPageText(keyword))
        .filter(Boolean),
    ),
  );
}

function normalizeCategoryPageTags(tags) {
  if (Array.isArray(tags)) {
    return tags
      .map((tag) => trimCategoryPageText(tag))
      .filter(Boolean);
  }

  const singleTag = trimCategoryPageText(tags);
  return singleTag ? [singleTag] : [];
}

export function createCategoryPageFilters() {
  return [
    { key: "default", label: "综合排序" },
    { key: "sales", label: "销量最高", sortable: true },
    { key: "rating", label: "评分最高", sortable: true },
    { key: "distance", label: "距离最近", sortable: true },
  ].map((filter) => ({ ...filter }));
}

export function createDefaultCategoryPageConfig() {
  return {
    title: "全部分类",
    keywords: [],
    matchAll: true,
    queryKey: "category",
    fallbackTitle: "全部分类",
  };
}

export function normalizeCategoryPageConfig(config = {}, query = {}) {
  const baseConfig = createDefaultCategoryPageConfig();
  const queryKey = trimCategoryPageText(config.queryKey) || baseConfig.queryKey;
  const fallbackTitle =
    trimCategoryPageText(config.fallbackTitle) || baseConfig.fallbackTitle;
  const fixedTitle = trimCategoryPageText(config.title);
  const queryTitle = safeDecodeCategoryPageText(query?.[queryKey]);
  const title = fixedTitle || queryTitle || fallbackTitle;
  let keywords = normalizeCategoryPageKeywords(config.keywords);

  if (keywords.length === 0 && (fixedTitle || queryTitle)) {
    keywords = normalizeCategoryPageKeywords([title]);
  }

  return {
    title,
    keywords,
    matchAll: Boolean(config.matchAll) || keywords.length === 0,
    queryKey,
    fallbackTitle,
  };
}

export function matchesCategoryPageShop(shop = {}, categoryConfig = {}) {
  const resolvedConfig = normalizeCategoryPageConfig(categoryConfig);
  if (resolvedConfig.matchAll) {
    return true;
  }

  const categoryTexts = [
    trimCategoryPageText(shop?.businessCategory),
    trimCategoryPageText(shop?.category),
  ].filter(Boolean);
  const tags = normalizeCategoryPageTags(shop?.tags);

  return resolvedConfig.keywords.some((keyword) => {
    if (!keyword) {
      return false;
    }

    if (
      categoryTexts.some(
        (categoryText) =>
          categoryText.includes(keyword) || keyword.includes(categoryText),
      )
    ) {
      return true;
    }

    return tags.some((tag) => tag.includes(keyword) || keyword.includes(tag));
  });
}

export function sortCategoryPageShops(shops = [], activeFilter = "default") {
  const list = Array.isArray(shops) ? [...shops] : [];
  switch (trimCategoryPageText(activeFilter)) {
    case "sales":
      list.sort(
        (left, right) =>
          toCategoryPageNumber(right?.monthlySales) -
          toCategoryPageNumber(left?.monthlySales),
      );
      break;
    case "rating":
      list.sort(
        (left, right) =>
          toCategoryPageNumber(right?.rating) -
          toCategoryPageNumber(left?.rating),
      );
      break;
    case "distance":
      list.sort(
        (left, right) =>
          toCategoryPageNumber(left?.distance, Number.POSITIVE_INFINITY) -
          toCategoryPageNumber(right?.distance, Number.POSITIVE_INFINITY),
      );
      break;
    default:
      break;
  }
  return list;
}

export function normalizeCategoryPageShopCollection(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.list)) {
    return response.list;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  return [];
}

function resolveCategoryPageUniApp(uniApp) {
  return uniApp || globalThis.uni || {};
}

export function createCategoryPage(options = {}) {
  const fetchShops =
    typeof options.fetchShops === "function"
      ? options.fetchShops
      : async () => [];
  const resolveCategoryConfig =
    typeof options.resolveCategoryConfig === "function"
      ? options.resolveCategoryConfig
      : (query) => query;
  const uniApp = resolveCategoryPageUniApp(options.uniApp);
  const components =
    options.components && typeof options.components === "object"
      ? options.components
      : undefined;

  return {
    components,
    data() {
      return {
        categoryConfig: createDefaultCategoryPageConfig(),
        allShops: [],
        loading: false,
        activeFilter: "default",
        filters: createCategoryPageFilters(),
      };
    },
    computed: {
      pageTitle() {
        return this.categoryConfig.title;
      },
      filteredShops() {
        const filteredShops = (Array.isArray(this.allShops) ? this.allShops : []).filter(
          (shop) => matchesCategoryPageShop(shop, this.categoryConfig),
        );
        return sortCategoryPageShops(filteredShops, this.activeFilter);
      },
    },
    onLoad(query = {}) {
      const resolvedConfig = resolveCategoryConfig(query, this) || {};
      this.categoryConfig = normalizeCategoryPageConfig(resolvedConfig, query);
      return this.loadShops();
    },
    methods: {
      async loadShops() {
        if (this.loading) {
          return;
        }

        this.loading = true;
        try {
          const response = await fetchShops();
          this.allShops = normalizeCategoryPageShopCollection(response);
        } catch (error) {
          console.error("加载商家列表失败:", error);
          this.allShops = [];
        } finally {
          this.loading = false;
        }
      },
      goSearch() {
        uniApp.navigateTo?.({ url: "/pages/search/index/index" });
      },
      setFilter(key) {
        this.activeFilter = trimCategoryPageText(key) || "default";
      },
      goShopDetail(id) {
        uniApp.navigateTo?.({ url: `/pages/shop/detail/index?id=${id}` });
      },
    },
  };
}

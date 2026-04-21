function normalizeBoolean(value, fallback = true) {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value !== '0' && value.toLowerCase() !== 'false';
  }
  return value !== false && value !== 0;
}

function normalizeNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim()).filter(Boolean);
      }
    } catch {
      return tags.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

export function createDefaultCategoryForm() {
  return {
    id: null,
    name: '',
    sortOrder: 0,
    isActive: true
  };
}

export function normalizeCategoryRecord(category = {}) {
  return {
    ...category,
    id: category.id ?? category.categoryId ?? null,
    name: String(category.name || '').trim(),
    sortOrder: normalizeNumber(category.sortOrder ?? category.sort_order, 0),
    isActive: normalizeBoolean(category.isActive ?? category.is_active, true)
  };
}

export function buildCategoryForm(category = null) {
  if (!category) {
    return createDefaultCategoryForm();
  }
  const current = normalizeCategoryRecord(category);
  return {
    id: current.id,
    name: current.name,
    sortOrder: current.sortOrder,
    isActive: current.isActive
  };
}

export function validateCategoryForm(categoryForm = {}) {
  if (!String(categoryForm.name || '').trim()) {
    return '请输入分类名称';
  }
  return '';
}

export function buildCategoryPayload(categoryForm = {}, context = {}) {
  return {
    shopId: context.shopId,
    name: String(categoryForm.name || '').trim(),
    sortOrder: normalizeNumber(categoryForm.sortOrder, 0),
    isActive: normalizeBoolean(categoryForm.isActive, true)
  };
}

export function createDefaultProductForm() {
  return {
    id: null,
    name: '',
    description: '',
    image: '',
    price: 0,
    originalPrice: 0,
    monthlySales: 0,
    stock: 999,
    unit: '份',
    tagsText: '',
    isRecommend: false,
    isActive: true,
    sortOrder: 0
  };
}

export function normalizeProductRecord(product = {}) {
  return {
    ...product,
    id: product.id ?? product.productId ?? null,
    name: String(product.name || '').trim(),
    description: product.description || '',
    image: product.image || product.image_url || '',
    price: normalizeNumber(product.price, 0),
    originalPrice: normalizeNumber(product.originalPrice ?? product.original_price, 0),
    monthlySales: normalizeNumber(product.monthlySales ?? product.monthly_sales, 0),
    stock: normalizeNumber(product.stock, 999),
    unit: product.unit || '份',
    tags: normalizeTags(product.tags),
    isRecommend: normalizeBoolean(product.isRecommend ?? product.is_recommend, false),
    isActive: normalizeBoolean(product.isActive ?? product.is_active, true),
    sortOrder: normalizeNumber(product.sortOrder ?? product.sort_order, 0)
  };
}

export function buildProductForm(product = null) {
  if (!product) {
    return createDefaultProductForm();
  }
  const current = normalizeProductRecord(product);
  return {
    id: current.id,
    name: current.name,
    description: current.description,
    image: current.image,
    price: current.price,
    originalPrice: current.originalPrice,
    monthlySales: current.monthlySales,
    stock: current.stock,
    unit: current.unit,
    tagsText: current.tags.join(','),
    isRecommend: current.isRecommend,
    isActive: current.isActive,
    sortOrder: current.sortOrder
  };
}

export function validateProductForm(productForm = {}) {
  if (!String(productForm.name || '').trim()) {
    return '请输入商品名称';
  }
  if (normalizeNumber(productForm.price, 0) <= 0) {
    return '请输入有效的价格';
  }
  return '';
}

export function buildProductPayload(productForm = {}, context = {}) {
  const tags = String(productForm.tagsText || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    shopId: context.shopId,
    categoryId: context.categoryId,
    name: String(productForm.name || '').trim(),
    description: productForm.description || '',
    image: productForm.image || '',
    images: JSON.stringify([]),
    price: normalizeNumber(productForm.price, 0),
    originalPrice: normalizeNumber(productForm.originalPrice, 0),
    monthlySales: normalizeNumber(productForm.monthlySales, 0),
    stock: normalizeNumber(productForm.stock, 999),
    unit: productForm.unit || '份',
    tags: JSON.stringify(tags),
    isRecommend: normalizeBoolean(productForm.isRecommend, false),
    isActive: normalizeBoolean(productForm.isActive, true),
    sortOrder: normalizeNumber(productForm.sortOrder, 0)
  };
}

export function createDefaultCategoryForm() {
  return {
    id: null,
    name: '',
    sortOrder: 0,
    isActive: true
  };
}

export function buildCategoryForm(category = null) {
  if (!category) {
    return createDefaultCategoryForm();
  }
  return {
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder || 0,
    isActive: category.isActive !== false
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

export function buildProductForm(product = null) {
  if (!product) {
    return createDefaultProductForm();
  }
  const tags = Array.isArray(product.tags) ? product.tags : [];
  return {
    id: product.id,
    name: product.name || '',
    description: product.description || '',
    image: product.image || '',
    price: product.price || 0,
    originalPrice: product.originalPrice || 0,
    monthlySales: product.monthlySales || 0,
    stock: product.stock || 999,
    unit: product.unit || '份',
    tagsText: tags.join(','),
    isRecommend: product.isRecommend === true,
    isActive: product.isActive !== false,
    sortOrder: product.sortOrder || 0
  };
}

export function buildProductPayload(productForm, context) {
  const tags = String(productForm.tagsText || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    shopId: context.shopId,
    categoryId: context.categoryId,
    name: productForm.name,
    description: productForm.description || '',
    image: productForm.image || '',
    images: JSON.stringify([]),
    price: productForm.price,
    originalPrice: productForm.originalPrice || 0,
    monthlySales: productForm.monthlySales || 0,
    stock: productForm.stock || 999,
    unit: productForm.unit || '份',
    tags: JSON.stringify(tags),
    isRecommend: productForm.isRecommend,
    isActive: productForm.isActive,
    sortOrder: productForm.sortOrder || 0
  };
}

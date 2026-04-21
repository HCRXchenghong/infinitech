import { onMounted, reactive, ref } from 'vue';
import { normalizeAdminShopTextList } from '@infinitech/admin-core';
import {
  buildBusinessCategoryOptions,
  buildMerchantTypeOptions,
  loadMerchantTaxonomySettings,
  resolveBusinessCategoryOption,
  resolveMerchantTypeOption,
} from '@/utils/platform-settings';

function normalizeMerchantType(value) {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'groupbuy' || text === '团购类' || text === '团购') {
    return 'groupbuy';
  }
  if (text === 'hybrid' || text === '混合类' || text === '混合') {
    return 'hybrid';
  }
  return 'takeout';
}

function merchantTypeFromOrderType(orderType) {
  const text = String(orderType || '').trim();
  if (text === '团购类') {
    return 'groupbuy';
  }
  if (text === '混合类') {
    return 'hybrid';
  }
  return 'takeout';
}

export function useShopEditor({ ElMessage, emit, props }) {
  const activeTab = ref('basic');
  const saving = ref(false);
  const merchantTaxonomySettings = ref(null);
  const merchantTypeOptions = ref(buildMerchantTypeOptions());
  const businessCategoryOptions = ref(buildBusinessCategoryOptions());

  function orderTypeFromMerchantType(merchantType) {
    return resolveMerchantTypeOption(
      merchantType,
      merchantTaxonomySettings.value,
    ).legacyOrderTypeLabel;
  }

  const initialMerchantType = resolveMerchantTypeOption(
    props.shop?.merchantType || props.shop?.orderType,
  );
  const initialBusinessCategory = resolveBusinessCategoryOption(
    props.shop?.businessCategoryKey || props.shop?.businessCategory || props.shop?.category,
  );

  const formData = reactive({
    id: props.shop?.id || null,
    name: props.shop?.name || '',
    orderType: props.shop?.orderType || initialMerchantType.legacyOrderTypeLabel || '外卖类',
    merchantType: normalizeMerchantType(
      props.shop?.merchantType
        || merchantTypeFromOrderType(props.shop?.orderType)
        || initialMerchantType.key,
    ),
    businessCategoryKey: initialBusinessCategory.key || 'food',
    businessCategory: initialBusinessCategory.label || '美食',
    phone: props.shop?.phone || '',
    address: props.shop?.address || '',
    businessHours: props.shop?.businessHours || '09:00-22:00',
    announcement: props.shop?.announcement || '',
    rating: props.shop?.rating || 5.0,
    monthlySales: props.shop?.monthlySales || 0,
    perCapita: props.shop?.perCapita || 0,
    minPrice: props.shop?.minPrice || 0,
    deliveryPrice: props.shop?.deliveryPrice || 0,
    deliveryTime: props.shop?.deliveryTime || '30分钟',
    coverImage: props.shop?.coverImage || '',
    backgroundImage: props.shop?.backgroundImage || '',
    logo: props.shop?.logo || '',
    tags: normalizeAdminShopTextList(props.shop?.tags),
    discounts: normalizeAdminShopTextList(props.shop?.discounts),
    isBrand: props.shop?.isBrand || false,
    isFranchise: props.shop?.isFranchise || false,
    isActive: props.shop?.isActive !== undefined ? props.shop.isActive : true,
  });

  function handleOrderTypeChange(value) {
    const selected = resolveMerchantTypeOption(value, merchantTaxonomySettings.value);
    formData.orderType = selected.legacyOrderTypeLabel;
    formData.merchantType = selected.key;
  }

  function handleMerchantTypeChange(value) {
    const selected = resolveMerchantTypeOption(value, merchantTaxonomySettings.value);
    formData.merchantType = selected.key;
    formData.orderType = selected.legacyOrderTypeLabel;
  }

  function handleBusinessCategoryChange(value) {
    const selected = resolveBusinessCategoryOption(value, merchantTaxonomySettings.value);
    formData.businessCategoryKey = selected.key;
    formData.businessCategory = selected.label;
  }

  async function loadTaxonomySettings(forceRefresh = false) {
    const settings = await loadMerchantTaxonomySettings(forceRefresh);
    merchantTaxonomySettings.value = settings;
    merchantTypeOptions.value = buildMerchantTypeOptions(settings);
    businessCategoryOptions.value = buildBusinessCategoryOptions(settings);
    handleMerchantTypeChange(formData.merchantType || formData.orderType);
    handleBusinessCategoryChange(formData.businessCategoryKey || formData.businessCategory);
  }

  function handleSave() {
    if (!formData.name) {
      ElMessage.warning('请输入店铺名称');
      return;
    }

    saving.value = true;
    try {
      const shopData = {
        ...formData,
        merchantType: normalizeMerchantType(formData.merchantType),
        orderType: orderTypeFromMerchantType(formData.merchantType),
        businessCategoryKey: formData.businessCategoryKey,
        businessCategory: formData.businessCategory,
        tags: JSON.stringify(formData.tags),
        discounts: JSON.stringify(formData.discounts),
      };
      emit('save', shopData);
    } finally {
      saving.value = false;
    }
  }

  onMounted(() => {
    void loadTaxonomySettings();
  });

  return {
    activeTab,
    businessCategoryOptions,
    formData,
    handleBusinessCategoryChange,
    handleMerchantTypeChange,
    handleOrderTypeChange,
    handleSave,
    merchantTypeOptions,
    saving,
  };
}

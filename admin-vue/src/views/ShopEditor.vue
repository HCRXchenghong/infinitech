<template>
  <div class="shop-editor">
    <el-form :model="formData" label-width="120px" size="small">
      <el-tabs v-model="activeTab" type="card">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="basic">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="店铺名称" required>
                <el-input v-model="formData.name" placeholder="请输入店铺名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系电话">
                <el-input v-model="formData.phone" placeholder="请输入联系电话" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="订单类型" required>
                <el-select v-model="formData.orderType" placeholder="请选择订单类型" style="width: 100%;" @change="handleOrderTypeChange">
                  <el-option
                    v-for="option in merchantTypeOptions"
                    :key="option.key"
                    :label="option.orderTypeLabel"
                    :value="option.legacyOrderTypeLabel"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="商户类型" required>
                <el-select v-model="formData.merchantType" placeholder="请选择商户类型" style="width: 100%;" @change="handleMerchantTypeChange">
                  <el-option
                    v-for="option in merchantTypeOptions"
                    :key="option.key"
                    :label="option.label"
                    :value="option.key"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="业务分类" required>
                <el-select v-model="formData.businessCategoryKey" placeholder="请选择业务分类" style="width: 100%;" @change="handleBusinessCategoryChange">
                  <el-option
                    v-for="option in businessCategoryOptions"
                    :key="option.key"
                    :label="option.label"
                    :value="option.key"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="店铺地址">
            <el-input v-model="formData.address" placeholder="请输入店铺地址" />
          </el-form-item>

          <el-form-item label="营业时间">
            <el-input v-model="formData.businessHours" placeholder="如: 09:00-22:00" />
          </el-form-item>

          <el-form-item label="公告">
            <el-input
              v-model="formData.announcement"
              type="textarea"
              :rows="3"
              placeholder="请输入店铺公告"
            />
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="评分">
                <el-input-number v-model="formData.rating" :min="0" :max="5" :step="0.1" :precision="1" style="width: 100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="月销量">
                <el-input-number v-model="formData.monthlySales" :min="0" style="width: 100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="人均消费">
                <el-input-number v-model="formData.perCapita" :min="0" :precision="2" style="width: 100%;" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="起送金额">
                <el-input-number v-model="formData.minPrice" :min="0" :precision="2" style="width: 100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="配送费">
                <el-input-number v-model="formData.deliveryPrice" :min="0" :precision="2" style="width: 100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="配送时间">
                <el-input v-model="formData.deliveryTime" placeholder="如: 30分钟" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="品牌店铺">
                <el-switch v-model="formData.isBrand" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="加盟店铺">
                <el-switch v-model="formData.isFranchise" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="营业状态">
                <el-switch v-model="formData.isActive" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-tab-pane>

        <!-- 图片设置 -->
        <el-tab-pane label="图片设置" name="images">
          <el-form-item label="封面图">
            <ImageUpload v-model="formData.coverImage" upload-domain="shop_media" />
            <div style="color: #909399; font-size: 12px; margin-top: 4px;">
              店铺列表展示的封面图
            </div>
          </el-form-item>

          <el-form-item label="背景图">
            <ImageUpload v-model="formData.backgroundImage" upload-domain="shop_media" />
            <div style="color: #909399; font-size: 12px; margin-top: 4px;">
              店铺详情页顶部背景图
            </div>
          </el-form-item>

          <el-form-item label="Logo">
            <ImageUpload v-model="formData.logo" upload-domain="shop_media" />
            <div style="color: #909399; font-size: 12px; margin-top: 4px;">
              店铺Logo图标
            </div>
          </el-form-item>
        </el-tab-pane>

        <!-- 标签与优惠 -->
        <el-tab-pane label="标签与优惠" name="tags">
          <el-form-item label="店铺标签">
            <el-tag
              v-for="(tag, index) in formData.tags"
              :key="index"
              closable
              @close="removeTag(index)"
              style="margin-right: 8px; margin-bottom: 8px;"
            >
              {{ tag }}
            </el-tag>
            <el-input
              v-if="tagInputVisible"
              ref="tagInputRef"
              v-model="tagInputValue"
              size="small"
              style="width: 120px;"
              @keyup.enter="handleTagInputConfirm"
              @blur="handleTagInputConfirm"
            />
            <el-button v-else size="small" @click="showTagInput">+ 添加标签</el-button>
          </el-form-item>

          <el-form-item label="满减优惠">
            <el-tag
              v-for="(discount, index) in formData.discounts"
              :key="index"
              closable
              type="success"
              @close="removeDiscount(index)"
              style="margin-right: 8px; margin-bottom: 8px;"
            >
              {{ discount }}
            </el-tag>
            <el-input
              v-if="discountInputVisible"
              ref="discountInputRef"
              v-model="discountInputValue"
              size="small"
              style="width: 120px;"
              placeholder="如: 25减12"
              @keyup.enter="handleDiscountInputConfirm"
              @blur="handleDiscountInputConfirm"
            />
            <el-button v-else size="small" type="success" @click="showDiscountInput">+ 添加优惠</el-button>
          </el-form-item>
        </el-tab-pane>
      </el-tabs>

      <div style="margin-top: 20px; text-align: right;">
        <el-button @click="$emit('cancel')">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, defineProps, defineEmits, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import ImageUpload from '@/components/ImageUpload.vue';
import {
  buildBusinessCategoryOptions,
  buildMerchantTypeOptions,
  loadMerchantTaxonomySettings,
  resolveBusinessCategoryOption,
  resolveMerchantTypeOption
} from '@/utils/platform-settings';

const props = defineProps({
  shop: {
    type: Object,
    default: null
  },
  merchantId: {
    type: [Number, String],
    required: true
  }
});

const emit = defineEmits(['save', 'cancel']);

const activeTab = ref('basic');
const saving = ref(false);
const merchantTaxonomySettings = ref(null);
const merchantTypeOptions = ref(buildMerchantTypeOptions());
const businessCategoryOptions = ref(buildBusinessCategoryOptions());

function normalizeMerchantType(value) {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'groupbuy' || text === '团购类' || text === '团购') return 'groupbuy';
  if (text === 'hybrid' || text === '混合类' || text === '混合') return 'hybrid';
  return 'takeout';
}

function merchantTypeFromOrderType(orderType) {
  const text = String(orderType || '').trim();
  if (text === '团购类') return 'groupbuy';
  if (text === '混合类') return 'hybrid';
  return 'takeout';
}

function orderTypeFromMerchantType(merchantType) {
  return resolveMerchantTypeOption(merchantType, merchantTaxonomySettings.value).legacyOrderTypeLabel;
}

const initialMerchantType = resolveMerchantTypeOption(props.shop?.merchantType || props.shop?.orderType);
const initialBusinessCategory = resolveBusinessCategoryOption(
  props.shop?.businessCategoryKey || props.shop?.businessCategory || props.shop?.category
);

// 表单数据
const formData = reactive({
  id: props.shop?.id || null,
  name: props.shop?.name || '',
  orderType: props.shop?.orderType || initialMerchantType.legacyOrderTypeLabel || '外卖类',
  merchantType: normalizeMerchantType(props.shop?.merchantType || merchantTypeFromOrderType(props.shop?.orderType) || initialMerchantType.key),
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
  tags: props.shop?.tags || [],
  discounts: props.shop?.discounts || [],
  isBrand: props.shop?.isBrand || false,
  isFranchise: props.shop?.isFranchise || false,
  isActive: props.shop?.isActive !== undefined ? props.shop.isActive : true
});

// 标签输入
const tagInputVisible = ref(false);
const tagInputValue = ref('');
const tagInputRef = ref(null);

function showTagInput() {
  tagInputVisible.value = true;
  nextTick(() => {
    tagInputRef.value?.focus();
  });
}

function handleTagInputConfirm() {
  if (tagInputValue.value) {
    formData.tags.push(tagInputValue.value);
    tagInputValue.value = '';
  }
  tagInputVisible.value = false;
}

function removeTag(index) {
  formData.tags.splice(index, 1);
}

// 优惠输入
const discountInputVisible = ref(false);
const discountInputValue = ref('');
const discountInputRef = ref(null);

function showDiscountInput() {
  discountInputVisible.value = true;
  nextTick(() => {
    discountInputRef.value?.focus();
  });
}

function handleDiscountInputConfirm() {
  if (discountInputValue.value) {
    formData.discounts.push(discountInputValue.value);
    discountInputValue.value = '';
  }
  discountInputVisible.value = false;
}

function removeDiscount(index) {
  formData.discounts.splice(index, 1);
}

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

// 保存
function handleSave() {
  if (!formData.name) {
    ElMessage.warning('请输入店铺名称');
    return;
  }

  // 转换数据格式
  const shopData = {
    ...formData,
    merchantType: normalizeMerchantType(formData.merchantType),
    orderType: orderTypeFromMerchantType(formData.merchantType),
    businessCategoryKey: formData.businessCategoryKey,
    businessCategory: formData.businessCategory,
    tags: JSON.stringify(formData.tags),
    discounts: JSON.stringify(formData.discounts)
  };

  emit('save', shopData);
}

onMounted(() => {
  void loadTaxonomySettings();
});
</script>

<style scoped>
.shop-editor {
  padding: 10px 0;
}
</style>

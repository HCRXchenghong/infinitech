<template>
  <div>
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
          <el-select
            v-model="formData.orderType"
            placeholder="请选择订单类型"
            style="width: 100%"
            @change="handleOrderTypeChange"
          >
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
          <el-select
            v-model="formData.merchantType"
            placeholder="请选择商户类型"
            style="width: 100%"
            @change="handleMerchantTypeChange"
          >
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
          <el-select
            v-model="formData.businessCategoryKey"
            placeholder="请选择业务分类"
            style="width: 100%"
            @change="handleBusinessCategoryChange"
          >
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
          <el-input-number
            v-model="formData.rating"
            :min="0"
            :max="5"
            :step="0.1"
            :precision="1"
            style="width: 100%"
          />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="月销量">
          <el-input-number v-model="formData.monthlySales" :min="0" style="width: 100%" />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="人均消费">
          <el-input-number
            v-model="formData.perCapita"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="8">
        <el-form-item label="起送金额">
          <el-input-number
            v-model="formData.minPrice"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
      </el-col>
      <el-col :span="8">
        <el-form-item label="配送费">
          <el-input-number
            v-model="formData.deliveryPrice"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
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
  </div>
</template>

<script setup>
defineProps({
  businessCategoryOptions: {
    type: Array,
    default: () => [],
  },
  formData: {
    type: Object,
    required: true,
  },
  handleBusinessCategoryChange: {
    type: Function,
    required: true,
  },
  handleMerchantTypeChange: {
    type: Function,
    required: true,
  },
  handleOrderTypeChange: {
    type: Function,
    required: true,
  },
  merchantTypeOptions: {
    type: Array,
    default: () => [],
  },
});
</script>

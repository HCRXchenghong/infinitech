<template>
  <div>
    <el-card shadow="never">
      <template #header>
        <div class="errand-settings-card-title-row">
          <span>页面文案</span>
          <span class="errand-settings-card-tip">
            用户端与 App 跑腿首页、详情页统一读取这一份配置。
          </span>
        </div>
      </template>

      <el-form label-width="100px">
        <el-form-item label="页面标题">
          <el-input v-model="form.page_title" />
        </el-form-item>
        <el-form-item label="主标题">
          <el-input v-model="form.hero_title" />
        </el-form-item>
        <el-form-item label="副标题">
          <el-input v-model="form.hero_desc" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="详情提示">
          <el-input v-model="form.detail_tip" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="errand-settings-services-card">
      <template #header>
        <div class="errand-settings-card-title-row">
          <span>服务卡片</span>
          <span class="errand-settings-card-tip">一期固定四项：买、送、取、办。</span>
        </div>
      </template>

      <div v-loading="loading">
        <div v-for="service in sortedServices" :key="service.key" class="errand-settings-service-card">
          <div class="errand-settings-service-header">
            <strong>{{ service.label || service.key }}</strong>
            <el-tag size="small">{{ service.key }}</el-tag>
          </div>
          <el-row :gutter="12">
            <el-col :span="6">
              <el-form-item label="名称">
                <el-input v-model="service.label" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="图标">
                <el-input v-model="service.icon" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="颜色">
                <el-input v-model="service.color" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="排序">
                <el-input-number
                  v-model="service.sort_order"
                  :min="0"
                  :step="10"
                  class="errand-settings-sort-input"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="12">
              <el-form-item label="说明">
                <el-input v-model="service.desc" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="页面路由">
                <el-input v-model="service.route" placeholder="/pages/errand/buy/index" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="18">
              <el-form-item label="服务费提示">
                <el-input v-model="service.service_fee_hint" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="启用">
                <el-switch v-model="service.enabled" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
defineProps({
  form: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  sortedServices: {
    type: Array,
    default: () => [],
  },
});
</script>

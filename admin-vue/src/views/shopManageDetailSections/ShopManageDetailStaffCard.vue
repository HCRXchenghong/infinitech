<template>
  <div class="section-card">
    <div class="section-head">
      <span>员工基础信息备案</span>
      <el-button type="primary" text size="small" @click="openStaffDialog">编辑</el-button>
    </div>
    <template v-if="hasStaffRecord">
      <el-descriptions :column="2" size="small" border>
        <el-descriptions-item label="姓名">{{ shop.employeeName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="年龄">{{ formatAge(shop.employeeAge) }}</el-descriptions-item>
        <el-descriptions-item label="岗位">{{ shop.employeePosition || '-' }}</el-descriptions-item>
        <el-descriptions-item label="入职时间">
          {{ formatDate(shop.employmentStartAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="离职时间">
          {{ formatDate(shop.employmentEndAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="身份证到期">
          {{ formatDate(shop.idCardExpireAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="健康证到期">
          {{ formatDate(shop.healthCertExpireAt) }}
        </el-descriptions-item>
      </el-descriptions>
      <div class="staff-doc-grid">
        <div class="staff-doc-item">
          <div class="image-label">身份证正面</div>
          <img v-if="shop.idCardFrontImage" :src="shop.idCardFrontImage" alt="身份证正面" />
          <div v-else class="image-empty">未上传</div>
        </div>
        <div class="staff-doc-item">
          <div class="image-label">身份证反面</div>
          <img v-if="shop.idCardBackImage" :src="shop.idCardBackImage" alt="身份证反面" />
          <div v-else class="image-empty">未上传</div>
        </div>
        <div class="staff-doc-item">
          <div class="image-label">健康证正面</div>
          <img
            v-if="shop.healthCertFrontImage"
            :src="shop.healthCertFrontImage"
            alt="健康证正面"
          />
          <div v-else class="image-empty">未上传</div>
        </div>
        <div class="staff-doc-item">
          <div class="image-label">健康证反面</div>
          <img
            v-if="shop.healthCertBackImage"
            :src="shop.healthCertBackImage"
            alt="健康证反面"
          />
          <div v-else class="image-empty">未上传</div>
        </div>
      </div>
    </template>
    <div v-else class="empty-tip">暂无员工备案信息</div>
  </div>
</template>

<script setup>
defineProps({
  formatAge: {
    type: Function,
    required: true,
  },
  formatDate: {
    type: Function,
    required: true,
  },
  hasStaffRecord: {
    type: Boolean,
    default: false,
  },
  openStaffDialog: {
    type: Function,
    required: true,
  },
  shop: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <div class="section-card">
    <div class="section-head">
      <span>基本信息</span>
      <el-button type="primary" text size="small" @click="openBasicDialog">编辑</el-button>
    </div>
    <el-descriptions :column="2" size="small">
      <el-descriptions-item label="店铺名称">{{ shop.name || '-' }}</el-descriptions-item>
      <el-descriptions-item label="店铺类型">{{ shop.orderType || '-' }}</el-descriptions-item>
      <el-descriptions-item label="业务分类">
        {{ shop.businessCategory || shop.category || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="联系电话">{{ shop.phone || '-' }}</el-descriptions-item>
      <el-descriptions-item label="店铺评分">★ {{ shop.rating || 0 }}</el-descriptions-item>
      <el-descriptions-item label="月销量">{{ shop.monthlySales || 0 }}</el-descriptions-item>
      <el-descriptions-item label="营业时间">{{ shop.businessHours || '-' }}</el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag :type="shop.isActive ? 'success' : 'info'" size="small">
          {{ shop.isActive ? '营业中' : '已关闭' }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="今日推荐">
        <el-tag :type="shop.isTodayRecommended ? 'success' : 'info'" size="small">
          {{ shop.isTodayRecommended ? '已加入' : '未加入' }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="推荐位次">
        {{ shop.isTodayRecommended ? (shop.todayRecommendPosition || '-') : '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="商家资质">
        <el-image
          v-if="merchantQualificationImage"
          class="license-thumb"
          :src="merchantQualificationImage"
          :preview-src-list="[merchantQualificationImage]"
          preview-teleported
          fit="cover"
        />
        <span v-else>-</span>
      </el-descriptions-item>
      <el-descriptions-item label="食品经营许可">
        <el-image
          v-if="foodBusinessLicenseImage"
          class="license-thumb"
          :src="foodBusinessLicenseImage"
          :preview-src-list="[foodBusinessLicenseImage]"
          preview-teleported
          fit="cover"
        />
        <span v-else>-</span>
      </el-descriptions-item>
      <el-descriptions-item label="地址" :span="2">{{ shop.address || '-' }}</el-descriptions-item>
      <el-descriptions-item label="公告" :span="2">
        {{ shop.announcement || '-' }}
      </el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<script setup>
defineProps({
  foodBusinessLicenseImage: {
    type: String,
    default: '',
  },
  merchantId: {
    type: String,
    default: '',
  },
  merchantQualificationImage: {
    type: String,
    default: '',
  },
  openBasicDialog: {
    type: Function,
    required: true,
  },
  shop: {
    type: Object,
    required: true,
  },
});
</script>

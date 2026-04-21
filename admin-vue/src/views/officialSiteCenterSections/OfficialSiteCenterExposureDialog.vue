<template>
  <el-dialog
    :model-value="visible"
    title="曝光审核与处理"
    width="760px"
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-if="exposureDraft.id" class="exposure-dialog">
      <div class="official-site-dialog-meta-row">
        <span>提交时间：{{ formatDateTime(exposureDraft.created_at) }}</span>
        <span>联系电话：{{ exposureDraft.contact_phone }}</span>
      </div>
      <div class="official-site-dialog-content-block">
        <strong>问题描述</strong>
        <p>{{ exposureDraft.content }}</p>
      </div>
      <div class="official-site-dialog-content-block">
        <strong>诉求</strong>
        <p>{{ exposureDraft.appeal }}</p>
      </div>
      <div class="official-site-dialog-meta-row">
        <span>涉及金额：¥{{ formatCurrency(exposureDraft.amount) }}</span>
        <span>处理完成：{{ formatDateTime(exposureDraft.handled_at) }}</span>
      </div>
      <div v-if="exposureDraft.photo_urls?.length" class="official-site-dialog-photos">
        <el-image
          v-for="photo in exposureDraft.photo_urls"
          :key="photo"
          :src="photo"
          fit="cover"
          :preview-src-list="exposureDraft.photo_urls"
          preview-teleported
        />
      </div>

      <div class="official-site-dialog-form-grid">
        <el-form-item label="审核状态">
          <el-select v-model="exposureDraft.review_status">
            <el-option
              v-for="option in OFFICIAL_SITE_EXPOSURE_REVIEW_STATUS_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="exposureDraft.process_status">
            <el-option
              v-for="option in OFFICIAL_SITE_EXPOSURE_PROCESS_STATUS_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
      </div>

      <el-form-item label="审核备注">
        <el-input
          v-model="exposureDraft.review_remark"
          type="textarea"
          :rows="3"
          resize="none"
          maxlength="300"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="处理备注">
        <el-input
          v-model="exposureDraft.process_remark"
          type="textarea"
          :rows="3"
          resize="none"
          maxlength="300"
          show-word-limit
        />
      </el-form-item>
    </div>

    <template #footer>
      <el-button size="small" @click="emit('update:visible', false)">取消</el-button>
      <el-button size="small" type="primary" :loading="exposureSaving" @click="saveExposure">保存处理结果</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import {
  OFFICIAL_SITE_EXPOSURE_PROCESS_STATUS_OPTIONS,
  OFFICIAL_SITE_EXPOSURE_REVIEW_STATUS_OPTIONS,
} from '@infinitech/admin-core';
import { formatCurrency, formatDateTime } from '@/utils/officialSiteApi';

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  exposureDraft: {
    type: Object,
    required: true,
  },
  exposureSaving: {
    type: Boolean,
    default: false,
  },
  saveExposure: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(['update:visible']);
</script>

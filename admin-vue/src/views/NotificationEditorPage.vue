<template>
  <div class="notification-editor-page">
    <NotificationEditorPageHeader
      :title-text="titleText"
      :is-preview="isPreview"
      :saving="saving"
      :publishing="publishing"
      :uploading-cover="uploadingCover"
      :go-back="goBack"
      :save-draft="saveDraft"
      :publish="publish"
    />

    <div class="content-grid">
      <NotificationEditorFormCard
        :form="form"
        :is-preview="isPreview"
        :saving="saving"
        :publishing="publishing"
        :uploading-cover="uploadingCover"
        :uploading-block-map="uploadingBlockMap"
        :block-type-label="blockTypeLabel"
        :add-block="addBlock"
        :remove-block="removeBlock"
        :move-block-up="moveBlockUp"
        :move-block-down="moveBlockDown"
        :add-list-item="addListItem"
        :remove-list-item="removeListItem"
        :upload-cover="uploadCover"
        :upload-block-image="uploadBlockImage"
      />

      <NotificationEditorPreviewCard
        :form="form"
        :is-preview="isPreview"
        :now-text="nowText"
      />
    </div>
  </div>
</template>

<script setup>
import './NotificationEditorPage.css'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import NotificationEditorFormCard from './notificationEditorPageSections/NotificationEditorFormCard.vue'
import NotificationEditorPageHeader from './notificationEditorPageSections/NotificationEditorPageHeader.vue'
import NotificationEditorPreviewCard from './notificationEditorPageSections/NotificationEditorPreviewCard.vue'
import { blockTypeLabel } from './notificationEditorPageHelpers'
import { useNotificationEditorPage } from './notificationEditorPageViewHelpers'

const route = useRoute()
const router = useRouter()

const {
  addBlock,
  addListItem,
  form,
  goBack,
  isPreview,
  moveBlockDown,
  moveBlockUp,
  nowText,
  publish,
  publishing,
  removeBlock,
  removeListItem,
  saveDraft,
  saving,
  titleText,
  uploadingBlockMap,
  uploadingCover,
  uploadBlockImage,
  uploadCover,
} = useNotificationEditorPage({
  route,
  router,
  request,
  ElMessage,
})
</script>

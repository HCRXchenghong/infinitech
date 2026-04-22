<template>
  <el-dialog
    :model-value="visible"
    :title="reviewEditingId ? '编辑评论' : '新增评论'"
    width="760px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
  >
    <el-form :model="reviewForm" label-width="110px">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="用户名称">
            <el-input v-model="reviewForm.userName" placeholder="例如：匿名用户" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="评分" required>
            <el-input-number
              v-model="reviewForm.rating"
              :min="1"
              :max="5"
              :step="0.1"
              :precision="1"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="用户ID">
            <el-input v-model="reviewForm.userId" placeholder="请输入用户ID" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="订单ID">
            <el-input v-model="reviewForm.orderId" placeholder="请输入订单ID" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="用户头像">
        <ImageUpload v-model="reviewForm.userAvatar" upload-domain="profile_image" />
      </el-form-item>

      <el-form-item label="评论内容" required>
        <el-input
          v-model="reviewForm.content"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="评论图片">
        <div class="review-form-upload-box">
          <el-upload
            :show-file-list="false"
            :auto-upload="false"
            accept="image/*"
            :on-change="handleReviewImageChange"
          >
            <el-button :loading="uploadingReviewImage">上传图片</el-button>
          </el-upload>

          <div
            v-if="Array.isArray(reviewForm.images) && reviewForm.images.length"
            class="review-form-image-list"
          >
            <div
              v-for="(img, index) in reviewForm.images"
              :key="`${img}-${index}`"
              class="review-form-image-item"
            >
              <el-image
                class="review-form-image-thumb"
                :src="img"
                :preview-src-list="reviewForm.images"
                fit="cover"
              />
              <el-button type="danger" text size="small" @click="removeReviewImage(index)">
                删除
              </el-button>
            </div>
          </div>
          <div v-else class="review-form-upload-tip">暂无图片，可上传多张</div>
        </div>
      </el-form-item>

      <el-form-item label="商家回复">
        <el-input
          v-model="reviewForm.reply"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="reviewSaving" @click="saveReview">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import ImageUpload from '@/components/ImageUpload.vue';

defineEmits(['update:visible']);

defineProps({
  handleReviewImageChange: {
    type: Function,
    required: true,
  },
  removeReviewImage: {
    type: Function,
    required: true,
  },
  reviewEditingId: {
    type: String,
    default: '',
  },
  reviewForm: {
    type: Object,
    required: true,
  },
  reviewSaving: {
    type: Boolean,
    default: false,
  },
  saveReview: {
    type: Function,
    required: true,
  },
  uploadingReviewImage: {
    type: Boolean,
    default: false,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});
</script>

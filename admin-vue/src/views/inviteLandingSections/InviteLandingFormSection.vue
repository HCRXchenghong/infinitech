<template>
  <section class="form-view">
    <header class="form-header">
      <h2>基础信息填写</h2>
      <p>请按真实信息填写并提交。</p>
    </header>

    <div class="form-content">
      <el-form label-width="130px" class="invite-form">
        <template v-if="isMerchant">
          <el-form-item label="商户名" required>
            <el-input v-model="form.merchant_name" placeholder="请输入商户名" />
          </el-form-item>
          <el-form-item label="负责人" required>
            <el-input v-model="form.owner_name" placeholder="请输入负责人姓名" />
          </el-form-item>
          <el-form-item label="手机号" required>
            <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
          </el-form-item>
          <el-form-item label="营业执照照片" required>
            <div class="upload-box">
              <el-upload
                :show-file-list="false"
                :auto-upload="false"
                accept="image/*"
                :on-change="(file) => handleImageChange('business_license_image', file)"
              >
                <el-button :loading="uploading.business_license_image">上传照片</el-button>
              </el-upload>
              <img
                v-if="form.business_license_image"
                class="preview-image"
                :src="form.business_license_image"
                alt="营业执照照片"
              />
            </div>
          </el-form-item>
          <el-form-item label="登录密码" required>
            <el-input
              v-model="form.password"
              type="password"
              show-password
              placeholder="至少6位密码"
            />
          </el-form-item>
        </template>

        <template v-if="isRider">
          <el-form-item label="姓名" required>
            <el-input v-model="form.name" placeholder="请输入姓名" />
          </el-form-item>
          <el-form-item label="手机号" required>
            <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
          </el-form-item>
          <el-form-item label="身份证照片" required>
            <div class="upload-box">
              <el-upload
                :show-file-list="false"
                :auto-upload="false"
                accept="image/*"
                :on-change="(file) => handleImageChange('id_card_image', file)"
              >
                <el-button :loading="uploading.id_card_image">上传照片</el-button>
              </el-upload>
              <img
                v-if="form.id_card_image"
                class="preview-image"
                :src="form.id_card_image"
                alt="身份证照片"
              />
            </div>
          </el-form-item>
          <el-form-item label="紧急联系人" required>
            <el-input
              v-model="form.emergency_contact_name"
              placeholder="请输入紧急联系人姓名"
            />
          </el-form-item>
          <el-form-item label="紧急联系人电话" required>
            <el-input
              v-model="form.emergency_contact_phone"
              placeholder="请输入紧急联系人电话"
              maxlength="11"
            />
          </el-form-item>
          <el-form-item label="登录密码" required>
            <el-input
              v-model="form.password"
              type="password"
              show-password
              placeholder="至少6位密码"
            />
          </el-form-item>
        </template>
      </el-form>
    </div>

    <footer class="form-footer">
      <el-button @click="showLetter">返回邀请函</el-button>
      <el-button type="primary" :loading="submitting" @click="submitInvite">提交信息</el-button>
    </footer>
  </section>
</template>

<script setup>
defineProps({
  form: {
    type: Object,
    required: true,
  },
  isMerchant: {
    type: Boolean,
    default: false,
  },
  isRider: {
    type: Boolean,
    default: false,
  },
  uploading: {
    type: Object,
    required: true,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
  handleImageChange: {
    type: Function,
    required: true,
  },
  submitInvite: {
    type: Function,
    required: true,
  },
  showLetter: {
    type: Function,
    required: true,
  },
});
</script>

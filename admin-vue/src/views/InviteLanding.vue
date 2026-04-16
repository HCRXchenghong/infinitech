<template>
  <div class="invite-shell">
    <div class="ambient ambient-a"></div>
    <div class="ambient ambient-b"></div>
    <div class="ambient ambient-c"></div>

    <div class="invite-frame">
      <div v-if="loading" class="state-wrap">
        <el-skeleton :rows="6" animated />
      </div>

      <div v-else-if="loadError" class="state-wrap">
        <el-result icon="warning" title="链接不可用" :sub-title="loadError">
          <template #extra>
            <el-button type="primary" @click="loadInvite">重试</el-button>
          </template>
        </el-result>
      </div>

      <template v-else>
        <OldUserInviteFlow
          v-if="isOldUser"
          :token="token"
          :invite="invite"
          @link-invalid="handleInviteInvalid"
        />

        <template v-else>
          <section v-if="view === 'envelope'" class="envelope-view">
            <div class="envelope-head">
              <div class="badge">{{ inviteTypeLabel }}</div>
              <h1>{{ inviteTitle }}</h1>
              <p>点击打开邀请函</p>
            </div>

            <button class="envelope-card" type="button" @click="openEnvelope">
              <div class="envelope-shadow"></div>
              <div class="envelope-back"></div>
              <div
                class="envelope-paper"
                :class="{ extracting: envelopeOpening }"
              >
                <div class="paper-line" v-for="idx in 4" :key="idx"></div>
              </div>
              <div class="envelope-front"></div>
              <div
                class="envelope-flap"
                :class="{ open: envelopeOpening }"
              ></div>
              <div class="seal" :class="{ hidden: envelopeOpening }">悦</div>
            </button>
          </section>

          <section v-else-if="view === 'letter'" class="letter-view">
            <header class="letter-header">
              <div class="brand">悦享e食</div>
              <div class="chip">{{ inviteTypeLabel }}</div>
            </header>

            <div class="letter-body">
              <h2>{{ inviteTitle }}</h2>
              <p v-for="(line, idx) in letterParagraphs" :key="idx">
                {{ line }}
              </p>
              <div class="letter-meta">
                <div>链接有效至：{{ formatOnboardingInviteDateTime(invite?.expires_at) }}</div>
              </div>
            </div>

            <footer class="letter-footer">
              <el-button type="primary" size="large" @click="view = 'form'"
                >去填写信息</el-button
              >
            </footer>
          </section>

          <section v-else-if="view === 'form'" class="form-view">
            <header class="form-header">
              <h2>基础信息填写</h2>
              <p>请按真实信息填写并提交。</p>
            </header>

            <div class="form-content">
              <el-form label-width="130px" class="invite-form">
                <template v-if="isMerchant">
                  <el-form-item label="商户名" required>
                    <el-input
                      v-model="form.merchant_name"
                      placeholder="请输入商户名"
                    />
                  </el-form-item>
                  <el-form-item label="负责人" required>
                    <el-input
                      v-model="form.owner_name"
                      placeholder="请输入负责人姓名"
                    />
                  </el-form-item>
                  <el-form-item label="手机号" required>
                    <el-input
                      v-model="form.phone"
                      placeholder="请输入手机号"
                      maxlength="11"
                    />
                  </el-form-item>
                  <el-form-item label="营业执照照片" required>
                    <div class="upload-box">
                      <el-upload
                        :show-file-list="false"
                        :auto-upload="false"
                        accept="image/*"
                        :on-change="
                          (file) =>
                            handleImageChange('business_license_image', file)
                        "
                      >
                        <el-button :loading="uploading.business_license_image"
                          >上传照片</el-button
                        >
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
                    <el-input
                      v-model="form.phone"
                      placeholder="请输入手机号"
                      maxlength="11"
                    />
                  </el-form-item>
                  <el-form-item label="身份证照片" required>
                    <div class="upload-box">
                      <el-upload
                        :show-file-list="false"
                        :auto-upload="false"
                        accept="image/*"
                        :on-change="
                          (file) => handleImageChange('id_card_image', file)
                        "
                      >
                        <el-button :loading="uploading.id_card_image"
                          >上传照片</el-button
                        >
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
              <el-button @click="view = 'letter'">返回邀请函</el-button>
              <el-button
                type="primary"
                :loading="submitting"
                @click="submitInvite"
                >提交信息</el-button
              >
            </footer>
          </section>

          <section v-else-if="view === 'success'" class="success-view">
            <el-result
              icon="success"
              title="提交成功"
              sub-title="信息已提交，请等待平台审核。"
            >
              <template #extra>
                <el-button @click="view = 'letter'">查看邀请函</el-button>
              </template>
            </el-result>
          </section>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { createOnboardingInviteApi } from "@infinitech/client-sdk";
import {
  buildOnboardingInviteLetterParagraphs,
  buildOnboardingInviteSubmitPayload,
  createOnboardingInviteForm,
  formatOnboardingInviteDateTime,
  getOnboardingInviteTitle,
  getOnboardingInviteTypeLabel,
  validateOnboardingInviteImageFile,
  validateOnboardingInviteSubmission,
} from "@infinitech/domain-core";
import {
  extractErrorMessage,
} from "@infinitech/contracts/http";
import request from "@/utils/request";
import OldUserInviteFlow from "@/components/OldUserInviteFlow.vue";

const route = useRoute();

const loading = ref(true);
const loadError = ref("");
const submitting = ref(false);
const envelopeOpening = ref(false);
const view = ref("envelope");
const invite = ref(null);
const form = reactive(createOnboardingInviteForm());
const uploading = reactive({
  business_license_image: false,
  id_card_image: false,
});
const onboardingInviteApi = createOnboardingInviteApi({
  get: (url, config) => request.get(url, config),
  post: (url, payload, config) => request.post(url, payload, config),
});

const token = computed(() => String(route.params.token || "").trim());
const inviteType = computed(() => invite.value?.invite_type || "");
const isMerchant = computed(() => inviteType.value === "merchant");
const isRider = computed(() => inviteType.value === "rider");
const isOldUser = computed(() => inviteType.value === "old_user");
const inviteTypeLabel = computed(() => getOnboardingInviteTypeLabel(inviteType.value));
const inviteTitle = computed(() => getOnboardingInviteTitle(inviteType.value));
const letterParagraphs = computed(() => buildOnboardingInviteLetterParagraphs(inviteType.value));

onMounted(() => {
  loadInvite();
});

watch(token, () => {
  resetState();
  loadInvite();
});

function resetState() {
  invite.value = null;
  loadError.value = "";
  view.value = "envelope";
  envelopeOpening.value = false;
  Object.assign(form, createOnboardingInviteForm());
  uploading.business_license_image = false;
  uploading.id_card_image = false;
}

async function loadInvite() {
  if (!token.value) {
    loadError.value = "邀请链接格式错误";
    loading.value = false;
    return;
  }

  loading.value = true;
  loadError.value = "";
  try {
    const payload = await onboardingInviteApi.fetchInvite(token.value);
    if (!payload?.invite_type) {
      throw new Error("邀请信息无效");
    }
    invite.value = payload;
    view.value = "envelope";
  } catch (error) {
    loadError.value = extractErrorMessage(error, "邀请链接不可用");
  } finally {
    loading.value = false;
  }
}

function openEnvelope() {
  if (envelopeOpening.value) return;
  envelopeOpening.value = true;
  window.setTimeout(() => {
    view.value = "letter";
  }, 900);
}

async function submitInvite() {
  const validation = validateOnboardingInviteSubmission(inviteType.value, form);
  if (!validation.valid) {
    ElMessage.warning(validation.message);
    return;
  }

  const payload = buildOnboardingInviteSubmitPayload(inviteType.value, form);
  if (!payload) {
    ElMessage.warning("邀请类型不支持该填写页");
    return;
  }

  submitting.value = true;
  try {
    await onboardingInviteApi.submitInvite(token.value, payload);
    view.value = "success";
    ElMessage.success("提交成功");
  } catch (error) {
    const message = extractErrorMessage(error, "提交失败");
    ElMessage.error(message);
    if (error?.response?.status === 404 || error?.response?.status === 410) {
      loadError.value = message;
    }
  } finally {
    submitting.value = false;
  }
}

function handleInviteInvalid(message) {
  loadError.value = message || "邀请链接不可用";
}

async function handleImageChange(field, uploadFile) {
  const raw = uploadFile?.raw;
  if (!raw) return;
  const validation = validateOnboardingInviteImageFile(raw);
  if (!validation.valid) {
    ElMessage.error(validation.message);
    return;
  }

  uploading[field] = true;
  try {
    const formData = new FormData();
    formData.append("file", raw);
    const asset = await onboardingInviteApi.uploadInviteAsset(
      token.value,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    const url = asset?.url || "";
    if (!url) {
      throw new Error("上传返回地址为空");
    }
    form[field] = url;
    ElMessage.success("图片上传成功");
  } catch (error) {
    ElMessage.error(extractErrorMessage(error, "图片上传失败"));
  } finally {
    uploading[field] = false;
  }
}
</script>

<style scoped lang="css" src="./InviteLanding.css"></style>

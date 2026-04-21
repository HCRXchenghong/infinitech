import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
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
import { extractErrorMessage, resolveUploadAssetUrl } from "@infinitech/contracts";

export { formatOnboardingInviteDateTime };

export function useInviteLandingPage({ route, request, ElMessage }) {
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

  let openEnvelopeTimerId = null;

  function clearOpenEnvelopeTimer() {
    if (openEnvelopeTimerId == null) {
      return;
    }
    window.clearTimeout(openEnvelopeTimerId);
    openEnvelopeTimerId = null;
  }

  function resetState() {
    clearOpenEnvelopeTimer();
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
    if (envelopeOpening.value) {
      return;
    }
    envelopeOpening.value = true;
    clearOpenEnvelopeTimer();
    openEnvelopeTimerId = window.setTimeout(() => {
      view.value = "letter";
      openEnvelopeTimerId = null;
    }, 900);
  }

  function showForm() {
    view.value = "form";
  }

  function showLetter() {
    view.value = "letter";
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
    if (!raw) {
      return;
    }

    const validation = validateOnboardingInviteImageFile(raw);
    if (!validation.valid) {
      ElMessage.error(validation.message);
      return;
    }

    uploading[field] = true;
    try {
      const formData = new FormData();
      formData.append("file", raw);
      const asset = await onboardingInviteApi.uploadInviteAsset(token.value, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const url = String(resolveUploadAssetUrl(asset) || "").trim();
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

  onMounted(() => {
    void loadInvite();
  });

  watch(token, () => {
    resetState();
    void loadInvite();
  });

  onBeforeUnmount(() => {
    clearOpenEnvelopeTimer();
  });

  return {
    token,
    loading,
    loadError,
    submitting,
    envelopeOpening,
    view,
    invite,
    form,
    uploading,
    isMerchant,
    isRider,
    isOldUser,
    inviteTypeLabel,
    inviteTitle,
    letterParagraphs,
    loadInvite,
    openEnvelope,
    submitInvite,
    handleInviteInvalid,
    handleImageChange,
    showForm,
    showLetter,
  };
}

const ONBOARDING_INVITE_PHONE_PATTERN = /^1[3-9]\d{9}$/;

export const ONBOARDING_INVITE_IMAGE_MAX_MB = 5;

export function createOnboardingInviteForm() {
  return {
    merchant_name: "",
    owner_name: "",
    phone: "",
    business_license_image: "",
    name: "",
    id_card_image: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    password: "",
  };
}

export function getOnboardingInviteTypeLabel(inviteType) {
  if (inviteType === "merchant") return "商户";
  if (inviteType === "rider") return "骑手";
  if (inviteType === "old_user") return "老用户";
  return "邀请";
}

export function getOnboardingInviteTitle(inviteType) {
  if (inviteType === "merchant") return "商户入驻邀请";
  if (inviteType === "rider") return "骑手入职邀请";
  if (inviteType === "old_user") return "老用户回归邀请";
  return "邀请函";
}

export function buildOnboardingInviteLetterParagraphs(inviteType) {
  if (inviteType === "merchant") {
    return [
      "您好，诚邀您加入悦享e食商户平台，共同服务本地用户。",
      "平台将为您提供标准化运营工具、稳定订单入口与持续的运营支持。",
      "请点击下方按钮填写入驻基础信息，提交后我们会尽快审核。",
    ];
  }

  if (inviteType === "rider") {
    return [
      "您好，诚邀您加入悦享e食配送团队。",
      "我们将为您提供稳定单量、规范培训和明确的成长路径。",
      "请点击下方按钮填写入职基础信息，提交后我们会尽快审核。",
    ];
  }

  return [
    "该邀请类型暂不支持当前填写页。",
    "请联系平台管理员重新生成邀请链接。",
  ];
}

export function isOnboardingInvitePhoneValid(phone) {
  return ONBOARDING_INVITE_PHONE_PATTERN.test(String(phone || ""));
}

export function validateOnboardingInviteSubmission(inviteType, form = {}) {
  if (!isOnboardingInvitePhoneValid(form.phone)) {
    return { valid: false, message: "请输入正确的手机号" };
  }

  if (String(form.password || "").length < 6) {
    return { valid: false, message: "登录密码至少6位" };
  }

  if (inviteType === "merchant") {
    if (
      !form.merchant_name ||
      !form.owner_name ||
      !form.business_license_image
    ) {
      return { valid: false, message: "请完整填写商户基础信息" };
    }
    return { valid: true, message: "" };
  }

  if (inviteType === "rider") {
    if (!form.name || !form.id_card_image || !form.emergency_contact_name) {
      return { valid: false, message: "请完整填写骑手基础信息" };
    }
    if (!isOnboardingInvitePhoneValid(form.emergency_contact_phone)) {
      return { valid: false, message: "请输入正确的紧急联系人电话" };
    }
    return { valid: true, message: "" };
  }

  return { valid: false, message: "邀请类型不支持该填写页" };
}

export function buildOnboardingInviteSubmitPayload(inviteType, form = {}) {
  if (inviteType === "merchant") {
    return {
      merchant_name: form.merchant_name,
      owner_name: form.owner_name,
      phone: form.phone,
      business_license_image: form.business_license_image,
      password: form.password,
    };
  }

  if (inviteType === "rider") {
    return {
      name: form.name,
      phone: form.phone,
      id_card_image: form.id_card_image,
      emergency_contact_name: form.emergency_contact_name,
      emergency_contact_phone: form.emergency_contact_phone,
      password: form.password,
    };
  }

  return null;
}

export function validateOnboardingInviteImageFile(
  file,
  maxMB = ONBOARDING_INVITE_IMAGE_MAX_MB,
) {
  if (!file?.type || !file.type.startsWith("image/")) {
    return { valid: false, message: "请上传图片文件" };
  }

  if (Number(file.size || 0) > maxMB * 1024 * 1024) {
    return { valid: false, message: `图片不能超过${maxMB}MB` };
  }

  return { valid: true, message: "" };
}

export function formatOnboardingInviteDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}`;
}

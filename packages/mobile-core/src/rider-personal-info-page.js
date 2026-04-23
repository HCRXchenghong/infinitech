function normalizeText(value) {
  return String(value == null ? "" : value).trim();
}

function resolveRuntimeUni(uniApp) {
  return uniApp || globalThis.uni || null;
}

function showToast(uniApp, payload) {
  if (uniApp && typeof uniApp.showToast === "function") {
    uniApp.showToast(payload);
  }
}

function showEditableModal(uniApp, payload) {
  return new Promise((resolve) => {
    if (!uniApp || typeof uniApp.showModal !== "function") {
      resolve({ confirm: false, content: "" });
      return;
    }

    uniApp.showModal({
      ...payload,
      editable: true,
      success: (result) => resolve(result || { confirm: false, content: "" }),
      fail: () => resolve({ confirm: false, content: "" }),
    });
  });
}

export function normalizeRiderPersonalInfoProfile(payload) {
  const value =
    payload && payload.data && typeof payload.data === "object"
      ? payload.data
      : payload;
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...value }
    : {};
}

export function getRiderVerificationStatusText(profile = {}) {
  if (profile && profile.is_verified) {
    return "已通过平台审核";
  }
  if (profile && profile.real_name && profile.id_card_number) {
    return "资料已保存，待平台审核";
  }
  return "请先完善实名资料";
}

export function getRiderVerificationStatusHint(profile = {}) {
  if (profile && profile.is_verified) {
    return "如需修改实名或证件资料，系统会自动撤销旧认证并重新进入平台审核。";
  }
  return "实名与证件资料修改后会进入平台人工审核，骑手端不再直接修改认证通过状态。";
}

export function isValidRiderIdCardNumber(value) {
  return /^\d{17}[\dXx]$/.test(normalizeText(value));
}

export function maskRiderIdCardNumber(value) {
  const idCard = normalizeText(value);
  if (!idCard) {
    return "未认证";
  }
  if (idCard.length < 14) {
    return idCard;
  }
  return `${idCard.substring(0, 6)}********${idCard.substring(14)}`;
}

export function createRiderPersonalInfoPageLogic(options = {}) {
  const {
    getRiderProfile,
    updateRiderProfile,
    uniApp,
  } = options;
  const runtimeUni = resolveRuntimeUni(uniApp);

  return {
    data() {
      return {
        profile: {},
      };
    },
    computed: {
      verificationStatusText() {
        return getRiderVerificationStatusText(this.profile);
      },
      verificationStatusHint() {
        return getRiderVerificationStatusHint(this.profile);
      },
    },
    onLoad() {
      void this.loadProfile();
    },
    methods: {
      async loadProfile() {
        if (typeof getRiderProfile !== "function") {
          this.profile = {};
          return;
        }

        try {
          const response = await getRiderProfile();
          this.profile = normalizeRiderPersonalInfoProfile(response);
        } catch (error) {
          if (typeof console !== "undefined" && console.error) {
            console.error("加载资料失败:", error);
          }
        }
      },
      async promptAndUpdateProfileField({
        title,
        placeholderText,
        field,
        validate,
        invalidMessage,
      }) {
        const result = await showEditableModal(runtimeUni, {
          title,
          placeholderText,
        });
        const value = normalizeText(result.content);
        if (!result.confirm || !value) {
          return;
        }
        if (typeof validate === "function" && !validate(value)) {
          showToast(runtimeUni, { title: invalidMessage || "格式错误", icon: "none" });
          return;
        }
        await this.updateProfile({ [field]: value });
      },
      editNickname() {
        return this.promptAndUpdateProfileField({
          title: "修改昵称",
          placeholderText: this.profile.nickname || "",
          field: "nickname",
        });
      },
      editRealName() {
        return this.promptAndUpdateProfileField({
          title: "真实姓名",
          placeholderText: this.profile.real_name || "",
          field: "real_name",
        });
      },
      editIDCard() {
        return this.promptAndUpdateProfileField({
          title: "身份证号",
          placeholderText: this.profile.id_card_number || "",
          field: "id_card_number",
          validate: isValidRiderIdCardNumber,
          invalidMessage: "身份证号格式错误",
        });
      },
      async updateProfile(data) {
        if (typeof updateRiderProfile !== "function") {
          return;
        }

        try {
          await updateRiderProfile(data);
          showToast(runtimeUni, { title: "更新成功", icon: "success" });
          await this.loadProfile();
        } catch (error) {
          showToast(runtimeUni, {
            title: (error && error.error) || "更新失败",
            icon: "none",
          });
        }
      },
      maskIDCard(idCard) {
        return maskRiderIdCardNumber(idCard);
      },
    },
  };
}

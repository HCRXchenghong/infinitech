<template>
  <view class="page med-home">
    <view class="status-spacer" />

    <view class="main">
      <view class="title-block">
        <text class="h1">{{ texts.pageTitle }}</text>
        <text class="h1-sub">{{ texts.pageSubtitle }}</text>
      </view>

      <view class="card ai-card" @tap="goChat">
        <view class="ai-badge">
          <image class="ai-svg" src="/static/icons/ai-doctor.svg" mode="aspectFit" />
        </view>
        <view class="ai-main">
          <text class="card-title">{{ texts.aiTitle }}</text>
          <text class="card-desc">{{ texts.aiDesc }}</text>
          <view class="cta">
            <text class="cta-text">{{ texts.startConsult }}</text>
            <text class="cta-arrow">></text>
          </view>
        </view>
        <view class="ai-glow" />
      </view>

      <view class="grid">
        <view class="card fast-card" @tap="goOrder">
          <text class="fast-icon">RX</text>
          <text class="fast-title">{{ texts.fastTitle }}</text>
          <text class="fast-desc">{{ runtimeSettings.medicine_delivery_description }}</text>
          <text class="fast-deco">GO</text>
        </view>

        <view class="card call-card" @tap="showCallModal = true">
          <view class="call-icon">SOS</view>
          <text class="call-title">{{ runtimeSettings.medicine_support_title }}</text>
          <text class="call-desc">{{ runtimeSettings.medicine_support_subtitle }}</text>
        </view>
      </view>

      <view class="tip-card">
        <text class="tip-icon">TIP</text>
        <text class="tip-text">
          <text class="tip-strong">{{ texts.seasonTipLabel }}</text>
          {{ runtimeSettings.medicine_season_tip }}
        </text>
      </view>
    </view>

    <view v-if="showCallModal" class="mask" @tap="showCallModal = false">
      <view class="modal" @tap.stop>
        <view class="modal-icon">TEL</view>
        <text class="modal-title">{{ modalTitle }}</text>
        <text class="modal-sub">{{ supportModalCopy }}</text>
        <view class="modal-actions">
          <view class="btn ghost" @tap="showCallModal = false">{{ texts.cancel }}</view>
          <view class="btn danger" @tap="doCall">{{ texts.callNow }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { fetchPublicRuntimeSettings, recordPhoneContactClick } from "@/shared-ui/api.js";
import { ensureRuntimeFeatureOpen } from "@/shared-ui/feature-runtime.js";
import { createPhoneContactHelper } from "./phone-contact.js";
import {
  buildMedicineSupportModalCopy,
  buildMedicineSupportModalTitle,
  DEFAULT_MEDICINE_RUNTIME_SETTINGS,
  MEDICINE_HOME_TEXTS,
  normalizeMedicineRuntimeSettings,
  resolveMedicineHotlinePhone,
} from "./medicine-home.js";

const phoneContactHelper = createPhoneContactHelper({ recordPhoneContactClick });

export default {
  data() {
    return {
      texts: MEDICINE_HOME_TEXTS,
      showCallModal: false,
      runtimeSettings: { ...DEFAULT_MEDICINE_RUNTIME_SETTINGS },
    };
  },
  computed: {
    hotlinePhone() {
      return resolveMedicineHotlinePhone(this.runtimeSettings);
    },
    modalTitle() {
      return buildMedicineSupportModalTitle(this.texts, this.runtimeSettings);
    },
    supportModalCopy() {
      return buildMedicineSupportModalCopy(
        this.texts,
        this.hotlinePhone,
        this.runtimeSettings,
      );
    },
  },
  async onLoad() {
    const enabled = await ensureRuntimeFeatureOpen("medicine");
    if (!enabled) {
      return;
    }
    void this.loadRuntimeSettings();
  },
  methods: {
    async loadRuntimeSettings() {
      try {
        const response = await fetchPublicRuntimeSettings();
        this.runtimeSettings = normalizeMedicineRuntimeSettings(response);
      } catch (_error) {
        this.runtimeSettings = { ...DEFAULT_MEDICINE_RUNTIME_SETTINGS };
      }
    },
    goChat() {
      uni.navigateTo({ url: "/pages/medicine/chat" });
    },
    goOrder() {
      uni.navigateTo({ url: "/pages/medicine/order" });
    },
    doCall() {
      if (!this.hotlinePhone) {
        this.showCallModal = false;
        uni.showToast({
          title: this.texts.hotlineUnavailable,
          icon: "none",
        });
        return;
      }

      this.showCallModal = false;
      phoneContactHelper
        .makePhoneCall({
          targetRole: "admin",
          targetPhone: this.hotlinePhone,
          entryPoint: "medicine_home",
          scene: "medicine_support",
          pagePath: "/pages/medicine/home",
          metadata: {
            supportTitle: this.runtimeSettings.medicine_support_title,
          },
        })
        .catch(() => {
          uni.showToast({
            title: this.texts.callFailed,
            icon: "none",
          });
        });
    },
  },
};
</script>

<style scoped lang="scss" src="./medicine-home-page.scss"></style>

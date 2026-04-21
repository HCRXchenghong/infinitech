<template>
  <div class="invite-shell">
    <div class="ambient ambient-a"></div>
    <div class="ambient ambient-b"></div>
    <div class="ambient ambient-c"></div>

    <div class="invite-frame">
      <InviteLandingStatePanel
        v-if="loading || loadError"
        :loading="loading"
        :load-error="loadError"
        :load-invite="loadInvite"
      />

      <template v-else>
        <OldUserInviteFlow
          v-if="isOldUser"
          :token="token"
          :invite="invite"
          @link-invalid="handleInviteInvalid"
        />

        <template v-else>
          <InviteLandingEnvelopeSection
            v-if="view === 'envelope'"
            :invite-type-label="inviteTypeLabel"
            :invite-title="inviteTitle"
            :envelope-opening="envelopeOpening"
            :open-envelope="openEnvelope"
          />

          <InviteLandingLetterSection
            v-else-if="view === 'letter'"
            :invite="invite"
            :invite-type-label="inviteTypeLabel"
            :invite-title="inviteTitle"
            :letter-paragraphs="letterParagraphs"
            :format-onboarding-invite-date-time="formatOnboardingInviteDateTime"
            :show-form="showForm"
          />

          <InviteLandingFormSection
            v-else-if="view === 'form'"
            :form="form"
            :is-merchant="isMerchant"
            :is-rider="isRider"
            :uploading="uploading"
            :submitting="submitting"
            :handle-image-change="handleImageChange"
            :submit-invite="submitInvite"
            :show-letter="showLetter"
          />

          <InviteLandingSuccessSection
            v-else-if="view === 'success'"
            :show-letter="showLetter"
          />
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import request from "@/utils/request";
import OldUserInviteFlow from "@/components/OldUserInviteFlow.vue";
import InviteLandingEnvelopeSection from "./inviteLandingSections/InviteLandingEnvelopeSection.vue";
import InviteLandingFormSection from "./inviteLandingSections/InviteLandingFormSection.vue";
import InviteLandingLetterSection from "./inviteLandingSections/InviteLandingLetterSection.vue";
import InviteLandingStatePanel from "./inviteLandingSections/InviteLandingStatePanel.vue";
import InviteLandingSuccessSection from "./inviteLandingSections/InviteLandingSuccessSection.vue";
import {
  formatOnboardingInviteDateTime,
  useInviteLandingPage,
} from "./inviteLandingPageHelpers";

const route = useRoute();

const {
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
} = useInviteLandingPage({
  route,
  request,
  ElMessage,
});
</script>

<style scoped lang="css" src="./InviteLanding.css"></style>

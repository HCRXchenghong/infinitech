<template>
  <section class="envelope-view">
    <div class="envelope-head">
      <div class="badge">{{ inviteTypeLabel }}</div>
      <h1>{{ inviteTitle }}</h1>
      <p>点击打开邀请函</p>
    </div>

    <button class="envelope-card" type="button" @click="openEnvelope">
      <div class="envelope-shadow"></div>
      <div class="envelope-back"></div>
      <div class="envelope-paper" :class="{ extracting: envelopeOpening }">
        <div v-for="idx in 4" :key="idx" class="paper-line"></div>
      </div>
      <div class="envelope-front"></div>
      <div class="envelope-flap" :class="{ open: envelopeOpening }"></div>
      <div class="seal" :class="{ hidden: envelopeOpening }">悦</div>
    </button>
  </section>
</template>

<script setup>
defineProps({
  inviteTypeLabel: {
    type: String,
    default: "",
  },
  inviteTitle: {
    type: String,
    default: "",
  },
  envelopeOpening: {
    type: Boolean,
    default: false,
  },
  openEnvelope: {
    type: Function,
    required: true,
  },
});
</script>

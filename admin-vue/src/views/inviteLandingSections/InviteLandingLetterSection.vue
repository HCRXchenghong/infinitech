<template>
  <section class="letter-view">
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
      <el-button type="primary" size="large" @click="showForm">去填写信息</el-button>
    </footer>
  </section>
</template>

<script setup>
defineProps({
  invite: {
    type: Object,
    default: null,
  },
  inviteTypeLabel: {
    type: String,
    default: "",
  },
  inviteTitle: {
    type: String,
    default: "",
  },
  letterParagraphs: {
    type: Array,
    default: () => [],
  },
  formatOnboardingInviteDateTime: {
    type: Function,
    required: true,
  },
  showForm: {
    type: Function,
    required: true,
  },
});
</script>

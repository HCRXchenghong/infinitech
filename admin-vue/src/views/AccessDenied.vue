<template>
  <div class="access-denied-page">
    <AccessDeniedResultCard
      :action-buttons="actionButtons"
      :subtitle="subtitle"
      :title="title"
    />
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import './AccessDenied.css'
import AccessDeniedResultCard from './accessDeniedSections/AccessDeniedResultCard.vue'
import { useAccessDeniedPage } from './accessDeniedPageHelpers'

const route = useRoute()

const {
  actionButtons,
  subtitle,
  title,
} = useAccessDeniedPage({ route })
</script>

<template>
  <article class="article">
    <h1 class="article-title">{{ notification.title || '未命名通知' }}</h1>
    <div class="article-meta">
      <span>{{ notification.source || '悦享e食' }}</span>
      <span>·</span>
      <span>{{ formatAdminNotificationTime(notification.updated_at || notification.created_at) }}</span>
    </div>

    <el-image
      v-if="notification.cover"
      :src="notification.cover"
      fit="cover"
      class="article-cover"
      :preview-src-list="[notification.cover]"
      preview-teleported
    />

    <div class="article-content">
      <template v-for="(block, index) in blocks" :key="`block_${index}`">
        <p v-if="block.type === 'p'" class="p-block">{{ block.text }}</p>
        <h2 v-else-if="block.type === 'h2'" class="h2-block">{{ block.text }}</h2>
        <blockquote v-else-if="block.type === 'quote'" class="quote-block">{{ block.text }}</blockquote>
        <ul v-else-if="block.type === 'ul'" class="ul-block">
          <li v-for="(item, itemIndex) in block.items" :key="`li_${itemIndex}`">{{ item }}</li>
        </ul>
        <figure v-else-if="block.type === 'img'" class="img-block">
          <el-image
            v-if="block.url"
            :src="block.url"
            fit="cover"
            class="inline-img"
            :preview-src-list="[block.url]"
            preview-teleported
          />
          <figcaption v-if="block.caption">{{ block.caption }}</figcaption>
        </figure>
      </template>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import { formatAdminNotificationTime } from '@infinitech/admin-core';
import { parseNotificationDisplayBlocks } from '@infinitech/domain-core';

const props = defineProps({
  notification: {
    type: Object,
    required: true,
  },
});

const blocks = computed(() => parseNotificationDisplayBlocks(props.notification.content));
</script>

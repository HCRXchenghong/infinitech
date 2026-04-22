<template>
  <div v-if="contextMenu?.show" class="context-menu" :style="menuStyle">
    <div class="context-menu-item" @click="toggleMute">
      {{ contextMenu.chat?.muted ? '取消免打扰' : '消息免打扰' }}
    </div>
    <div class="context-menu-item danger" @click="deleteChat">删除聊天</div>
  </div>
  <div v-if="contextMenu?.show" class="context-menu-mask" @click="closeContextMenu"></div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  closeContextMenu: {
    type: Function,
    required: true,
  },
  contextMenu: {
    type: Object,
    default: () => ({ show: false, x: 0, y: 0, chat: null }),
  },
  deleteChat: {
    type: Function,
    required: true,
  },
  toggleMute: {
    type: Function,
    required: true,
  },
});

const menuStyle = computed(() => ({
  top: `${props.contextMenu?.y || 0}px`,
  left: `${props.contextMenu?.x || 0}px`,
}));
</script>

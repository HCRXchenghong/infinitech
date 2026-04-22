<template>
  <div class="chat-list">
    <div class="chat-list-header">
      <input
        :value="searchQuery"
        placeholder="搜索聊天"
        class="search-input"
        @input="setSearchQuery($event.target.value)"
      />
    </div>
    <div class="chat-list-body">
      <div
        v-for="chat in filteredChats"
        :key="chat.id"
        class="chat-item"
        :class="{ active: selectedChat?.id === chat.id, unread: chat.unread > 0 }"
        @click="selectChat(chat)"
        @contextmenu.prevent="showContextMenu($event, chat)"
      >
        <img v-if="chat.avatar" :src="chat.avatar" class="chat-avatar chat-avatar-img" />
        <div v-else class="chat-avatar">{{ (chat.name || '聊').charAt(0) }}</div>
        <div class="chat-info">
          <div class="chat-name">{{ chat.name }}</div>
          <div class="chat-preview">{{ chat.lastMessage }}</div>
        </div>
        <div class="chat-meta">
          <div class="chat-time">{{ chat.time }}</div>
          <div v-if="chat.unread > 0 && !chat.muted" class="chat-badge">{{ chat.unread }}</div>
          <div v-if="chat.muted" class="chat-muted">已静音</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  filteredChats: {
    type: Array,
    default: () => [],
  },
  searchQuery: {
    type: String,
    default: '',
  },
  selectedChat: {
    type: Object,
    default: null,
  },
  selectChat: {
    type: Function,
    required: true,
  },
  setSearchQuery: {
    type: Function,
    required: true,
  },
  showContextMenu: {
    type: Function,
    required: true,
  },
});
</script>

import { computed } from 'vue';
import { canStartAdminRTCCall, startAdminRTCCall } from '@/utils/adminRtc';

export function buildChatParticipantLabel(chat = {}) {
  switch (chat.role) {
    case 'user':
      return '顾客';
    case 'rider':
      return '骑手';
    case 'merchant':
      return '商家';
    default:
      return '用户';
  }
}

export function useAdminChatRtcActions({ selectedChat, ElMessage, buildPayload }) {
  const canStartRTC = computed(() => canStartAdminRTCCall(selectedChat.value || {}));

  const selectedChatStatusText = computed(() => {
    const chat = selectedChat.value || {};
    return [buildChatParticipantLabel(chat), chat.phone].filter(Boolean).join(' ');
  });

  async function startRTC() {
    if (!selectedChat.value) {
      return;
    }

    try {
      await startAdminRTCCall(buildPayload(selectedChat.value));
    } catch (error) {
      ElMessage.error(error?.message || '发起 RTC 通话失败');
    }
  }

  return {
    canStartRTC,
    selectedChatStatusText,
    startRTC,
  };
}

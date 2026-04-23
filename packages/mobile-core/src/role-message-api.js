import {
  extractEnvelopeData,
  extractPaginatedItems,
  extractSMSResult,
} from "../../contracts/src/http.js";

function trimRoleMessageApiValue(value) {
  return String(value ?? "").trim();
}

function normalizeRoleMessageApiObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function resolveRoleMessageRequester(options = {}) {
  const requester = options.request;
  if (typeof requester !== "function") {
    throw new TypeError("role message api requires a request function");
  }
  return requester;
}

export function createRoleSMSApi(options = {}) {
  const request = resolveRoleMessageRequester(options);
  const extractSMSResultImpl = options.extractSMSResult || extractSMSResult;
  const defaultScene = trimRoleMessageApiValue(options.defaultScene) || "login";

  function requestSMSCode(phone, scene = defaultScene, extra = {}) {
    return request({
      url: "/api/request-sms-code",
      method: "POST",
      data: {
        phone,
        scene,
        ...normalizeRoleMessageApiObject(extra),
      },
      auth: false,
    }).then((response) => extractSMSResultImpl(response));
  }

  function verifySMSCodeCheck(payloadOrPhone, sceneValue, codeValue) {
    const payload = normalizeRoleMessageApiObject(payloadOrPhone);
    const data = payload.phone
      ? {
          phone: payload.phone,
          scene: payload.scene || sceneValue,
          code: payload.code || codeValue,
        }
      : {
          phone: payloadOrPhone,
          scene: sceneValue,
          code: codeValue,
        };

    return request({
      url: "/api/verify-sms-code-check",
      method: "POST",
      data,
      auth: false,
    }).then((response) => extractSMSResultImpl(response));
  }

  return {
    requestSMSCode,
    verifySMSCodeCheck,
  };
}

export function createRoleMessageApi(options = {}) {
  const request = resolveRoleMessageRequester(options);
  const extractEnvelopeDataImpl = options.extractEnvelopeData || extractEnvelopeData;
  const extractPaginatedItemsImpl = options.extractPaginatedItems || extractPaginatedItems;
  const conversationListKeys = Array.isArray(options.conversationListKeys)
    ? options.conversationListKeys
    : ["conversations", "items", "records", "list"];
  const messageListKeys = Array.isArray(options.messageListKeys)
    ? options.messageListKeys
    : ["messages", "items", "records", "list"];

  function fetchConversations() {
    return request({
      url: "/api/messages/conversations",
      method: "GET",
    }).then((payload) => extractPaginatedItemsImpl(payload, {
      listKeys: conversationListKeys,
    }).items);
  }

  function upsertConversation(payload) {
    return request({
      url: "/api/messages/conversations/upsert",
      method: "POST",
      data: payload,
    }).then((response) => extractEnvelopeDataImpl(response) || {});
  }

  function markConversationRead(chatId) {
    return request({
      url: `/api/messages/conversations/${encodeURIComponent(trimRoleMessageApiValue(chatId))}/read`,
      method: "POST",
      data: {},
    });
  }

  function fetchHistory(roomId) {
    return request({
      url: `/api/messages/${encodeURIComponent(trimRoleMessageApiValue(roomId))}`,
      method: "GET",
    }).then((payload) => extractPaginatedItemsImpl(payload, {
      listKeys: messageListKeys,
    }).items);
  }

  return {
    fetchConversations,
    fetchHistory,
    markConversationRead,
    upsertConversation,
  };
}

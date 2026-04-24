import Vue from "vue";
import {
  fetchHistory,
  fetchRiderOrders,
  markConversationRead,
  request,
  upsertConversation,
  uploadImage,
} from "@/shared-ui/api";
import { readRiderAuthIdentity } from "@/shared-ui/auth-session.js";
import { loadSupportRuntimeSettings } from "@/shared-ui/support-runtime";
import { db } from "@/utils/database";
import messageManager from "@/utils/message-manager";
import OrderDetailPopup from "../../components/OrderDetailPopup.vue";
import { createRiderServicePageLogic } from "../../../packages/mobile-core/src/rider-service-page.js";

export default Vue.extend(createRiderServicePageLogic({
  fetchHistory,
  fetchRiderOrders,
  markConversationRead,
  request,
  upsertConversation,
  uploadImage,
  readRiderAuthIdentity,
  loadSupportRuntimeSettings,
  db,
  messageManager,
  OrderDetailPopup,
  uniApp: uni,
}) as any);

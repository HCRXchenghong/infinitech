import { createRoleAuthSessionBindings } from "../../packages/client-sdk/src/role-auth-shell.js";

const merchantAuthBindings = createRoleAuthSessionBindings({
  role: "merchant",
  userType: "merchant",
  profileStorageKey: "merchantProfile",
  tokenStorageKeys: ["token", "access_token"],
  allowLegacyAuthModeFallback: true,
  idSources: ["profile:id", "profile:role_id", "profile:userId", "profile:user_id"],
  clearStorageKeys: [
    "access_token",
    "merchantId",
    "merchantName",
    "merchantCurrentShopId",
  ],
  buildIdentity({ session, profile, readStorage, pickFirstText }) {
    const merchantPhone = pickFirstText([profile.phone, readStorage("merchantPhone")]);
    const merchantId = pickFirstText([
      session.accountId,
      profile.id,
      profile.role_id,
      profile.userId,
      profile.user_id,
      readStorage("merchantId"),
    ]);
    const merchantName = pickFirstText(
      [profile.name, profile.nickname, profile.shopName, readStorage("merchantName")],
      "商户",
    );

    return {
      ...session,
      merchantId,
      merchantPhone,
      merchantName,
      userId: merchantId || merchantPhone,
    };
  },
});

export const MERCHANT_AUTH_SESSION_OPTIONS = merchantAuthBindings.sessionOptions;
export const MERCHANT_STORED_AUTH_RESOLVER_OPTIONS =
  merchantAuthBindings.storedAuthResolverOptions;
export const readMerchantAuthSession = merchantAuthBindings.readRoleAuthSession;
export const ensureMerchantAuthSession = merchantAuthBindings.ensureRoleAuthSession;
export const persistMerchantAuthSession = merchantAuthBindings.persistRoleAuthSession;
export const clearMerchantAuthSession = merchantAuthBindings.clearRoleAuthSession;
export const readMerchantAuthIdentity = merchantAuthBindings.readRoleAuthIdentity;

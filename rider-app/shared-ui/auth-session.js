import { createRoleAuthSessionBindings } from "../../packages/client-sdk/src/role-auth-shell.js"

const riderAuthBindings = createRoleAuthSessionBindings({
  role: "rider",
  userType: "rider",
  profileStorageKey: "riderProfile",
  tokenStorageKeys: ["token", "access_token"],
  allowLegacyAuthModeFallback: true,
  idSources: [
    "storage:riderId",
    "profile:id",
    "profile:userId",
    "profile:user_id",
    "profile:riderId",
  ],
  clearStorageKeys: [
    "access_token",
    "riderId",
    "riderName",
    "riderPhone",
  ],
  buildIdentity({ session, profile, readStorage, pickFirstText }) {
    const riderId = pickFirstText([
      session.accountId,
      profile.id,
      profile.userId,
      profile.user_id,
      profile.riderId,
      readStorage("riderId"),
    ])
    const riderName = pickFirstText(
      [profile.name, profile.realName, profile.nickname, readStorage("riderName")],
      "骑手",
    )
    const riderPhone = pickFirstText([profile.phone, readStorage("riderPhone")])

    return {
      ...session,
      riderId,
      userId: riderId,
      riderName,
      riderPhone,
    }
  },
})

export const RIDER_AUTH_SESSION_OPTIONS = riderAuthBindings.sessionOptions
export const RIDER_STORED_AUTH_RESOLVER_OPTIONS =
  riderAuthBindings.storedAuthResolverOptions
export const readRiderAuthSession = riderAuthBindings.readRoleAuthSession
export const ensureRiderAuthSession = riderAuthBindings.ensureRoleAuthSession
export const persistRiderAuthSession = riderAuthBindings.persistRoleAuthSession
export const clearRiderAuthSession = riderAuthBindings.clearRoleAuthSession
export const readRiderAuthIdentity = riderAuthBindings.readRoleAuthIdentity

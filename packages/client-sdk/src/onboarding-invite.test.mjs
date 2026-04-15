import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultInviteLinkForm,
  createEmptyInviteLinkResult,
  createOnboardingInviteApi,
  extractInviteDetail,
  extractInviteSubmissionResult,
  getInviteRemainingUses,
  normalizeInviteLinkResult,
} from "./onboarding-invite.js";

test("createDefaultInviteLinkForm and createEmptyInviteLinkResult provide stable defaults", () => {
  assert.deepEqual(createDefaultInviteLinkForm(), {
    expires_hours: 72,
    max_uses: 1,
  });

  assert.deepEqual(createEmptyInviteLinkResult(), {
    invite_url: "",
    expires_at: "",
    max_uses: 1,
    used_count: 0,
    remaining_uses: 1,
  });
});

test("normalizeInviteLinkResult supports enveloped payloads and fallback math", () => {
  assert.deepEqual(
    normalizeInviteLinkResult({
      data: {
        invite_url: "https://example.test/invite/merchant-1",
        expires_at: "2026-04-15T00:00:00Z",
        max_uses: 5,
        used_count: 2,
        remaining_uses: 3,
      },
    }),
    {
      invite_url: "https://example.test/invite/merchant-1",
      expires_at: "2026-04-15T00:00:00Z",
      max_uses: 5,
      used_count: 2,
      remaining_uses: 3,
    },
  );

  assert.deepEqual(
    normalizeInviteLinkResult(
      {
        inviteUrl: "https://example.test/invite/legacy-1",
        usedCount: 1,
      },
      { max_uses: 4 },
    ),
    {
      invite_url: "https://example.test/invite/legacy-1",
      expires_at: "",
      max_uses: 4,
      used_count: 1,
      remaining_uses: 3,
    },
  );
});

test("extractInviteDetail and extractInviteSubmissionResult support transport wrappers", () => {
  const wrappedInviteResponse = {
    data: {
      data: {
        invite: {
          invite_type: "rider",
          token_prefix: "abc123",
        },
      },
    },
    status: 200,
    headers: {},
  };

  assert.deepEqual(extractInviteDetail(wrappedInviteResponse), {
    invite_type: "rider",
    token_prefix: "abc123",
  });

  assert.deepEqual(
    extractInviteSubmissionResult({
      data: {
        submission_id: 17,
        invite_type: "old_user",
        entity_type: "user",
        entity_id: 99,
      },
    }),
    {
      submission_id: "17",
      invite_type: "old_user",
      entity_type: "user",
      entity_id: "99",
    },
  );
});

test("getInviteRemainingUses uses normalized remaining count", () => {
  assert.equal(
    getInviteRemainingUses({
      max_uses: 8,
      used_count: 3,
    }),
    5,
  );

  assert.equal(
    getInviteRemainingUses({
      remaining_uses: 2,
      max_uses: 8,
      used_count: 7,
    }),
    2,
  );
});

test("createOnboardingInviteApi binds invite endpoints and normalizes responses", async () => {
  const calls = [];
  const api = createOnboardingInviteApi({
    get(url, config) {
      calls.push({ method: "GET", url, config });
      return Promise.resolve({
        data: {
          data: {
            invite: {
              invite_type: "merchant",
              token_prefix: "merchant-1",
            },
          },
        },
        status: 200,
        headers: {},
      });
    },
    post(url, payload, config) {
      calls.push({ method: "POST", url, payload, config });
      if (url === "/api/admin/onboarding/invites") {
        return Promise.resolve({
          data: {
            data: {
              invite_url: "https://example.test/invite/merchant-1",
              max_uses: 2,
              used_count: 1,
            },
          },
          status: 200,
          headers: {},
        });
      }
      if (url.endsWith("/submit")) {
        return Promise.resolve({
          data: {
            data: {
              submission_id: 88,
              invite_type: "merchant",
              entity_type: "merchant",
              entity_id: 501,
            },
          },
          status: 200,
          headers: {},
        });
      }
      return Promise.resolve({
        data: {
          data: {
            asset_url: "https://cdn.example.test/doc.png",
            asset_id: "asset-1",
          },
        },
        status: 200,
        headers: {},
      });
    },
  });

  assert.deepEqual(
    await api.createAdminInvite({ invite_type: "merchant", max_uses: 2 }),
    {
      invite_url: "https://example.test/invite/merchant-1",
      expires_at: "",
      max_uses: 2,
      used_count: 1,
      remaining_uses: 1,
    },
  );

  assert.deepEqual(await api.fetchInvite("abc xyz"), {
    invite_type: "merchant",
    token_prefix: "merchant-1",
  });

  assert.deepEqual(
    await api.submitInvite("abc xyz", { phone: "13800000000" }),
    {
      submission_id: "88",
      invite_type: "merchant",
      entity_type: "merchant",
      entity_id: "501",
    },
  );

  assert.deepEqual(await api.uploadInviteAsset("abc xyz", { file: true }), {
    asset_url: "https://cdn.example.test/doc.png",
    asset_id: "asset-1",
    url: "https://cdn.example.test/doc.png",
    filename: "",
  });

  assert.deepEqual(calls, [
    {
      method: "POST",
      url: "/api/admin/onboarding/invites",
      payload: { invite_type: "merchant", max_uses: 2 },
      config: undefined,
    },
    {
      method: "GET",
      url: "/api/onboarding/invites/abc%20xyz",
      config: undefined,
    },
    {
      method: "POST",
      url: "/api/onboarding/invites/abc%20xyz/submit",
      payload: { phone: "13800000000" },
      config: undefined,
    },
    {
      method: "POST",
      url: "/api/onboarding/invites/abc%20xyz/upload",
      payload: { file: true },
      config: undefined,
    },
  ]);
});

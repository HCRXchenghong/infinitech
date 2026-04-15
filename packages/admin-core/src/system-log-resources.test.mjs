import test from "node:test";
import assert from "node:assert/strict";

import { extractSystemLogPage } from "./system-log-resources.js";

test("extractSystemLogPage unwraps enveloped system log payloads", () => {
  assert.deepEqual(
    extractSystemLogPage({
      data: {
        items: [{ id: "log-1", actionType: "create" }],
        pagination: {
          page: 2,
          limit: 50,
          total: 120,
        },
        summary: {
          create: 40,
          delete: 10,
          update: 30,
          read: 20,
          system: 15,
          error: 5,
        },
        serviceStatus: {
          checkedAt: "2026-04-16T00:00:00Z",
          overall: "healthy",
          services: [{ key: "go", status: "healthy" }],
        },
      },
    }),
    {
      items: [{ id: "log-1", actionType: "create" }],
      total: 120,
      page: 2,
      limit: 50,
      summary: {
        create: 40,
        delete: 10,
        update: 30,
        read: 20,
        system: 15,
        error: 5,
      },
      serviceStatus: {
        checkedAt: "2026-04-16T00:00:00Z",
        overall: "healthy",
        services: [{ key: "go", status: "healthy" }],
      },
      files: {},
      pagination: {
        total: 120,
        page: 2,
        limit: 50,
      },
    },
  );
});

test("extractSystemLogPage supports legacy root payloads and fills defaults", () => {
  assert.deepEqual(
    extractSystemLogPage({
      items: [{ id: "log-2", actionType: "error" }],
      total: 1,
      serviceStatus: {
        checked_at: "2026-04-16 08:00:00",
      },
      files: {
        goExists: true,
      },
    }),
    {
      items: [{ id: "log-2", actionType: "error" }],
      total: 1,
      page: 0,
      limit: 0,
      summary: {
        create: 0,
        delete: 0,
        update: 0,
        read: 0,
        system: 0,
        error: 0,
      },
      serviceStatus: {
        checkedAt: "2026-04-16 08:00:00",
        overall: "unknown",
        services: [],
      },
      files: {
        goExists: true,
      },
      pagination: {
        total: 1,
        page: 0,
        limit: 0,
      },
    },
  );
});

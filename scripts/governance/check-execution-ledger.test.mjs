import test from "node:test";
import assert from "node:assert/strict";

import {
  EXECUTION_LEDGER_PATH,
  parseExecutionLedger,
  resolveChangedFiles,
  validateExecutionLedger,
} from "./check-execution-ledger.mjs";

const VALID_LEDGER = `# Execution Ledger

## TASK-20260425-LEDGER-001
- Source: User request to enforce execution ledger discipline.
- Goal: Keep root execution ledger as the single source of active work.
- Scope: Root governance docs, CI, scripts.
- Planned Changes: Add ledger checks, CI gate, and root ledger policy.
- Risks: CI drift, incomplete task descriptions.
- Acceptance: Ledger validation passes and CI enforces synchronized edits.
- Evidence: CI logs and updated governance scripts.
- Dependencies: Root package scripts and workflow updates.
`;

test("parseExecutionLedger extracts task sections and required fields", () => {
  const tasks = parseExecutionLedger(VALID_LEDGER);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].taskId, "TASK-20260425-LEDGER-001");
  assert.equal(tasks[0].fields.get("Goal"), "Keep root execution ledger as the single source of active work.");
});

test("validateExecutionLedger rejects empty ledgers and missing fields", () => {
  const empty = validateExecutionLedger({ exists: true, source: "" });
  assert.match(empty.failures[0], /empty/);

  const missingField = validateExecutionLedger({
    exists: true,
    source: VALID_LEDGER.replace("- Risks: CI drift, incomplete task descriptions.\n", ""),
    changedFiles: [EXECUTION_LEDGER_PATH],
  });
  assert.ok(missingField.failures.some((failure) => /missing field: Risks/.test(failure)));
});

test("validateExecutionLedger rejects duplicate ids and forbidden completion markers", () => {
  const duplicate = validateExecutionLedger({
    exists: true,
    source: `${VALID_LEDGER}\n## TASK-20260425-LEDGER-001\n- Source: duplicate\n- Goal: duplicate\n- Scope: duplicate\n- Planned Changes: duplicate\n- Risks: duplicate\n- Acceptance: duplicate\n- Evidence: duplicate\n- Dependencies: duplicate\n`,
    changedFiles: [EXECUTION_LEDGER_PATH],
  });
  assert.ok(duplicate.failures.some((failure) => /duplicate task id/.test(failure)));

  const completed = validateExecutionLedger({
    exists: true,
    source: VALID_LEDGER.replace(
      "- Risks: CI drift, incomplete task descriptions.\n",
      "- Risks: completed tasks remaining in ledger.\n",
    ),
    changedFiles: [EXECUTION_LEDGER_PATH],
  });
  assert.ok(completed.failures.some((failure) => /forbidden completion\/status marker/.test(failure)));
});

test("validateExecutionLedger requires ledger edits when substantive files change", () => {
  const missingSync = validateExecutionLedger({
    exists: true,
    source: VALID_LEDGER,
    changedFiles: ["README.md"],
  });
  assert.ok(missingSync.failures.some((failure) => /must be updated together/.test(failure)));

  const synced = validateExecutionLedger({
    exists: true,
    source: VALID_LEDGER,
    changedFiles: ["README.md", EXECUTION_LEDGER_PATH],
  });
  assert.deepEqual(synced.failures, []);
});

test("resolveChangedFiles prefers current working tree and untracked files over historical diff", () => {
  const changedFiles = resolveChangedFiles({
    workingTreeChangedFiles: ["README.md"],
    stagedChangedFiles: ["scripts/governance/check-execution-ledger.mjs"],
    untrackedFiles: [EXECUTION_LEDGER_PATH],
    pushChangedFiles: ["package.json"],
  });

  assert.deepEqual(changedFiles, [
    "README.md",
    "scripts/governance/check-execution-ledger.mjs",
    EXECUTION_LEDGER_PATH,
  ]);
});

test("resolveChangedFiles falls back to pull request diff when local tree is clean", () => {
  const changedFiles = resolveChangedFiles({
    env: {
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_BASE_REF: "main",
    },
    workingTreeChangedFiles: [],
    stagedChangedFiles: [],
    untrackedFiles: [],
    prChangedFiles: ["README.md", EXECUTION_LEDGER_PATH],
  });

  assert.deepEqual(changedFiles, ["README.md", EXECUTION_LEDGER_PATH]);
});

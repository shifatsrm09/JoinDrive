import test from "node:test";
import assert from "node:assert/strict";
import { getAccountStorage, getStorageSummary } from "../../src/utils/storage.ts";

const GB = 1024 ** 3;
const account = (email, storage, connected = true) => ({ email, storage, connected });
const workspace = account("person@school.edu", {
  usage: String(112136.52 * GB), limit: String(226780 * GB), usageInDrive: String(4 * GB),
});
const gmail = account("person@gmail.com", {
  usage: String(10 * GB), limit: String(15 * GB), usageInDrive: String(3 * GB),
});

test("Workspace card uses Drive usage and never treats the organization pool as a personal limit", () => {
  const result = getAccountStorage(workspace);
  assert.equal(result.used, 4 * GB);
  assert.equal(result.limit, null);
  assert.equal(result.percentage, null);
});

test("consumer accounts retain all-service storage and quota", () => {
  for (const email of ["person@gmail.com", "person@GOOGLEMAIL.COM"]) {
    const result = getAccountStorage({ ...gmail, email });
    assert.equal(result.used, 10 * GB);
    assert.equal(result.limit, 15 * GB);
    assert.ok(Math.abs(result.percentage - 100 * 10 / 15) < 0.001);
  }
});

test("mixed accounts sum only Drive usage, including multiple accounts in one organization", () => {
  const result = getStorageSummary([gmail, workspace, workspace]);
  assert.equal(result.used, 11 * GB);
  assert.equal(result.limit, null);
  assert.equal(result.percentage, null);
  assert.equal(result.partial, false);
});

test("missing Workspace usage never falls back to the organization total", () => {
  assert.equal(getAccountStorage({ ...workspace, storage: { usage: "999999" } }).used, null);
});

test("unknown, disconnected and invalid storage is not reported as zero or unlimited", () => {
  for (const storage of [null, {}, { usageInDrive: "" }, { usageInDrive: "NaN" }, { usageInDrive: "-1" }]) {
    assert.equal(getAccountStorage({ ...workspace, storage }).used, null);
  }
  assert.equal(getAccountStorage({ ...gmail, connected: false }).used, null);
  assert.equal(getAccountStorage({ ...gmail, storage: { usage: "0", limit: "0" } }).percentage, null);
  assert.equal(getAccountStorage({ ...workspace, storage: { usageInDrive: "0" } }).used, 0);
  assert.equal(getStorageSummary([]).used, null);
  assert.equal(getStorageSummary([gmail, { ...workspace, connected: false }]).partial, true);
});

test("personal-only summary preserves quota and clamps an exceeded limit", () => {
  assert.equal(getStorageSummary([gmail, gmail]).limit, 30 * GB);
  assert.equal(getAccountStorage({ ...gmail, storage: { usage: "20", limit: "15" } }).percentage, 100);
});

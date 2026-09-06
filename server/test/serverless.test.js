import assert from "node:assert/strict";
import { after, afterEach, before, mock, test } from "node:test";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import vm from "node:vm";
import ts from "typescript";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { oauth2_v2 } from "googleapis/build/src/apis/oauth2/v2.js";
import { drive_v3 } from "googleapis/build/src/apis/drive/v3.js";

process.env.CLIENT_URL = "https://joindrive.example";
process.env.MONGODB_URI = "mongodb://database.invalid/joindrive-test";
process.env.JWT_SECRET = randomBytes(32).toString("hex");
process.env.GOOGLE_CLIENT_ID = "test-client";
process.env.GOOGLE_CLIENT_SECRET = "test-secret";
process.env.GOOGLE_REDIRECT_URI = `${process.env.CLIENT_URL}/api/auth/google/callback`;
process.env.GOOGLE_CONNECT_REDIRECT_URI = `${process.env.CLIENT_URL}/api/auth/google/connect/callback`;
process.env.VERCEL = "1";
process.env.NODE_ENV = "production";

const { default: app } = await import("../../api/index.js");
const { connectDB } = await import("../config/db.js");
const { default: User } = await import("../models/User.js");
const { default: GoogleAccount } = await import("../models/GoogleAccount.js");
const { getAuthenticatedClient } = await import("../services/google.service.js");

const userId = new mongoose.Types.ObjectId().toString();
const accountId = new mongoose.Types.ObjectId().toString();
const authCookie = `token=${jwt.sign({ userId }, process.env.JWT_SECRET)}`;
let server;
let baseUrl;

before(async () => {
  server = createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
});

afterEach(() => {
  mock.restoreAll();
  mongoose.connection._readyState = 0;
});

function mockDatabase() {
  mongoose.connection._readyState = 1;
  mock.method(User, "findById", async () => ({ _id: userId }));
}

test("health and unauthorized requests need no database, and API responses are never cached", async () => {
  const connect = mock.method(mongoose, "connect", () => assert.fail("Unexpected database connection"));
  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).success, true);
  assert.equal(health.headers.get("cache-control"), "private, no-store");
  const unauthorized = await fetch(`${baseUrl}/api/drive/accounts`);
  assert.equal(unauthorized.status, 401);
  const unknown = await fetch(`${baseUrl}/api/unknown`);
  assert.equal(unknown.status, 404);
  assert.match(unknown.headers.get("content-type"), /application\/json/);
  assert.equal(connect.mock.callCount(), 0);
});

test("database connections are shared, reused, and retried after failure", async () => {
  mongoose.connection._readyState = 0;
  let release;
  const connect = mock.method(mongoose, "connect", async (uri, options) => {
    assert.equal(uri, process.env.MONGODB_URI);
    assert.equal(options.maxPoolSize, 5);
    await new Promise(resolve => { release = resolve; });
    mongoose.connection._readyState = 1;
    return mongoose;
  });
  const first = connectDB();
  const second = connectDB();
  assert.equal(connect.mock.callCount(), 1);
  release();
  await Promise.all([first, second]);
  await connectDB();
  assert.equal(connect.mock.callCount(), 1);
  mongoose.connection._readyState = 0;
  connect.mock.mockImplementation(async () => { throw new Error("offline"); });
  await assert.rejects(connectDB(), /offline/);
  connect.mock.mockImplementation(async () => { mongoose.connection._readyState = 1; return mongoose; });
  await connectDB();
  assert.equal(connect.mock.callCount(), 3);
});

test("database outages return 503 instead of an authentication error", async () => {
  mongoose.connection._readyState = 0;
  mock.method(mongoose, "connect", async () => { throw new Error("offline"); });
  const response = await fetch(`${baseUrl}/api/drive/accounts`, { headers: { Cookie: authCookie } });
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /try again/);
});

test("OAuth login uses the configured HTTPS callback and completes with secure cookies", async () => {
  mockDatabase();
  mock.method(OAuth2Client.prototype, "getToken", async () => ({ tokens: { access_token: "test-access" } }));
  mock.method(oauth2_v2.Resource$Userinfo.prototype, "get", async () => ({ data: { id: "test-google", name: "Test", email: "test@example.com" } }));
  mock.method(GoogleAccount, "findOne", async () => ({ isPrimary: true, userId, save: async () => {} }));
  const login = await fetch(`${baseUrl}/api/auth/google?popup=1`, { redirect: "manual" });
  const googleUrl = new URL(login.headers.get("location"));
  assert.equal(googleUrl.searchParams.get("redirect_uri"), process.env.GOOGLE_REDIRECT_URI);
  const cookie = login.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  const state = googleUrl.searchParams.get("state");
  const callback = await fetch(`${baseUrl}/api/auth/google/callback?code=test&state=${encodeURIComponent(state)}`, {
    redirect: "manual",
    headers: { Cookie: cookie.split(";")[0] },
  });
  assert.equal(callback.status, 200);
  assert.match(await callback.text(), /https:\/\/joindrive\.example\/explorer/);
  const tokenCookie = callback.headers.getSetCookie().find(value => value.startsWith("token="));
  assert.match(tokenCookie, /Secure/);
  const token = decodeURIComponent(tokenCookie.split(";")[0].slice("token=".length));
  assert.equal(jwt.verify(token, process.env.JWT_SECRET).userId, userId);
  const logout = await fetch(`${baseUrl}/api/auth/logout`, { method: "POST" });
  assert.match(logout.headers.get("set-cookie"), /token=;.*Path=\/;.*Secure/);
});

test("OAuth rejects invalid state before contacting Google or the database", async () => {
  mock.method(OAuth2Client.prototype, "getToken", () => assert.fail("Unexpected token exchange"));
  mock.method(mongoose, "connect", () => assert.fail("Unexpected connection"));
  const response = await fetch(`${baseUrl}/api/auth/google/callback?code=test&state=invalid`, { redirect: "manual" });
  assert.equal(new URL(response.headers.get("location")).searchParams.get("error"), "invalid_state");
});

test("connecting a Drive uses its own configured callback and secure state cookie", async () => {
  mockDatabase();
  const response = await fetch(`${baseUrl}/api/auth/google/connect?popup=1`, {
    headers: { Cookie: authCookie },
    redirect: "manual",
  });
  const googleUrl = new URL(response.headers.get("location"));
  assert.equal(googleUrl.searchParams.get("redirect_uri"), process.env.GOOGLE_CONNECT_REDIRECT_URI);
  const state = jwt.verify(googleUrl.searchParams.get("state"), process.env.JWT_SECRET);
  assert.equal(state.userId, userId);
  assert.equal(state.popup, true);
  assert.match(response.headers.get("set-cookie"), /oauth_state=.*Secure/);
});

test("token refresh persistence finishes before the authenticated client is returned", async () => {
  let finishSave;
  let resolved = false;
  mock.method(OAuth2Client.prototype, "refreshAccessToken", async function () {
    const credentials = { access_token: "new-access", refresh_token: "existing-refresh", expiry_date: Date.now() + 3_600_000 };
    this.setCredentials(credentials);
    return { credentials };
  });
  mock.method(GoogleAccount, "updateOne", async (filter, update) => {
    assert.equal(filter._id, accountId);
    assert.equal(update.$set.accessToken, "new-access");
    await new Promise(resolve => { finishSave = resolve; });
  });
  const pending = getAuthenticatedClient({ _id: accountId, accessToken: "expired", refreshToken: "existing-refresh", expiryDate: 0 })
    .then(client => { resolved = true; return client; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(resolved, false);
  finishSave();
  assert.equal((await pending).credentials.access_token, "new-access");
});

test("downloads stream beyond the buffered response limit", async () => {
  mockDatabase();
  mock.method(GoogleAccount, "findOne", async () => ({ _id: accountId, accessToken: "test-access", expiryDate: Date.now() + 3_600_000 }));
  const size = 6 * 1024 * 1024;
  mock.method(drive_v3.Resource$Files.prototype, "get", async params => {
    if (params.alt === "media") {
      return { data: Readable.from([Buffer.alloc(size / 2), Buffer.alloc(size / 2)]) };
    }
    return { data: { name: "test.bin", mimeType: "application/octet-stream", size: String(size) } };
  });
  const response = await fetch(`${baseUrl}/api/drive/${accountId}/files/test/download`, { headers: { Cookie: authCookie } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-disposition"), /test.bin/);
  assert.equal((await response.arrayBuffer()).byteLength, size);
});

test("upload initialization only sends metadata and returns a direct Google session", async () => {
  mockDatabase();
  mock.method(GoogleAccount, "findOne", async filter => {
    assert.equal(filter.userId, userId);
    assert.equal(filter._id, accountId);
    return { _id: accountId, accessToken: "test-access", expiryDate: Date.now() + 3_600_000 };
  });
  mock.method(drive_v3.Resource$Files.prototype, "generateIds", async () => ({ data: { ids: ["reserved-file"] } }));
  const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?upload_id=test-session";
  mock.method(OAuth2Client.prototype, "request", async options => {
    assert.equal(options.url, "https://www.googleapis.com/upload/drive/v3/files");
    assert.equal(options.params.uploadType, "resumable");
    assert.equal(options.headers["X-Upload-Content-Length"], "5368709120");
    assert.deepEqual(options.data, {
      id: "reserved-file", name: "large.bin", mimeType: "application/octet-stream", parents: ["root"],
    });
    return { headers: new Headers({ location: uploadUrl }) };
  });
  const response = await fetch(`${baseUrl}/api/drive/${accountId}/upload`, {
    method: "POST",
    headers: { Cookie: authCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "large.bin", mimeType: "application/octet-stream", size: 5 * 1024 ** 3 }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, uploadUrl, fileId: "reserved-file" });
});

test("relative production API URLs and local URL alternatives both work", async () => {
  const source = await readFile(new URL("../../src/api/config.ts", import.meta.url), "utf8");
  for (const [setting, origin, expected] of [
    ["/api", "https://joindrive.example", "/api"],
    [undefined, "https://joindrive.example", "/api"],
    ["https://desktop.example/api,https://phone.example/api", "https://phone.example", "https://phone.example/api"],
  ]) {
    const compiled = ts.transpileModule(source.replace("import.meta.env.VITE_API_URL", JSON.stringify(setting) || "undefined"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    const context = { exports: {}, URL, window: { location: new URL(origin) } };
    vm.runInNewContext(compiled, context);
    assert.equal(context.exports.API_BASE_URL, expected);
  }
});

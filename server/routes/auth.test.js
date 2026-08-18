import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import sharedRegistry from "../data/sharedRegistry.js";

const ADMIN = { username: "jashwanthd@stylecraftus.com", password: "123456789" };
const TEST_VIEWER = { username: "auth-test-viewer@stylecraftus.com", name: "Auth Test Viewer", password: "TestViewerPass123!" };

describe("Phase 9 auth", () => {
  beforeAll(async () => {
    await sharedRegistry.ready;
  });

  it("rejects login with the wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({ username: ADMIN.username, password: "not-the-password" });
    expect(res.status).toBe(401);
  });

  it("logs an admin in and sets a session cookie", async () => {
    const res = await request(app).post("/api/auth/login").send(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ username: ADMIN.username, name: expect.any(String), role: "admin" });
    expect(res.headers["set-cookie"]?.[0]).toMatch(/^stylecraft_session=/);
  });

  it("blocks an unauthenticated request to a protected route", async () => {
    const res = await request(app).get("/api/sales/metrics");
    expect(res.status).toBe(401);
  });

  it("allows an authenticated admin through to a protected route", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send(ADMIN);
    const res = await agent.get("/api/sales/metrics");
    expect(res.status).toBe(200);
  });

  it("blocks a viewer from an admin-only router (Data Entry) but allows an admin through", async () => {
    const adminAgent = request.agent(app);
    await adminAgent.post("/api/auth/login").send(ADMIN);
    await adminAgent.post("/api/users").send(TEST_VIEWER).expect(200);

    try {
      const viewerAgent = request.agent(app);
      await viewerAgent.post("/api/auth/login").send({ username: TEST_VIEWER.username, password: TEST_VIEWER.password });

      const viewerRes = await viewerAgent.get("/api/entry/coverage");
      expect(viewerRes.status).toBe(403);

      const adminRes = await adminAgent.get("/api/entry/coverage");
      expect(adminRes.status).toBe(200);

      // Viewer dashboards must still work — role gating is Data Entry/Data/Export/Users only.
      const viewerDashboard = await viewerAgent.get("/api/sales/metrics");
      expect(viewerDashboard.status).toBe(200);

      // /api/data is split, not blanket-gated: /status and /stream feed every
      // dashboard's date anchoring and live updates, so viewers need them too.
      // Only the upload/apply/template/versions routes are actually admin-only.
      const viewerStatus = await viewerAgent.get("/api/data/status");
      expect(viewerStatus.status).toBe(200);
      const viewerVersions = await viewerAgent.get("/api/data/versions");
      expect(viewerVersions.status).toBe(403);
      const viewerTemplate = await viewerAgent.get("/api/data/template");
      expect(viewerTemplate.status).toBe(403);
    } finally {
      // Clean up through the same HTTP path that created it — the real
      // users.json must never keep a test account, in any process/module
      // instance this ends up running against.
      await adminAgent.delete(`/api/users/${encodeURIComponent(TEST_VIEWER.username)}`);
    }
  });
});

const express = require("express");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const userService = require("../services/userService");
const { isAllowedEmail } = require("../data/allowedEmails");
const { requireAuth, setSessionCookie, clearSessionCookie } = require("../middleware/auth");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  try {
    const user = await userService.verifyCredentials(username, password);
    if (!user) return res.status(401).json({ error: "Incorrect username or password" });
    setSessionCookie(res, user);
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Names a Google account holder from their email's local part when Google
// doesn't hand back a real name (rare, but the account might have none set)
// — same fallback the old email-only login used.
function nameFromEmail(email) {
  return email
    .split("@")[0]
    .split(/[._]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Replaced the earlier email-only gate (type any allowed address, no proof
// you own it) with real "Sign in with Google" — StyleCraft's email runs on
// Google Workspace, so a successful Google sign-in IS proof of owning that
// mailbox. The allowlist (allowedEmails.js) still gates who's let in after
// that — Workspace membership alone isn't enough, only the same ~16
// directors as before. Grants the same "viewer" role/session shape as
// every other non-admin account, so every existing requireAuth/requireRole
// check downstream needs no changes.
const OAUTH_STATE_COOKIE = "stylecraft_oauth_state";

function googleClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) return null;
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

router.get("/google", (req, res) => {
  const client = googleClient();
  if (!client) return res.status(503).send("Google sign-in isn't configured yet — contact your administrator.");

  // CSRF guard: a random value round-tripped through Google and checked
  // against this same short-lived cookie on the way back, so the callback
  // can tell a real sign-in redirect apart from a forged one.
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie(OAUTH_STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", maxAge: 5 * 60 * 1000 });

  const url = client.generateAuthUrl({
    scope: ["openid", "email", "profile"],
    hd: "stylecraftus.com", // narrows Google's account picker; the real check is server-side below
    prompt: "select_account",
    state,
  });
  res.redirect(url);
});

router.get("/google/callback", async (req, res) => {
  const client = googleClient();
  if (!client) return res.status(503).send("Google sign-in isn't configured yet — contact your administrator.");

  const { code, state } = req.query;
  const expectedState = req.cookies?.[OAUTH_STATE_COOKIE];
  res.clearCookie(OAUTH_STATE_COOKIE);

  const fail = (message) => res.redirect(`/login?error=${encodeURIComponent(message)}`);
  if (!code || !state || state !== expectedState) return fail("Sign-in failed — please try again.");

  try {
    const { tokens } = await client.getToken({ code, redirect_uri: process.env.GOOGLE_REDIRECT_URI });
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const email = String(payload?.email ?? "").trim().toLowerCase();

    // email_verified is Google's own confirmation the address is real and
    // owned by this account — isAllowedEmail is StyleCraft's director list.
    // Both must hold; neither alone is the access decision.
    if (!payload?.email_verified || !isAllowedEmail(email)) {
      return fail("This Google account isn't on the approved list. Contact your administrator.");
    }

    setSessionCookie(res, { username: email, name: payload.name || nameFromEmail(email), role: "viewer" });
    res.redirect("/");
  } catch {
    fail("Sign-in failed — please try again.");
  }
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;

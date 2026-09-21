const express = require("express");
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

// A whole shared password (the old guest account) let anyone in — this
// checks the typed email against a fixed staff allowlist instead. No
// password: whoever holds that email address's convenience is worth more
// here than proving ownership of it, which is a deliberate, informed
// tradeoff (see allowedEmails.js) — not an oversight. Grants the same
// "viewer" role/session as any other non-admin account, so every existing
// requireAuth/requireRole check downstream needs no changes.
function nameFromEmail(email) {
  return email
    .split("@")[0]
    .split(/[._]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

router.post("/email-access", (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "Enter your work email." });
  if (!isAllowedEmail(email)) {
    return res.status(403).json({ error: "This email doesn't have access yet. Contact your administrator to be added." });
  }
  setSessionCookie(res, { username: email, name: nameFromEmail(email), role: "viewer" });
  res.json({ user: { username: email, name: nameFromEmail(email), role: "viewer" } });
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;

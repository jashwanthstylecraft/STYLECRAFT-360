const jwt = require("jsonwebtoken");

// No .env / real deployment secret set → generate one in memory at boot.
// Sessions still work, they just don't survive a server restart (everyone
// has to log in again) until a real SESSION_SECRET is configured.
let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  sessionSecret = require("crypto").randomBytes(32).toString("hex");
  console.warn(
    "[auth] SESSION_SECRET is not set — using a random in-memory secret. " +
      "Every server restart will invalidate all sessions. Set SESSION_SECRET (see .env.example) before real deployment."
  );
}

const COOKIE_NAME = "stylecraft_session";
const TOKEN_TTL = "30d";

function signSession(user) {
  return jwt.sign({ username: user.username, name: user.name, role: user.role }, sessionSecret, { expiresIn: TOKEN_TTL });
}

function setSessionCookie(res, user) {
  res.cookie(COOKIE_NAME, signSession(user), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const { username, name, role } = jwt.verify(token, sessionSecret);
    req.user = { username, name, role };
    next();
  } catch {
    res.status(401).json({ error: "Session expired or invalid" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

module.exports = { requireAuth, requireRole, setSessionCookie, clearSessionCookie, COOKIE_NAME };

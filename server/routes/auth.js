const express = require("express");
const userService = require("../services/userService");
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

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;

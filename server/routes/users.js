const express = require("express");
const userService = require("../services/userService");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ users: userService.listUsers() });
});

router.post("/", (req, res) => {
  const { username, name, password } = req.body ?? {};
  try {
    const users = userService.addViewer({ username, name, password });
    res.json({ users });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:username", (req, res) => {
  try {
    const users = userService.removeUser(req.params.username);
    res.json({ users });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:username/reset-password", (req, res) => {
  try {
    userService.resetPassword(req.params.username, req.body?.password);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

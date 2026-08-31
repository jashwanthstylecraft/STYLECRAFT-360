const express = require("express");
const userService = require("../services/userService");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    res.json({ users: await userService.listUsers() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const { username, name, password } = req.body ?? {};
  try {
    const users = await userService.addViewer({ username, name, password });
    res.json({ users });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:username", async (req, res) => {
  try {
    const users = await userService.removeUser(req.params.username);
    res.json({ users });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:username/reset-password", async (req, res) => {
  try {
    await userService.resetPassword(req.params.username, req.body?.password);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

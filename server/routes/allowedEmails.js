// Manages the Google Sign-In allowlist (data/allowedEmails.js) — who's
// allowed to log in as a director, as opposed to the `users` table (Team
// panel), which is admin accounts with real passwords. Mounted admin-only
// in app.js, same as hidden-metrics/custom-metrics.
const express = require("express");
const allowedEmails = require("../data/allowedEmails");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ emails: allowedEmails.getAllowedEmails() });
});

router.post("/", async (req, res) => {
  try {
    await allowedEmails.addAllowedEmail(req.body?.email);
    await allowedEmails.ensureFreshAllowedEmails(); // the add invalidated the cache; re-fetch for the response
    res.json({ emails: allowedEmails.getAllowedEmails() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:email", async (req, res) => {
  try {
    await allowedEmails.removeAllowedEmail(req.params.email);
    await allowedEmails.ensureFreshAllowedEmails();
    res.json({ emails: allowedEmails.getAllowedEmails() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

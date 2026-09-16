// Thin wrapper around Nodemailer's Gmail transport. Credentials come from
// env vars only (server/.env locally, Vercel project env vars in
// production) — never hardcoded, never logged.
let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set to send email (see server/.env.example).");
  }

  const nodemailer = require("nodemailer");
  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cachedTransporter;
}

async function sendMail({ to, subject, html, text }) {
  const transporter = getTransporter();
  return transporter.sendMail({
    from: `"StyleCraft 360" <${process.env.GMAIL_USER}>`,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
    text,
  });
}

module.exports = { sendMail };

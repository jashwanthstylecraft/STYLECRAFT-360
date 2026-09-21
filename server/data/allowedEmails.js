// Staff allowed through the email-only access gate (client/src/pages/Login.jsx)
// — no password, just a matching email. No self-serve admin panel for this
// list yet: adding or removing someone means editing this file and
// redeploying. Matching is case-insensitive; the list itself stays lowercase.
const ALLOWED_EMAILS = [
  "allan@stylecraftus.com",
  "austin@stylecraftus.com",
  "caryn@stylecraftus.com",
  "support@stylecraftus.com",
  "jason@stylecraftus.com",
  "ken.russo@stylecraftus.com",
  "elizabetho@stylecraftus.com",
  "mark@stylecraftus.com",
  "marlog@stylecraftus.com",
  "nadzeyam@stylecraftus.com",
  "peterg@stylecraftus.com",
  "steve@stylecraftus.com",
  "tres@stylecraftus.com",
  "victoriab@stylecraftus.com",
  "victoria@stylecraftus.com",
  "spencer@stylecraftus.com",
];

function isAllowedEmail(email) {
  return ALLOWED_EMAILS.includes(String(email ?? "").trim().toLowerCase());
}

module.exports = { isAllowedEmail, ALLOWED_EMAILS };

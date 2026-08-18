// Break-glass account recovery — run directly with Node, no server needed:
//   node server/scripts/reset-password.js <username> <newPassword>
// Edits users.json directly, bypassing the API/auth entirely. For when both
// admins are locked out and there's no other way back in.
const userService = require("../services/userService");

const [username, newPassword] = process.argv.slice(2);

if (!username || !newPassword) {
  console.error("Usage: node reset-password.js <username> <newPassword>");
  process.exit(1);
}

try {
  userService.resetPassword(username, newPassword);
  console.log(`Password reset for ${username}.`);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

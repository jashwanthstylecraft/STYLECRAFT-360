// Phase 1 stub — no auth is enforced yet. Wired in now so Phase 4 can turn on
// role-based access (JWT/session verification, req.user, role checks) without
// touching route files: they already call next() through this middleware.
function requireAuth(req, res, next) {
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    next();
  };
}

module.exports = { requireAuth, requireRole };

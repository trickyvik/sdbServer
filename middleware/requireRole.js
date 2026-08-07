// Use AFTER the `auth` middleware — relies on req.admin being set from the JWT.
// Usage: router.post("/admins", auth, requireRole("superadmin"), handler)
module.exports = function requireRole(...allowedRoles) {
  return function (req, res, next) {
    if (!req.admin) {
      return res.status(401).json({ message: "Missing token" });
    }
    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ message: "You do not have permission to perform this action." });
    }
    next();
  };
};

const express = require("express");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const asyncHandler = require("../middleware/asyncHandler");
const {
  loginRules,
  mongoIdParam,
  createAdminRules,
  updateAdminRules,
  changePasswordRules,
} = require("../middleware/validators");

const router = express.Router();

router.post(
  "/login",
  loginRules,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email: String(email).toLowerCase().trim() });
    // Same message whether the email doesn't exist or the password is wrong,
    // so no one can use this endpoint to discover valid admin emails.
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });
    if (!admin.isActive) return res.status(403).json({ message: "This admin account has been disabled." });
    const ok = await admin.verifyPassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    admin.lastLoginAt = new Date();
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, email: admin.email, name: admin.name, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );
    res.json({ token, admin: { id: admin._id, email: admin.email, name: admin.name, role: admin.role } });
  })
);

router.get("/me", auth, (req, res) => {
  res.json({ admin: req.admin });
});

// PUT /api/admin/me/password — any logged-in admin can change their own password
router.put(
  "/me/password",
  auth,
  changePasswordRules,
  asyncHandler(async (req, res) => {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    const ok = await admin.verifyPassword(req.body.currentPassword);
    if (!ok) return res.status(401).json({ message: "Current password is incorrect" });
    admin.passwordHash = await Admin.hashPassword(req.body.newPassword);
    await admin.save();
    res.json({ message: "Password updated successfully." });
  })
);

// ---- Admin-user management (superadmin only) ----

// GET /api/admin/users — list all admin accounts
router.get(
  "/users",
  auth,
  requireRole("superadmin"),
  asyncHandler(async (req, res) => {
    const admins = await Admin.find().select("-passwordHash").sort({ createdAt: -1 });
    res.json({ data: admins });
  })
);

// POST /api/admin/users — create a new admin account
router.post(
  "/users",
  auth,
  requireRole("superadmin"),
  createAdminRules,
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    const existing = await Admin.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) return res.status(409).json({ message: "An admin with this email already exists." });
    const passwordHash = await Admin.hashPassword(password);
    const admin = new Admin({ name, email, passwordHash, role: role || "admin" });
    await admin.save();
    const { passwordHash: _omit, ...safe } = admin.toObject();
    res.status(201).json(safe);
  })
);

// PUT /api/admin/users/:id — update role / active status / name
router.put(
  "/users/:id",
  auth,
  requireRole("superadmin"),
  mongoIdParam,
  updateAdminRules,
  asyncHandler(async (req, res) => {
    if (req.params.id === req.admin.id && req.body.role && req.body.role !== "superadmin") {
      return res.status(400).json({ message: "You cannot remove your own superadmin role." });
    }
    if (req.params.id === req.admin.id && req.body.isActive === false) {
      return res.status(400).json({ message: "You cannot deactivate your own account." });
    }
    const updated = await Admin.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");
    if (!updated) return res.status(404).json({ message: "Admin not found" });
    res.json(updated);
  })
);

// DELETE /api/admin/users/:id — remove an admin account
router.delete(
  "/users/:id",
  auth,
  requireRole("superadmin"),
  mongoIdParam,
  asyncHandler(async (req, res) => {
    if (req.params.id === req.admin.id) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }
    const deleted = await Admin.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Admin not found" });
    res.json({ message: "Admin removed successfully." });
  })
);

module.exports = router;

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "Administrator" },
    // "superadmin" can create/manage other admins and change roles.
    // "admin" has full access to content modules but not admin-user management.
    role: { type: String, enum: ["superadmin", "admin"], default: "admin" },
    isActive: { type: Boolean, default: true },
    avatarFileId: { type: mongoose.Schema.Types.ObjectId, default: null }, // GridFS file id
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

adminSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

adminSchema.statics.hashPassword = function (password) {
  return bcrypt.hash(password, 10);
};

module.exports = mongoose.model("Admin", adminSchema);

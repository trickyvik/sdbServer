require("dotenv").config();
require("../utils/configureDns")();
const mongoose = require("mongoose");
const Admin = require("../models/Admin");

(async () => {
  const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error("Set MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD in .env first.");
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI);
  const email = ADMIN_EMAIL.toLowerCase().trim();
  const existing = await Admin.findOne({ email });
  const passwordHash = await Admin.hashPassword(ADMIN_PASSWORD);
  if (existing) {
    existing.passwordHash = passwordHash;
    // Older accounts created before RBAC was added may not have a role
    // persisted in the DB yet — make sure the original admin is a superadmin.
    if (!existing.role) existing.role = "superadmin";
    await existing.save();
    console.log(`Admin password reset for ${email} (role: ${existing.role})`);
  } else {
    await Admin.create({ email, passwordHash, role: "superadmin" });
    console.log(`Admin created: ${email} (role: superadmin)`);
  }
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

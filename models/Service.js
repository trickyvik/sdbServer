const mongoose = require("mongoose");

// Keep this list in sync with client-responsive/src/lib/icons.js — the
// frontend only knows how to render these icon names.
const ALLOWED_ICONS = [
  "Globe2",
  "FileCheck2",
  "Plane",
  "Briefcase",
  "GraduationCap",
  "Landmark",
  "ShieldCheck",
  "Users2",
  "Compass",
  "Building2",
  "Award",
  "Handshake",
  "MapPin",
  "FileText",
  "Scale",
  "Rocket",
];

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, sparse: true, trim: true, lowercase: true },
    description: { type: String, required: true, trim: true }, // card blurb + fallback intro on the detail page
    content: { type: String, default: "" }, // rich text HTML for the full detail page, from the admin editor
    image: { type: String, default: "" }, // hero image URL for the detail page; falls back to default banner if empty
    metaTitle: { type: String, trim: true, default: "" },
    metaDescription: { type: String, trim: true, default: "" },
    icon: { type: String, enum: ALLOWED_ICONS, default: "Briefcase" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceSchema.index({ order: 1, createdAt: 1 });

module.exports = mongoose.model("Service", serviceSchema);
module.exports.ALLOWED_ICONS = ALLOWED_ICONS;

const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: "" }, // e.g. "Nurse, placed in Dubai"
    message: { type: String, required: true, trim: true },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    // References a file stored via GridFS (see routes/media.js). Null = no photo.
    imageFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

testimonialSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Testimonial", testimonialSchema);

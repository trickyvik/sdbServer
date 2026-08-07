const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, index: true },
    jobTitleSnapshot: { type: String, required: true, trim: true }, // job title at time of applying, in case the job is edited/deleted later

    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    currentLocation: { type: String, trim: true, default: "" }, // "current city & country"
    preferredCountry: { type: String, trim: true, default: "" },
    skillLevel: { type: String, trim: true, default: "" },
    experience: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    termsAccepted: { type: Boolean, required: true },

    // Resume file, stored in the private "resumes" GridFS bucket (never public).
    resumeFileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    resumeFilename: { type: String, required: true },
    resumeContentType: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "reviewed", "shortlisted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

applicationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Application", applicationSchema);

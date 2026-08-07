const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    country: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    salary: {
      type: String,
      required: true,
    },

    salaryValue: {
      type: Number,
      default: 0,
    },

    employmentType: {
      type: String,
      default: "Full-time",
    },

    description: {
      type: String,
      required: true,
    },

    requirements: {
      type: [String],
      default: [],
    },

    perks: {
      type: [String],
      default: [],
    },

    date: {
      type: String,
      default: () => new Date().toLocaleDateString(),
    },
  },
  {
    timestamps: true,
  }
);

// Speeds up the public jobs list, which is sorted newest-first.
JobSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Job", JobSchema);

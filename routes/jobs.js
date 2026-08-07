const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const auth = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { mongoIdParam, paginationQuery, jobRules, jobUpdateRules } = require("../middleware/validators");

// GET /api/jobs — public, paginated, filterable list
router.get(
  "/",
  paginationQuery,
  asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const filter = {};
    if (req.query.country) filter.country = req.query.country;
    if (req.query.category) filter.category = req.query.category;

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Job.countDocuments(filter),
    ]);

    res.status(200).json({
      data: jobs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  })
);

// GET /api/jobs/:id — public
router.get(
  "/:id",
  mongoIdParam,
  asyncHandler(async (req, res) => {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  })
);

// POST /api/jobs — admin only
router.post(
  "/",
  auth,
  jobRules,
  asyncHandler(async (req, res) => {
    const job = await Job.create(req.body);
    res.status(201).json(job);
  })
);

// PUT /api/jobs/:id — admin only
router.put(
  "/:id",
  auth,
  mongoIdParam,
  jobUpdateRules,
  asyncHandler(async (req, res) => {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  })
);

// DELETE /api/jobs/:id — admin only
router.delete(
  "/:id",
  auth,
  mongoIdParam,
  asyncHandler(async (req, res) => {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ message: "Job deleted successfully" });
  })
);

module.exports = router;

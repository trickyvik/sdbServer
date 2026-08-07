const express = require("express");
const router = express.Router();
const Testimonial = require("../models/Testimonial");
const auth = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { mongoIdParam, paginationQuery, testimonialRules } = require("../middleware/validators");

// GET /api/testimonials — public, only active ones, paginated
router.get(
  "/",
  paginationQuery,
  asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    // Admin panel passes ?all=true (with a token) to see inactive ones too.
    const isAdminView = req.query.all === "true";
    const filter = isAdminView ? {} : { isActive: true };

    const [data, total] = await Promise.all([
      Testimonial.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Testimonial.countDocuments(filter),
    ]);

    res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  })
);

// POST /api/testimonials — admin only
router.post(
  "/",
  auth,
  testimonialRules,
  asyncHandler(async (req, res) => {
    const { name, role, message, rating, imageFileId, isActive } = req.body;
    const testimonial = new Testimonial({ name, role, message, rating, imageFileId: imageFileId || null, isActive });
    await testimonial.save();
    res.status(201).json(testimonial);
  })
);

// PUT /api/testimonials/:id — admin only
router.put(
  "/:id",
  auth,
  mongoIdParam,
  testimonialRules,
  asyncHandler(async (req, res) => {
    const { name, role, message, rating, imageFileId, isActive } = req.body;
    const updated = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { name, role, message, rating, imageFileId: imageFileId || null, isActive },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Testimonial not found" });
    res.json(updated);
  })
);

// DELETE /api/testimonials/:id — admin only
router.delete(
  "/:id",
  auth,
  mongoIdParam,
  asyncHandler(async (req, res) => {
    const deleted = await Testimonial.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Testimonial not found" });
    res.json({ message: "Testimonial deleted successfully." });
  })
);

module.exports = router;

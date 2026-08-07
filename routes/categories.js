const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const Blog = require("../models/Blog");
const auth = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { mongoIdParam, categoryRules } = require("../middleware/validators");
const { slugify } = require("../utils/textHelpers");

// GET /api/categories — public, active only, ordered.
// Admin panel passes ?all=true (with a token) to see hidden ones too.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const isAdminView = req.query.all === "true";
    const filter = isAdminView ? {} : { isActive: true };
    const data = await Category.find(filter).sort({ order: 1, name: 1 });
    res.json({ data });
  })
);

// POST /api/categories — admin only
router.post(
  "/",
  auth,
  categoryRules,
  asyncHandler(async (req, res) => {
    const { name, order, isActive } = req.body;
    const slug = req.body.slug ? slugify(req.body.slug) : slugify(name);
    const existing = await Category.findOne({ $or: [{ name }, { slug }] });
    if (existing) return res.status(409).json({ message: "A category with this name already exists." });
    const category = new Category({ name, slug, order, isActive });
    await category.save();
    res.status(201).json(category);
  })
);

// PUT /api/categories/:id — admin only
router.put(
  "/:id",
  auth,
  mongoIdParam,
  categoryRules,
  asyncHandler(async (req, res) => {
    const { name, order, isActive } = req.body;
    const update = { name, order, isActive };
    if (req.body.slug) update.slug = slugify(req.body.slug);
    else if (name) update.slug = slugify(name);
    const updated = await Category.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Category not found" });
    res.json(updated);
  })
);

// DELETE /api/categories/:id — admin only.
// Blogs referencing this category are left untouched (category is stored as
// a plain string on Blog, not a reference), so nothing breaks — they'll just
// no longer match the active-category filter dropdown.
router.delete(
  "/:id",
  auth,
  mongoIdParam,
  asyncHandler(async (req, res) => {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Category not found" });
    const blogCount = await Blog.countDocuments({ category: deleted.name });
    res.json({ message: "Category deleted successfully.", blogsStillUsingIt: blogCount });
  })
);

module.exports = router;

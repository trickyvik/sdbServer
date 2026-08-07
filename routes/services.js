const express = require("express");
const router = express.Router();
const Service = require("../models/Service");
const auth = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { mongoIdParam, serviceRules, serviceUpdateRules } = require("../middleware/validators");
const { slugify } = require("../utils/textHelpers");
const sanitizeContent = require("../utils/sanitizeContent");

async function generateUniqueSlug(baseText, excludeId) {
  const base = slugify(baseText) || "service";
  let slug = base;
  let i = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await Service.findOne({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
}

// GET /api/services — public, active only, ordered for display.
// Admin panel passes ?all=true (with a token) to see hidden ones too.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const isAdminView = req.query.all === "true";
    const filter = isAdminView ? {} : { isActive: true };
    const data = await Service.find(filter).sort({ order: 1, createdAt: 1 });
    res.json({ data });
  })
);

// GET /api/services/slug/:slug — public, full service page + related services.
// Registered before /:id so a slug string never gets parsed as a Mongo id.
router.get(
  "/slug/:slug",
  asyncHandler(async (req, res) => {
    const service = await Service.findOne({
      slug: req.params.slug.toLowerCase(),
      isActive: true,
    });
    if (!service) return res.status(404).json({ message: "Service not found." });

    const related = await Service.find({
      _id: { $ne: service._id },
      isActive: true,
    })
      .sort({ order: 1, createdAt: 1 })
      .limit(4);

    res.json({ data: service, related });
  })
);

// POST /api/services — admin only
router.post(
  "/",
  auth,
  serviceRules,
  asyncHandler(async (req, res) => {
    const { title, description, content, image, metaTitle, metaDescription, icon, order, isActive } = req.body;

    const slug = await generateUniqueSlug(req.body.slug || title);
    const cleanContent = sanitizeContent(content || "");

    const service = new Service({
      title,
      slug,
      description,
      content: cleanContent,
      image,
      metaTitle,
      metaDescription,
      icon,
      order,
      isActive,
    });
    await service.save();
    res.status(201).json(service);
  })
);

// PUT /api/services/:id — admin only
router.put(
  "/:id",
  auth,
  mongoIdParam,
  serviceUpdateRules,
  asyncHandler(async (req, res) => {
    const existing = await Service.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Service not found" });

    const update = { ...req.body };
    delete update._id;

    if (typeof update.content === "string") {
      update.content = sanitizeContent(update.content);
    }
    if (update.slug) {
      update.slug = await generateUniqueSlug(update.slug, existing._id);
    } else {
      // Keep the existing slug stable if the admin didn't touch it.
      delete update.slug;
    }

    const updated = await Service.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    res.json(updated);
  })
);

// DELETE /api/services/:id — admin only
router.delete(
  "/:id",
  auth,
  mongoIdParam,
  asyncHandler(async (req, res) => {
    const deleted = await Service.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Service not found" });
    res.json({ message: "Service deleted successfully." });
  })
);

module.exports = router;

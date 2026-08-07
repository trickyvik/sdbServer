const express = require("express");
const router = express.Router();
const Blog = require("../models/Blog");
const auth = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { mongoIdParam, paginationQuery, blogRules, blogUpdateRules } = require("../middleware/validators");
const { slugify, estimateReadingTime } = require("../utils/textHelpers");
const sanitizeContent = require("../utils/sanitizeContent");

const CARD_FIELDS = "-content"; // list views don't need the full article body

async function generateUniqueSlug(baseText, excludeId) {
  const base = slugify(baseText) || "post";
  let slug = base;
  let i = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await Blog.findOne({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
}

// GET /api/blogs — public listing: search, category filter, pagination, sort.
// Admin panel passes ?all=true (with a token) to also see drafts.
router.get(
  "/",
  paginationQuery,
  asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const isAdminView = req.query.all === "true";

    const filter = isAdminView ? {} : { status: "published" };
    if (req.query.category && req.query.category !== "All") filter.category = req.query.category;
    if (req.query.tag) filter.tags = req.query.tag;
    if (req.query.q) filter.$text = { $search: req.query.q };

    let sort = { createdAt: -1 };
    if (req.query.sort === "views") sort = { views: -1 };
    if (req.query.sort === "oldest") sort = { createdAt: 1 };

    const [blogs, total] = await Promise.all([
      Blog.find(filter, isAdminView ? undefined : CARD_FIELDS)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      Blog.countDocuments(filter),
    ]);

    res.json({
      data: blogs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  })
);

// GET /api/blogs/slug/:slug — public, full article + view increment + related posts.
// Registered before /:id so "slug" itself never gets parsed as a Mongo id.
router.get(
  "/slug/:slug",
  asyncHandler(async (req, res) => {
    const blog = await Blog.findOneAndUpdate(
      { slug: req.params.slug.toLowerCase(), status: "published" },
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!blog) return res.status(404).json({ message: "Blog post not found." });

    const related = await Blog.find(
      {
        _id: { $ne: blog._id },
        status: "published",
        $or: [{ category: blog.category }, { tags: { $in: blog.tags } }],
      },
      CARD_FIELDS
    )
      .sort({ createdAt: -1 })
      .limit(4);

    res.json({ data: blog, related });
  })
);

// GET /api/blogs/:id — used by the admin edit form (fetches the full article by id)
router.get(
  "/:id",
  mongoIdParam,
  asyncHandler(async (req, res) => {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog post not found." });
    res.json(blog);
  })
);

// POST /api/blogs — admin only
router.post(
  "/",
  auth,
  blogRules,
  asyncHandler(async (req, res) => {
    const {
      title, image, day, month, author, category, youtubeUrl,
      metaTitle, metaDescription, description, content, tags, status,
    } = req.body;

    const slug = await generateUniqueSlug(req.body.slug || title);
    const cleanContent = sanitizeContent(content || "");

    const blog = new Blog({
      title, image, day, month, author, category, youtubeUrl, slug,
      metaTitle, metaDescription, description,
      content: cleanContent,
      tags: Array.isArray(tags) ? tags : [],
      status: status || "published",
      readingTime: estimateReadingTime(cleanContent),
      publishDate: status === "draft" ? undefined : new Date(),
    });
    await blog.save();
    res.status(201).json(blog);
  })
);

// PUT /api/blogs/:id — admin only (this route didn't exist before — editing was impossible)
router.put(
  "/:id",
  auth,
  mongoIdParam,
  blogUpdateRules,
  asyncHandler(async (req, res) => {
    const existing = await Blog.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Blog post not found." });

    const update = { ...req.body };
    delete update._id;

    if (typeof update.content === "string") {
      update.content = sanitizeContent(update.content);
      update.readingTime = estimateReadingTime(update.content);
    }
    if (update.slug) {
      update.slug = await generateUniqueSlug(update.slug, existing._id);
    } else if (update.title && update.title !== existing.title) {
      // Keep the existing slug stable unless the admin explicitly changes it —
      // only regenerate if there was never a real slug to begin with.
    }
    if (update.status === "published" && existing.status === "draft" && !existing.publishDate) {
      update.publishDate = new Date();
    }

    const updated = await Blog.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    res.json(updated);
  })
);

// DELETE /api/blogs/:id — admin only
router.delete(
  "/:id",
  auth,
  mongoIdParam,
  asyncHandler(async (req, res) => {
    const deletedBlog = await Blog.findByIdAndDelete(req.params.id);
    if (!deletedBlog) {
      return res.status(404).json({ message: "Blog post not found." });
    }
    res.json({ message: "Blog post deleted successfully." });
  })
);

module.exports = router;

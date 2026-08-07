const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const auth = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { mongoIdParam, paginationQuery } = require("../middleware/validators");

const router = express.Router();

// Files are stored directly in MongoDB via GridFS (bucket name "media"),
// which splits files into fs.media.files / fs.media.chunks collections.
// No third-party storage service needed.
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB — keep individual docs/chunks reasonable

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, WEBP, GIF, or SVG images are allowed."));
    }
    cb(null, true);
  },
});

function getBucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "media" });
}

// POST /api/media — admin only, multipart/form-data field name "file"
router.post(
  "/",
  auth,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) return res.status(422).json({ message: err.message });
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(422).json({ message: "No file uploaded." });

    const bucket = getBucket();
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: {
        uploadedBy: req.admin?.id || null,
        folder: (req.body.folder || "general").trim(),
        originalName: req.file.originalname,
        caption: (req.body.caption || "").trim(),
      },
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on("finish", () => {
      res.status(201).json({
        _id: uploadStream.id,
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        size: req.file.size,
        folder: req.body.folder || "general",
        caption: (req.body.caption || "").trim(),
        url: `/api/media/file/${uploadStream.id}`,
      });
    });

    uploadStream.on("error", (err) => {
      res.status(500).json({ message: err.message || "Upload failed" });
    });
  })
);

// GET /api/media — admin only, list uploaded files (paginated)
router.get(
  "/",
  auth,
  paginationQuery,
  asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 24;
    const filesColl = mongoose.connection.db.collection("media.files");

    const filter = req.query.folder
      ? { "metadata.folder": req.query.folder }
      : req.query.excludeFolder
      ? { "metadata.folder": { $ne: req.query.excludeFolder } }
      : {};
    const [files, total] = await Promise.all([
      filesColl
        .find(filter)
        .sort({ uploadDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      filesColl.countDocuments(filter),
    ]);

    res.json({
      data: files.map((f) => ({
        _id: f._id,
        filename: f.metadata?.originalName || f.filename,
        contentType: f.contentType,
        size: f.length,
        folder: f.metadata?.folder || "general",
        caption: f.metadata?.caption || "",
        uploadedAt: f.uploadDate,
        url: `/api/media/file/${f._id}`,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  })
);

// GET /api/media/public/:folder — PUBLIC, no auth. Used by the live site to
// pull whichever images an admin has tagged into a given folder (e.g. the
// "success-stories" folder feeds the homepage Success Stories gallery).
// Only exposes the fields the frontend needs — never admin-only metadata.
router.get(
  "/public/:folder",
  asyncHandler(async (req, res) => {
    const filesColl = mongoose.connection.db.collection("media.files");
    const files = await filesColl
      .find({ "metadata.folder": req.params.folder })
      .sort({ uploadDate: -1 })
      .limit(50)
      .toArray();

    res.set("Cache-Control", "public, max-age=60");
    res.json({
      data: files.map((f) => ({
        _id: f._id,
        filename: f.metadata?.originalName || f.filename,
        caption: f.metadata?.caption || "",
        url: `/api/media/file/${f._id}`,
      })),
    });
  })
);

// GET /api/media/file/:id — PUBLIC (site + admin panel need to render these as <img src>)
router.get(
  "/file/:id",
  mongoIdParam,
  asyncHandler(async (req, res) => {
    const bucket = getBucket();
    const _id = new mongoose.Types.ObjectId(req.params.id);
    const files = await mongoose.connection.db
      .collection("media.files")
      .find({ _id })
      .toArray();

    if (!files.length) return res.status(404).json({ message: "File not found" });

    const file = files[0];
    res.set("Content-Type", file.contentType || "application/octet-stream");
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    const downloadStream = bucket.openDownloadStream(_id);
    downloadStream.on("error", () => res.status(404).end());
    downloadStream.pipe(res);
  })
);

// PATCH /api/media/:id — admin only, update the caption shown under a photo
router.patch(
  "/:id",
  auth,
  mongoIdParam,
  asyncHandler(async (req, res) => {
    const filesColl = mongoose.connection.db.collection("media.files");
    const _id = new mongoose.Types.ObjectId(req.params.id);
    const caption = (req.body.caption || "").trim();

    const result = await filesColl.findOneAndUpdate(
      { _id },
      { $set: { "metadata.caption": caption } },
      { returnDocument: "after" }
    );

    if (!result) return res.status(404).json({ message: "File not found" });

    res.json({
      _id,
      caption,
      folder: result.metadata?.folder || "general",
      url: `/api/media/file/${_id}`,
    });
  })
);

// DELETE /api/media/:id — admin only
router.delete(
  "/:id",
  auth,
  mongoIdParam,
  asyncHandler(async (req, res) => {
    const bucket = getBucket();
    try {
      await bucket.delete(new mongoose.Types.ObjectId(req.params.id));
    } catch (err) {
      return res.status(404).json({ message: "File not found" });
    }
    res.json({ message: "File deleted successfully." });
  })
);

module.exports = router;

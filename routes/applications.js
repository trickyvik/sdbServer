const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const router = express.Router();

const Application = require("../models/Application");
const Job = require("../models/Job");
const auth = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const {
  mongoIdParam,
  paginationQuery,
  applicationRules,
  applicationStatusRules,
} = require("../middleware/validators");

// Resumes live in a SEPARATE, PRIVATE GridFS bucket from site images —
// there is no public "GET /file/:id" style route for this bucket. Only an
// authenticated admin can ever read a resume back out.
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB, matches the "Max 5MB" note on the apply form

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("Only PDF, DOC, or DOCX resumes are allowed."));
    }
    cb(null, true);
  },
});

function getResumeBucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "resumes" });
}

// POST /api/applications — PUBLIC. multipart/form-data, file field name "resume".
router.post(
  "/",
  (req, res, next) => {
    upload.single("resume")(req, res, (err) => {
      if (err) return res.status(422).json({ message: err.message });
      next();
    });
  },
  applicationRules,
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(422).json({ message: "Please attach your CV / resume." });

    const job = await Job.findById(req.body.job);
    if (!job) return res.status(404).json({ message: "This job no longer exists." });

    const bucket = getResumeBucket();
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: { jobId: job._id, applicantEmail: req.body.email },
    });
    uploadStream.end(req.file.buffer);

    uploadStream.on("error", (err) => {
      res.status(500).json({ message: err.message || "Upload failed" });
    });

    uploadStream.on("finish", async () => {
      const application = await Application.create({
        job: job._id,
        jobTitleSnapshot: job.title,
        fullName: req.body.fullName,
        email: req.body.email,
        phone: req.body.phone,
        currentLocation: req.body.currentLocation || "",
        preferredCountry: req.body.preferredCountry || "",
        skillLevel: req.body.skillLevel || "",
        experience: req.body.experience || "",
        notes: req.body.notes || "",
        termsAccepted: true,
        resumeFileId: uploadStream.id,
        resumeFilename: req.file.originalname,
        resumeContentType: req.file.mimetype,
      });
      res.status(201).json({ success: true, data: application });
    });
  })
);

// GET /api/applications — admin only, paginated, filterable by job/status/search
router.get(
  "/",
  auth,
  paginationQuery,
  asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const filter = {};
    if (req.query.job) filter.job = req.query.job;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      const re = { $regex: req.query.search, $options: "i" };
      filter.$or = [{ fullName: re }, { email: re }, { jobTitleSnapshot: re }];
    }

    const [data, total, statusCounts] = await Promise.all([
      Application.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Application.countDocuments(filter),
      Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);

    res.json({
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
      statusCounts: statusCounts.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
    });
  })
);

// GET /api/applications/:id — admin only
router.get(
  "/:id",
  auth,
  mongoIdParam,
  asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id).populate("job", "title country category");
    if (!application) return res.status(404).json({ message: "Application not found" });
    res.json(application);
  })
);

// GET /api/applications/:id/resume — admin only. ?download=true forces a download
// instead of opening inline in the browser.
router.get(
  "/:id/resume",
  auth,
  mongoIdParam,
  asyncHandler(async (req, res) => {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: "Application not found" });

    const bucket = getResumeBucket();
    res.set("Content-Type", application.resumeContentType || "application/octet-stream");
    const disposition = req.query.download === "true" ? "attachment" : "inline";
    res.set("Content-Disposition", `${disposition}; filename="${application.resumeFilename}"`);

    const downloadStream = bucket.openDownloadStream(application.resumeFileId);
    downloadStream.on("error", () => res.status(404).json({ message: "Resume file not found" }));
    downloadStream.pipe(res);
  })
);

// PATCH /api/applications/:id/status — admin only
router.patch(
  "/:id/status",
  auth,
  mongoIdParam,
  applicationStatusRules,
  asyncHandler(async (req, res) => {
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!application) return res.status(404).json({ message: "Application not found" });
    res.json(application);
  })
);

// DELETE /api/applications/:id — admin only. Also removes the resume file so
// nothing is left orphaned in GridFS.
router.delete(
  "/:id",
  auth,
  mongoIdParam,
  asyncHandler(async (req, res) => {
    const application = await Application.findByIdAndDelete(req.params.id);
    if (!application) return res.status(404).json({ message: "Application not found" });

    const bucket = getResumeBucket();
    try {
      await bucket.delete(application.resumeFileId);
    } catch {
      // Resume chunk already gone — not fatal, the application record is what matters.
    }
    res.json({ message: "Application deleted successfully." });
  })
);

module.exports = router;

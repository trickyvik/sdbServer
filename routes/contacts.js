const express = require("express");
const router = express.Router();
const Contact = require("../models/Contact");
const auth = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const { mongoIdParam, paginationQuery, contactRules } = require("../middleware/validators");

// POST /api/contact — public: anyone can submit the contact form
router.post(
  "/",
  contactRules,
  asyncHandler(async (req, res) => {
    const { name, email, phone, country, message } = req.body;
    const newEnquiry = new Contact({ name, email, phone, country, message });
    await newEnquiry.save();
    res.status(201).json({ success: true, data: newEnquiry });
  })
);

// GET /api/contact — admin only: submissions may contain personal data
router.get(
  "/",
  auth,
  paginationQuery,
  asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;

    const [messages, total] = await Promise.all([
      Contact.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Contact.countDocuments(),
    ]);

    res.json({
      data: messages,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  })
);

// DELETE /api/contact/:id — admin only
router.delete(
  "/:id",
  auth,
  mongoIdParam,
  asyncHandler(async (req, res) => {
    const deletedContact = await Contact.findByIdAndDelete(req.params.id);
    if (!deletedContact) {
      return res.status(404).json({ error: "Contact entry not found" });
    }
    res.json({ success: true, message: "Entry deleted successfully" });
  })
);

module.exports = router;

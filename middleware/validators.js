const { body, param, query, validationResult } = require("express-validator");

// Runs after a chain of express-validator checks; returns 422 with field errors
// instead of letting bad data reach the database.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

const mongoIdParam = [
  param("id").isMongoId().withMessage("Invalid id format"),
  validate,
];

const paginationQuery = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  validate,
];

const contactRules = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 120 }),
  body("email").trim().notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email").normalizeEmail(),
  body("phone").optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
  body("country").optional({ checkFalsy: true }).trim().isLength({ max: 60 }),
  body("message").trim().notEmpty().withMessage("Message is required").isLength({ max: 3000 }),
  validate,
];

const jobRules = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 150 }),
  body("country").trim().notEmpty().withMessage("Country is required").isLength({ max: 100 }),
  body("category").trim().notEmpty().withMessage("Category is required").isLength({ max: 100 }),
  body("salary").trim().notEmpty().withMessage("Salary is required").isLength({ max: 50 }),
  body("salaryValue").optional().isNumeric().withMessage("salaryValue must be a number"),
  body("employmentType").optional().trim().isLength({ max: 50 }),
  body("description").trim().notEmpty().withMessage("Description is required").isLength({ max: 5000 }),
  body("requirements").optional().isArray().withMessage("requirements must be an array"),
  body("perks").optional().isArray().withMessage("perks must be an array"),
  validate,
];

const jobUpdateRules = [
  body("title").optional().trim().isLength({ max: 150 }),
  body("country").optional().trim().isLength({ max: 100 }),
  body("category").optional().trim().isLength({ max: 100 }),
  body("salary").optional().trim().isLength({ max: 50 }),
  body("salaryValue").optional().isNumeric().withMessage("salaryValue must be a number"),
  body("description").optional().trim().isLength({ max: 5000 }),
  body("requirements").optional().isArray(),
  body("perks").optional().isArray(),
  validate,
];

const blogRules = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 200 }),
  body("image").trim().notEmpty().withMessage("Image is required"),
  body("day").trim().notEmpty().withMessage("Day is required"),
  body("month").trim().notEmpty().withMessage("Month is required"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("slug")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[a-z0-9-]+$/)
    .withMessage("Slug must be lowercase letters, numbers, and hyphens only"),
  body("youtubeUrl").optional({ checkFalsy: true }).trim().isURL().withMessage("youtubeUrl must be a valid URL"),
  body("metaTitle").optional({ checkFalsy: true }).trim().isLength({ max: 70 }),
  body("metaDescription").optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
  body("description").optional({ checkFalsy: true }).trim().isLength({ max: 250 }),
  body("content").optional({ checkFalsy: true }).isString(),
  body("tags").optional().isArray().withMessage("tags must be an array"),
  body("status").optional().isIn(["draft", "published"]).withMessage("Invalid status"),
  validate,
];

const blogUpdateRules = [
  body("title").optional().trim().isLength({ max: 200 }),
  body("image").optional().trim().notEmpty(),
  body("day").optional().trim().notEmpty(),
  body("month").optional().trim().notEmpty(),
  body("category").optional().trim().notEmpty(),
  body("slug")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[a-z0-9-]+$/)
    .withMessage("Slug must be lowercase letters, numbers, and hyphens only"),
  body("youtubeUrl").optional({ checkFalsy: true }).trim().isURL().withMessage("youtubeUrl must be a valid URL"),
  body("metaTitle").optional({ checkFalsy: true }).trim().isLength({ max: 70 }),
  body("metaDescription").optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
  body("description").optional({ checkFalsy: true }).trim().isLength({ max: 250 }),
  body("content").optional({ checkFalsy: true }).isString(),
  body("tags").optional().isArray().withMessage("tags must be an array"),
  body("status").optional().isIn(["draft", "published"]).withMessage("Invalid status"),
  validate,
];

const categoryRules = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 100 }),
  body("slug").optional({ checkFalsy: true }).trim().matches(/^[a-z0-9-]+$/).withMessage("Slug must be lowercase letters, numbers, and hyphens only"),
  body("order").optional().isInt().withMessage("Order must be a number").toInt(),
  body("isActive").optional().isBoolean().toBoolean(),
  validate,
];

const loginRules = [
  body("email").trim().notEmpty().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
];

const testimonialRules = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 120 }),
  body("role").optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  body("message").trim().notEmpty().withMessage("Message is required").isLength({ max: 1000 }),
  body("rating").optional().isInt({ min: 1, max: 5 }).withMessage("Rating must be 1-5").toInt(),
  body("imageFileId").optional({ checkFalsy: true }).isMongoId().withMessage("Invalid image reference"),
  body("isActive").optional().isBoolean().toBoolean(),
  validate,
];

const { ALLOWED_ICONS } = require("../models/Service");

const serviceRules = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 150 }),
  body("description").trim().notEmpty().withMessage("Description is required").isLength({ max: 1000 }),
  body("slug")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[a-z0-9-]+$/)
    .withMessage("Slug must be lowercase letters, numbers, and hyphens only"),
  body("content").optional({ checkFalsy: true }).isString(),
  body("image").optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  body("metaTitle").optional({ checkFalsy: true }).trim().isLength({ max: 70 }),
  body("metaDescription").optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
  body("icon").optional().isIn(ALLOWED_ICONS).withMessage("Invalid icon"),
  body("order").optional().isInt().withMessage("Order must be a number").toInt(),
  body("isActive").optional().isBoolean().toBoolean(),
  validate,
];

const serviceUpdateRules = [
  body("title").optional().trim().isLength({ max: 150 }),
  body("description").optional().trim().isLength({ max: 1000 }),
  body("slug")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[a-z0-9-]+$/)
    .withMessage("Slug must be lowercase letters, numbers, and hyphens only"),
  body("content").optional({ checkFalsy: true }).isString(),
  body("image").optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  body("metaTitle").optional({ checkFalsy: true }).trim().isLength({ max: 70 }),
  body("metaDescription").optional({ checkFalsy: true }).trim().isLength({ max: 160 }),
  body("icon").optional().isIn(ALLOWED_ICONS).withMessage("Invalid icon"),
  body("order").optional().isInt().withMessage("Order must be a number").toInt(),
  body("isActive").optional().isBoolean().toBoolean(),
  validate,
];

const createAdminRules = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 120 }),
  body("email").trim().notEmpty().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  body("role").optional().isIn(["superadmin", "admin"]).withMessage("Invalid role"),
  validate,
];

const updateAdminRules = [
  body("name").optional().trim().isLength({ max: 120 }),
  body("role").optional().isIn(["superadmin", "admin"]).withMessage("Invalid role"),
  body("isActive").optional().isBoolean().toBoolean(),
  validate,
];

const changePasswordRules = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword").isLength({ min: 8 }).withMessage("New password must be at least 8 characters"),
  validate,
];

const applicationRules = [
  body("job").isMongoId().withMessage("A valid job id is required"),
  body("fullName").trim().notEmpty().withMessage("Full name is required").isLength({ max: 150 }),
  body("email").trim().notEmpty().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("phone").trim().notEmpty().withMessage("Phone number is required").isLength({ max: 30 }),
  body("currentLocation").optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  body("preferredCountry").optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body("skillLevel").optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body("experience").optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body("notes").optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
  body("termsAccepted")
    .custom((v) => v === true || v === "true" || v === "on" || v === "1")
    .withMessage("You must accept the Terms & Privacy Policy"),
  validate,
];

const applicationStatusRules = [
  body("status").isIn(["pending", "reviewed", "shortlisted", "rejected"]).withMessage("Invalid status"),
  validate,
];

module.exports = {
  validate,
  mongoIdParam,
  paginationQuery,
  contactRules,
  jobRules,
  jobUpdateRules,
  blogRules,
  blogUpdateRules,
  categoryRules,
  loginRules,
  testimonialRules,
  serviceRules,
  serviceUpdateRules,
  createAdminRules,
  updateAdminRules,
  changePasswordRules,
  applicationRules,
  applicationStatusRules,
};

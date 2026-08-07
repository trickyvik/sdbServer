require("dotenv").config();
require("./utils/configureDns")();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const jobsRouter = require("./routes/jobs");
const contactsRouter = require("./routes/contacts");
const adminRouter = require("./routes/admin");
const blogsRouter = require("./routes/blog");
const mediaRouter = require("./routes/media");
const testimonialsRouter = require("./routes/testimonials");
const servicesRouter = require("./routes/services");
const categoriesRouter = require("./routes/categories");
const applicationsRouter = require("./routes/applications");
const Service = require("./models/Service");
const Category = require("./models/Category");
const { slugify } = require("./utils/textHelpers");

const DEFAULT_SERVICES = [
  { title: "Immigration Consulting", description: "End-to-end migration strategy from eligibility assessment to landing — covering skilled, family, investor and humanitarian streams.", icon: "Globe2", order: 1 },
  { title: "Visa Processing", description: "Meticulous handling of work, tourist, business and family visas with a 99% approval track record across 40+ jurisdictions.", icon: "Plane", order: 2 },
  { title: "Document Attestation", description: "Notarisation, MOFA, embassy and apostille attestation for educational, personal and commercial documents.", icon: "FileCheck2", order: 3 },
  { title: "Business Setup", description: "Company formation, trade licenses and corporate structuring in the UAE mainland, free zones and offshore.", icon: "Briefcase", order: 4 },
  { title: "PR & Citizenship", description: "Permanent residency and citizenship-by-investment programmes across Europe, Canada and the Caribbean.", icon: "Landmark", order: 5 },
  { title: "Study Abroad", description: "University shortlisting, admissions, student visas and post-study work strategy for 20+ destinations.", icon: "GraduationCap", order: 6 },
  { title: "Investor Visa", description: "Golden Visa, investor and start-up routes for entrepreneurs seeking long-term global mobility.", icon: "ShieldCheck", order: 7 },
  { title: "Corporate Mobility", description: "Global talent relocation, work-permit management and HR partnerships for multinational employers.", icon: "Users2", order: 8 },
];

const DEFAULT_CATEGORIES = [
  "Work Visa", "Study Visa", "Tourist Visa", "Permanent Residency",
  "Business Visa", "Immigration", "News", "Updates",
];

async function seedServicesIfEmpty() {
  const count = await Service.countDocuments();
  if (count === 0) {
    await Service.insertMany(
      DEFAULT_SERVICES.map((s) => ({ ...s, slug: slugify(s.title) }))
    );
    console.log("Seeded default services collection.");
  }
}

async function seedCategoriesIfEmpty() {
  const count = await Category.countDocuments();
  if (count === 0) {
    await Category.insertMany(
      DEFAULT_CATEGORIES.map((name, i) => ({ name, slug: slugify(name), order: i }))
    );
    console.log("Seeded default blog categories collection.");
  }
}

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const NODE_ENV = process.env.NODE_ENV || "development";

if (!MONGO_URI) {
  console.error("Missing MONGO_URI in .env");
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error("Missing JWT_SECRET in .env");
  process.exit(1);
}

// Needed so express-rate-limit and secure cookies work correctly behind
// a reverse proxy / load balancer (Render, Railway, Nginx, etc).
app.set("trust proxy", 1);

// Default helmet policy blocks <img> tags from loading resources when the
// site and the API are on different domains/ports (which they are: the
// frontend calls VITE_API_URL). Without this, uploaded photos silently fail
// to render (broken image icon) even though the JSON API calls work fine.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN
      ? process.env.CLIENT_ORIGIN.split(",").map((s) => s.trim())
      : "*",
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// General API rate limit — a generous ceiling that only kicks in on abuse.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// Tighter limit on the write-heavy / brute-forceable endpoints.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(["/api/contact", "/api/admin/login"], writeLimiter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// API Endpoints
app.use("/api/jobs", jobsRouter);
app.use("/api/contact", contactsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/blogs", blogsRouter);
app.use("/api/media", mediaRouter);
app.use("/api/testimonials", testimonialsRouter);
app.use("/api/services", servicesRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/applications", applicationsRouter);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler — keep this last
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected");
});

let server;
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    await seedServicesIfEmpty();
    await seedCategoriesIfEmpty();
    server = app.listen(PORT, () => console.log(`Mongo API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed", err);
    process.exit(1);
  });

// Graceful shutdown so in-flight requests finish and the DB connection
// closes cleanly (important for containers / process managers that send SIGTERM).
function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      await mongoose.connection.close();
      console.log("Closed out remaining connections.");
      process.exit(0);
    });
    setTimeout(() => {
      console.error("Forcing shutdown after timeout");
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

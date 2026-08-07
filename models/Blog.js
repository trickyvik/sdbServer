const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    // --- Original fields (kept exactly as-is, still used by the existing UI) ---
    title: { type: String, required: true, trim: true },
    image: { type: String, required: true }, // featured image URL
    day: { type: String, required: true }, // legacy display date parts (kept for the existing card UI)
    month: { type: String, required: true },
    author: { type: String, default: "SDB Admin" },
    category: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    youtubeUrl: { type: String, default: "" },

    // --- Added for the full Blog CMS module ---
    metaTitle: { type: String, trim: true, default: "" },
    metaDescription: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" }, // short description / card excerpt
    content: { type: String, default: "" }, // rich text HTML from the admin editor
    tags: { type: [String], default: [] },
    status: { type: String, enum: ["draft", "published"], default: "published" },
    views: { type: Number, default: 0 },
    readingTime: { type: String, default: "1 min read" },
    publishDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

blogSchema.index({ createdAt: -1 });
blogSchema.index({ title: "text", content: "text", description: "text", tags: "text" });

module.exports = mongoose.model("Blog", blogSchema);

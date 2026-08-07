// Strips HTML tags to get plain text for word counts (good enough for a
// reading-time estimate — not meant to be a full sanitizer, see sanitizeHtml.js).
function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, " ");
}

function slugify(text = "") {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

function estimateReadingTime(content = "") {
  const words = stripHtml(content).trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

module.exports = { slugify, estimateReadingTime, stripHtml };

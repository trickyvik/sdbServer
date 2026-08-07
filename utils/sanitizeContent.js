const sanitizeHtml = require("sanitize-html");

// Matches the toolbar the admin rich text editor exposes (Tiptap):
// headings, bold/italic/underline/strike, lists, links, tables, images,
// blockquotes, code blocks, alignment. No script/style/iframe/video tags.
const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "p", "br", "hr",
  "strong", "em", "u", "s", "code", "pre",
  "ul", "ol", "li",
  "a", "img",
  "table", "thead", "tbody", "tr", "th", "td",
  "blockquote", "span",
];

const ALLOWED_ATTRIBUTES = {
  a: ["href", "target", "rel"],
  img: ["src", "alt", "title", "width", "height"],
  "*": ["style", "class"],
};

function sanitizeContent(html = "") {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedStyles: {
      "*": {
        "text-align": [/^left$|^right$|^center$|^justify$/],
      },
    },
    // Never allow javascript: URLs through href/src
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }),
    },
  });
}

module.exports = sanitizeContent;

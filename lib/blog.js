// turns a blog post's plain-text content into blocks for display.
//
// how to write a post:
//   - leave a blank line between paragraphs
//   - start a line with "## " for a heading
//   - start a line with "### " for a subheading
//
// a heading can sit directly above its paragraph (no blank line needed).
// a single "# " is treated as a heading too: the post title is already the
// page's main heading, so nothing inside a post goes above "##".

const HEADING = /^(#{1,3})\s+(.+)$/;

// [{ type: "h2" | "h3" | "p", text }]
export function parseBlogContent(content) {
  const blocks = [];
  let paragraph = [];

  function endParagraph() {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "p", text });
    paragraph = [];
  }

  for (const rawLine of (content ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      endParagraph();
      continue;
    }
    // a heading marker with nothing after it (e.g. a stray "## ") is ignored.
    if (/^#{1,3}$/.test(line)) {
      endParagraph();
      continue;
    }
    const heading = line.match(HEADING);
    if (heading) {
      endParagraph();
      blocks.push({ type: heading[1].length === 3 ? "h3" : "h2", text: heading[2].trim() });
      continue;
    }
    paragraph.push(line);
  }
  endParagraph();
  return blocks;
}

// the post as plain text with the heading markers removed, for page
// descriptions and share previews.
export function blogPlainText(content) {
  return parseBlogContent(content).map((b) => b.text).join(" ");
}

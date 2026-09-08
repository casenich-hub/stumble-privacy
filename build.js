#!/usr/bin/env node
// Regenerates the published HTML pages from the Markdown sources.
// Run with: node build.js
"use strict";

const fs = require("fs");

const PAGES = [
  { md: "PRIVACY.md", out: "index.html", title: "Stumble — Privacy Policy", nav: "privacy" },
  { md: "SUPPORT.md", out: "support.html", title: "Stumble — Support", nav: "support" },
];

const CSS = `  :root { color-scheme: light dark; }
  body { max-width: 44rem; margin: 0 auto; padding: 2.5rem 1.25rem 4rem;
    font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #12333d; background: #fff; }
  h1 { font-size: 1.9rem; line-height: 1.2; margin: 0 0 .4rem; color: #1f6378; }
  h2 { font-size: 1.2rem; margin: 2.2rem 0 .6rem; color: #1f6378; }
  h3 { font-size: 1rem; margin: 1.5rem 0 .4rem; }
  a { color: #1f6378; }
  hr { border: 0; border-top: 1px solid #dce6e9; margin: 2rem 0; }
  ul { padding-left: 1.2rem; }
  li { margin: .3rem 0; }
  strong { font-weight: 650; }
  nav { margin: 0 0 2rem; font-size: .9rem; }
  nav a { margin-right: 1rem; text-decoration: none; }
  nav a.here { font-weight: 650; text-decoration: underline; }
  @media (prefers-color-scheme: dark) {
    body { background: #10181b; color: #dbe7ea; }
    h1, h2, a { color: #7fc4d8; }
    hr { border-top-color: #24343a; }
  }`;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Inline formatting runs over a whole block, so bold and links may wrap lines.
const inline = (s) =>
  esc(s.replace(/\s*\n\s*/g, " "))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

function toHtml(md) {
  const blocks = md
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim()
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks
    .map((b) => {
      if (/^-{3,}$/.test(b)) return "<hr>";
      const h = b.match(/^(#{1,3})\s+([\s\S]*)$/);
      if (h) return `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`;
      const isList =
        /^[-*]\s+/m.test(b) && b.split("\n").every((l) => /^\s*[-*]\s+|^\s{2,}\S/.test(l));
      if (isList) {
        const items = b
          .split(/\n(?=[-*]\s)/)
          .map((i) => `<li>${inline(i.replace(/^[-*]\s+/, ""))}</li>`);
        return `<ul>\n${items.join("\n")}\n</ul>`;
      }
      return `<p>${inline(b)}</p>`;
    })
    .join("\n");
}

const navFor = (current) =>
  `<nav><a href="./"${current === "privacy" ? ' class="here"' : ""}>Privacy Policy</a>` +
  `<a href="./support.html"${current === "support" ? ' class="here"' : ""}>Support</a></nav>`;

let failures = 0;
for (const page of PAGES) {
  const body = toHtml(fs.readFileSync(page.md, "utf8"));
  const html =
    `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
    `<title>${page.title}</title>\n<style>\n${CSS}\n</style>\n</head>\n<body>\n` +
    `${navFor(page.nav)}\n${body}\n</body>\n</html>\n`;
  fs.writeFileSync(page.out, html);

  const problems = [];
  if (/\*\*/.test(html)) problems.push("unconverted bold");
  if (/\]\(/.test(html)) problems.push("unconverted link");
  if (/^#{1,3} /m.test(html)) problems.push("unconverted heading");
  if (problems.length) failures++;
  console.log(
    `${problems.length ? "FAIL" : "ok  "} ${page.out.padEnd(13)} ${String(html.length).padStart(5)} bytes` +
      (problems.length ? `  (${problems.join(", ")})` : "")
  );
}
process.exit(failures ? 1 : 0);

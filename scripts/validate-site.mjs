import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".playwright-mcp",
  ".wrangler",
  "_template",
  "backend",
  "node_modules",
]);
const requiredRootFiles = [
  "guide.html",
  "monday-app-association.json",
  "privacy.html",
  "terms.html",
];
const errors = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function localTarget(sourceFile, rawUrl) {
  const value = rawUrl.trim();
  if (
    !value ||
    value.startsWith("#") ||
    value.startsWith("data:") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:")
  ) {
    return null;
  }

  let pathname;
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    if (!["coderippletech.com", "www.coderippletech.com"].includes(url.hostname)) {
      return null;
    }
    pathname = url.pathname;
  } else if (value.startsWith("/")) {
    pathname = value.split(/[?#]/, 1)[0];
  } else {
    pathname = path.join(path.dirname(path.relative(root, sourceFile)), value.split(/[?#]/, 1)[0]);
  }

  const relative = pathname.replace(/^\/+/, "");
  return pathname.endsWith("/") || relative === "" ? path.join(relative, "index.html") : relative;
}

function targetExists(target) {
  const absolute = path.join(root, target);
  return (
    fs.existsSync(absolute) ||
    (!path.extname(target) && fs.existsSync(`${absolute}.html`))
  );
}

for (const required of requiredRootFiles) {
  if (!fs.existsSync(path.join(root, required))) {
    errors.push(`required marketplace file is missing: ${required}`);
  }
}

const htmlFiles = walk(root).filter((file) => file.endsWith(".html"));
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const attributes = html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi);
  for (const [, rawUrl] of attributes) {
    const target = localTarget(file, rawUrl);
    if (target && !targetExists(target)) {
      errors.push(`${path.relative(root, file)} references missing ${target}`);
    }
  }

  if (html.includes('property="og:image"')) {
    const image = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const target = image ? localTarget(file, image) : null;
    if (!target || !/\.(?:png|jpe?g|webp)$/i.test(target)) {
      errors.push(`${path.relative(root, file)} has an invalid local og:image`);
    }
  }
}

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
for (const [, rawUrl] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const target = localTarget(path.join(root, "sitemap.xml"), rawUrl);
  if (target && !targetExists(target)) {
    errors.push(`sitemap.xml references missing ${target}`);
  }
}

if (errors.length) {
  console.error(`Site validation failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Site validation passed: ${htmlFiles.length} HTML files, ${requiredRootFiles.length} protected marketplace files.`,
);

/* eslint-disable no-console */
/**
 * Postbuild script to enhance sitemap:
 * 1. Inject <lastmod> from blog post frontmatter
 * 2. Remove tag pages with fewer than N posts
 * 3. Clean up unused XML namespaces
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

const BLOG_DIR = join(import.meta.dirname, "../src/data/blog");
const DIST_DIR = join(import.meta.dirname, "../dist");
const SITE_URL = "https://blog.chrisyuan.me";
const MIN_TAG_POSTS = 3;

interface PostMeta {
  slug: string;
  lastmod: string;
  tags: string[];
  draft: boolean;
}

function parseFrontmatter(filePath: string): PostMeta | null {
  const content = readFileSync(filePath, "utf-8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const yaml = match[1];

  // Parse draft
  const draftMatch = yaml.match(/^draft:\s*(true|false)/m);
  const draft = draftMatch?.[1] === "true";

  // Parse slug (optional, fallback to filename)
  const slugMatch = yaml.match(/^slug:\s*["']?([^"'\n]+)["']?/m);
  const fileSlug = basename(filePath, ".md");
  const slug = slugMatch?.[1]?.trim() ?? fileSlug;

  // Parse dates
  const modMatch = yaml.match(/^modDatetime:\s*(.+)/m);
  const pubMatch = yaml.match(/^pubDatetime:\s*(.+)/m);
  const modDate = modMatch?.[1]?.trim();
  const pubDate = pubMatch?.[1]?.trim();

  // Use modDatetime if available, otherwise pubDatetime
  const dateStr = modDate && modDate !== "null" ? modDate : pubDate;
  if (!dateStr) return null;

  const lastmod = new Date(dateStr).toISOString();

  // Parse tags (YAML array format: "  - tagname")
  const tagsSection = yaml.match(/^tags:\s*\n((?:\s+-\s+.+\n?)*)/m);
  const tags: string[] = [];
  if (tagsSection) {
    const tagLines = tagsSection[1].matchAll(/^\s+-\s+(.+)/gm);
    for (const m of tagLines) {
      const tag = m[1].trim().replace(/^["']|["']$/g, "");
      if (tag) tags.push(tag);
    }
  }

  return { slug, lastmod, tags, draft };
}

function getAllPosts(): PostMeta[] {
  const files = readdirSync(BLOG_DIR, { recursive: true })
    .map(f => f.toString())
    .filter(f => f.endsWith(".md") && !basename(f).startsWith("_"));

  const posts: PostMeta[] = [];
  for (const file of files) {
    const meta = parseFrontmatter(join(BLOG_DIR, file));
    if (meta && !meta.draft) {
      posts.push(meta);
    }
  }
  return posts;
}

function buildDateMap(posts: PostMeta[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const post of posts) {
    const url = `${SITE_URL}/posts/${post.slug}/`;
    map.set(url, post.lastmod);
  }
  return map;
}

function buildTagCounts(posts: PostMeta[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      const normalized = tag.toLowerCase();
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }
  return counts;
}

function buildAllowedTagSlugs(
  tagCounts: Map<string, number>,
  minPosts: number
): Set<string> {
  const allowed = new Set<string>();
  for (const [tag, count] of tagCounts) {
    if (count >= minPosts) {
      // Tag URLs are URL-encoded versions of the tag
      allowed.add(encodeURIComponent(tag));
    }
  }
  return allowed;
}

function processSitemap(
  xml: string,
  dateMap: Map<string, string>,
  allowedTagSlugs: Set<string>
): string {
  // Clean unused namespaces
  xml = xml.replace(
    /\s+xmlns:news="http:\/\/www\.google\.com\/schemas\/sitemap-news\/0\.9"/g,
    ""
  );
  xml = xml.replace(
    /\s+xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/g,
    ""
  );
  xml = xml.replace(
    /\s+xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/g,
    ""
  );
  xml = xml.replace(
    /\s+xmlns:video="http:\/\/www\.google\.com\/schemas\/sitemap-video\/1\.1"/g,
    ""
  );

  // Process each <url> entry
  const urlEntries = xml.match(/<url>[\s\S]*?<\/url>/g);
  if (!urlEntries) return xml;

  const filteredEntries: string[] = [];
  let removed = 0;

  for (const entry of urlEntries) {
    const locMatch = entry.match(/<loc>([^<]+)<\/loc>/);
    if (!locMatch) {
      filteredEntries.push(entry);
      continue;
    }

    const url = locMatch[1];

    // Filter out low-count tag pages: /tags/xxx/ (but not /tags/ itself which is already filtered by astro config)
    const tagMatch = url.match(/\/tags\/([^/]+)\/$/);
    if (tagMatch) {
      const tagSlug = tagMatch[1];
      if (!allowedTagSlugs.has(tagSlug)) {
        removed++;
        continue;
      }
    }

    // Inject lastmod for post pages
    const lastmod = dateMap.get(url);
    if (lastmod) {
      const newEntry = entry.replace(
        /<\/loc>/,
        `</loc>\n    <lastmod>${lastmod}</lastmod>`
      );
      filteredEntries.push(newEntry);
    } else {
      filteredEntries.push(entry);
    }
  }

  // Rebuild XML
  const header = xml.match(/^[\s\S]*?<urlset[^>]*>/)?.[0] ?? "";
  const footer = "</urlset>";

  console.log(
    `Sitemap: ${filteredEntries.length} URLs kept, ${removed} low-count tag pages removed`
  );

  return `${header}\n${filteredEntries.join("\n")}\n${footer}`;
}

// Main
const sitemapPath = join(DIST_DIR, "sitemap-0.xml");

if (!existsSync(sitemapPath)) {
  console.error("sitemap-0.xml not found in dist/");
  process.exit(1);
}

const posts = getAllPosts();
const dateMap = buildDateMap(posts);
const tagCounts = buildTagCounts(posts);
const allowedTagSlugs = buildAllowedTagSlugs(tagCounts, MIN_TAG_POSTS);

console.log(
  `Found ${posts.length} published posts, ${tagCounts.size} unique tags (${allowedTagSlugs.size} with ≥${MIN_TAG_POSTS} posts)`
);

const xml = readFileSync(sitemapPath, "utf-8");
const result = processSitemap(xml, dateMap, allowedTagSlugs);
writeFileSync(sitemapPath, result);

// Inject lastmod into sitemap-index.xml (build timestamp)
const sitemapIndexPath = join(DIST_DIR, "sitemap-index.xml");
if (existsSync(sitemapIndexPath)) {
  const indexXml = readFileSync(sitemapIndexPath, "utf-8");
  const buildTime = new Date().toISOString();
  const updatedIndex = indexXml.replace(
    /<\/loc>/g,
    `</loc><lastmod>${buildTime}</lastmod>`
  );
  writeFileSync(sitemapIndexPath, updatedIndex);
  console.log(`Sitemap index: added lastmod ${buildTime}`);
}

console.log("Sitemap enhanced successfully.");

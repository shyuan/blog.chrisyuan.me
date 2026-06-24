#!/usr/bin/env bun
/**
 * 檢查文章 frontmatter 的 meta description 長度是否落在 SEO 最佳區間。
 *
 * 為什麼用「顯示寬度」而非「字元數」：
 *   Google／Bing 的 SERP snippet 是依「像素寬度」截斷（桌機 ~920px、手機
 *   ~680px），不是字元數。英文 920px ≈ 150–160 字元，但 CJK 每字約佔 2 倍寬，
 *   所以中文約 65–80 字就填滿。因此本檢查以「半形等寬」估算顯示寬度：
 *   CJK／全形字元 = 2、ASCII／半形 = 1。
 *
 * 區間（單位：半形寬度）：
 *   - < 100  → 過短（Bing 會回報 "meta description too short"）
 *   - 100–129 → 可接受
 *   - 130–156 → 理想（中文約 65–78 字，前置重點、不被 SERP 截斷）
 *   - > 156  → 過長（桌機 SERP 會截斷尾段）
 *
 * 用法：
 *   bun run lint:desc                 # 掃描全部文章，advisory（永遠 exit 0）
 *   bun run lint:desc --strict        # 有任何違規就 exit 1（適合手動／CI 全庫把關）
 *   bun scripts/lint-descriptions.ts <file...>  # 只檢查指定檔案，strict（給 lint-staged 用）
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const BLOG_DIR = resolve(import.meta.dirname, "../src/data/blog");
const MIN_WIDTH = 100;
const IDEAL_MIN = 130;
const IDEAL_MAX = 156;

/** 估算 SERP 顯示寬度（半形單位）：CJK／全形 = 2，其餘 = 1。 */
function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    w += ch.codePointAt(0)! > 0x2e80 ? 2 : 1;
  }
  return w;
}

type Parsed = { draft: boolean; description: string | null };

/** 從 markdown 內容抽出 frontmatter 的 description（單行 YAML scalar）與 draft 旗標。 */
function parseFrontmatter(content: string): Parsed | null {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const draft = /^draft:[ \t]*true[ \t]*$/m.test(fm[1]);
  const line = fm[1].match(/^description:[ \t]*(.*)$/m);
  let description: string | null = null;
  if (line) {
    let v = line[1].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    description = v;
  }
  return { draft, description };
}

type Row = { file: string; width: number; desc: string };

function classify(width: number): "short" | "long" | "ok" | "ideal" {
  if (width < MIN_WIDTH) return "short";
  if (width > IDEAL_MAX) return "long";
  if (width >= IDEAL_MIN) return "ideal";
  return "ok";
}

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const fileArgs = args.filter(a => !a.startsWith("--"));

/** 遞迴列出 blog 目錄下的 .md/.mdx（略過底線開頭的檔案／目錄，與 content loader 一致）。 */
function scanBlogFiles(): string[] {
  return readdirSync(BLOG_DIR, { recursive: true, encoding: "utf-8" })
    .filter(f => {
      const base = f.split("/").pop() ?? f;
      return /\.(md|mdx)$/.test(base) && !f.split("/").some(p => p.startsWith("_"));
    })
    .map(f => resolve(BLOG_DIR, f));
}

// 有指定檔案 → 只檢查這些檔案且強制 strict（lint-staged 模式）；否則全庫掃描。
const files = fileArgs.length > 0 ? fileArgs : scanBlogFiles();
const enforce = strict || fileArgs.length > 0;

const short: Row[] = [];
const long: Row[] = [];
let ideal = 0;
let ok = 0;
let missing = 0;
let drafts = 0;

for (const file of files) {
  const rel = file.replace(`${process.cwd()}/`, "");
  const parsed = parseFrontmatter(readFileSync(file, "utf-8"));
  // 草稿不會進 production build，搜尋引擎看不到，略過不檢查。
  if (parsed?.draft) {
    drafts++;
    continue;
  }
  const desc = parsed?.description;
  if (!desc) {
    missing++;
    short.push({ file: rel, width: 0, desc: "(缺 description)" });
    continue;
  }
  const width = displayWidth(desc);
  const kind = classify(width);
  if (kind === "short") short.push({ file: rel, width, desc });
  else if (kind === "long") long.push({ file: rel, width, desc });
  else if (kind === "ideal") ideal++;
  else ok++;
}

/* eslint-disable no-console */
const print = (rows: Row[], label: string) => {
  if (rows.length === 0) return;
  console.log(`\n${label}`);
  for (const r of rows.sort((a, b) => a.width - b.width)) {
    console.log(`  ${String(r.width).padStart(4)}w  ${r.file}`);
  }
};

console.log(
  `掃描 ${files.length} 篇文章（顯示寬度單位：半形；略過草稿 ${drafts} 篇）`
);
console.log(
  `  理想 ${IDEAL_MIN}–${IDEAL_MAX}: ${ideal}　可接受 ${MIN_WIDTH}–${IDEAL_MIN - 1}: ${ok}　過短 <${MIN_WIDTH}: ${short.length}　過長 >${IDEAL_MAX}: ${long.length}`
);
print(short, `⚠️  過短（<${MIN_WIDTH}，Bing 會回報 too short）：`);
print(long, `⚠️  過長（>${IDEAL_MAX}，SERP 會截斷尾段）：`);
if (missing > 0) console.log(`\n❌ 缺 description：${missing} 篇`);

const violations = short.length + long.length;
if (violations === 0) {
  console.log("\n✅ 全部落在可接受區間");
} else if (enforce) {
  console.log(`\n✗ ${violations} 篇超出區間（strict 模式）`);
  process.exit(1);
} else {
  console.log(`\nℹ️  advisory 模式（exit 0）；加 --strict 可讓 CI 把關`);
}

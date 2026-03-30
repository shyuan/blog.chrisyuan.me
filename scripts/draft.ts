#!/usr/bin/env bun
/**
 * 快速建立草稿文章
 * 用法: bun run draft "文章標題" ["slug"]
 * 範例: bun run draft "為什麼我從 Vim 換到 Neovim"
 *       bun run draft "為什麼我從 Vim 換到 Neovim" "why-i-switched-from-vim-to-neovim"
 */

import kebabCase from "lodash.kebabcase";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BLOG_DIR = resolve(import.meta.dirname, "../src/data/blog");

const title = process.argv[2];
if (!title) {
  console.error("用法: bun run draft \"文章標題\" [\"slug\"]"); // eslint-disable-line no-console
  process.exit(1);
}

const slug = process.argv[3] || kebabCase(title);
const filename = `${slug}.md`;
const filepath = resolve(BLOG_DIR, filename);

if (existsSync(filepath)) {
  console.error(`❌ 檔案已存在: src/data/blog/${filename}`); // eslint-disable-line no-console
  process.exit(1);
}

const today = new Date().toISOString().split("T")[0] + "T00:00:00Z";

const content = `---
pubDatetime: ${today}
title: "${title.replace(/"/g, '\\"')}"
slug: "${slug}"
tags:
  - draft
description: ""
draft: true
---

## Table of contents

## 想法

`;

writeFileSync(filepath, content, "utf-8");
console.log(`✅ 草稿已建立: src/data/blog/${filename}`); // eslint-disable-line no-console

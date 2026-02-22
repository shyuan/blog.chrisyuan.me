# blog.chrisyuan.me

Chris Yuan 的個人部落格 — 技術筆記與時事觀察，涵蓋 DevOps、Cloud、AI、CLI 工具實務，以及地緣政治、台灣議題分析。

基於 [AstroPaper v5](https://github.com/satnaing/astro-paper) 主題，套用 Terminal CSS 風格（Fira Code monospace 字型、復古終端機美學），部署至 [Cloudflare Pages](https://pages.cloudflare.com/)。

> https://blog.chrisyuan.me

## Tech Stack

| 項目            | 技術                                                                                   |
| :-------------- | :------------------------------------------------------------------------------------- |
| Framework       | [Astro](https://astro.build/) 5.x                                                      |
| Styling         | [Tailwind CSS](https://tailwindcss.com/) 4.x + Terminal CSS 配色                       |
| Content         | Markdown / MDX                                                                         |
| Search          | [Pagefind](https://pagefind.app/)                                                      |
| OG Image        | [satori](https://github.com/vercel/satori) + [sharp](https://sharp.pixelplumbing.com/) |
| Deployment      | GitHub Actions + [Cloudflare Pages](https://pages.cloudflare.com/)                     |
| Package Manager | [bun](https://bun.sh/)                                                                 |

## Getting Started

```bash
# 安裝依賴
bun install

# 開發伺服器 (localhost:4321)
bun dev

# 建置（含 astro check + OG 圖片 + pagefind 索引）
bun run build

# 快速建置（跳過 OG 圖片生成）
bun run build:fast

# 預覽建置結果
bun run preview
```

## Commands

| Command                | Action                                   |
| :--------------------- | :--------------------------------------- |
| `bun install`          | 安裝依賴                                 |
| `bun dev`              | 啟動開發伺服器 `localhost:4321`          |
| `bun run build`        | 建置正式站（含 OG 圖片 + Pagefind 索引） |
| `bun run build:fast`   | 快速建置（跳過 OG 圖片生成）             |
| `bun run preview`      | 預覽建置結果                             |
| `bun run format`       | 格式化程式碼（Prettier）                 |
| `bun run format:check` | 檢查程式碼格式                           |
| `bun run lint`         | ESLint 檢查                              |
| `bun astro check`      | Astro 型別檢查                           |

## Project Structure

```
src/
├── components/          # Astro 元件
├── data/
│   └── blog/            # Markdown 文章（主要寫作位置）
├── layouts/             # 頁面佈局
├── pages/               # 路由頁面
├── styles/
│   ├── global.css       # 主要樣式：配色、字型、Terminal 風格
│   └── typography.css   # 文章排版（prose 覆寫）
├── utils/               # 工具函式、OG 模板
├── config.ts            # 網站設定
└── content.config.ts    # Content Collections 定義
```

文章放在 `src/data/blog/` 目錄，以 `.md` 格式撰寫。

## Writing Posts

在 `src/data/blog/` 新增 `.md` 檔案，frontmatter 範例：

```yaml
---
pubDatetime: 2025-02-04T00:00:00Z
title: "文章標題"
slug: "url-slug"
draft: false
tags:
  - devops
  - cloud
description: "文章描述，用於 SEO 與社群分享"
---
## Table of contents
```

重點注意：

- frontmatter 後須加 `## Table of contents`（自動產生目錄）
- 內文標題從 h2（`##`）開始，不使用 h1
- 中文檔名時 `slug` 必填，使用英文 kebab-case

## Deployment

透過 GitHub Actions 自動部署：

- **PR** 觸發 CI（lint + format check + build）
- **Push to main** 觸發部署至 Cloudflare Pages

## License

Licensed under the MIT License, Copyright © 2025

Based on [AstroPaper](https://github.com/satnaing/astro-paper) by [Sat Naing](https://satnaing.dev).

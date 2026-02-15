# CLAUDE.md - Astro Blog 專案指引

## 專案概述

基於 AstroPaper v5 主題建立個人技術部落格，套用 Terminal CSS 風格（Fira Code monospace 字型、復古終端機美學），部署至 Cloudflare Pages。

## 技術棧

- **框架**: Astro 5.x (`^5.16.6`)
- **基礎主題**: AstroPaper v5 (https://github.com/satnaing/astro-paper)
- **樣式**: Tailwind CSS 4.x (CSS-based config) + Terminal CSS 配色
- **內容格式**: Markdown / MDX
- **部署**: GitHub Actions + Cloudflare Wrangler → Cloudflare Pages
- **套件管理**: bun

## 目錄結構

```
/
├── .github/
│   └── workflows/
│       ├── ci.yml              # PR 時執行 lint、format check、build
│       └── deploy.yml          # push main 時部署至 Cloudflare Pages
├── public/
│   ├── assets/                 # 靜態資源
│   ├── pagefind/               # 搜尋索引（build 時產生）
│   └── favicon.svg
├── src/
│   ├── assets/
│   │   ├── icons/
│   │   └── images/
│   ├── components/             # Astro 元件
│   ├── data/
│   │   └── blog/               # Markdown 文章（主要寫作位置）
│   │       ├── _releases/      # 底線開頭的子目錄不會被收錄
│   │       ├── examples/
│   │       └── *.md
│   ├── layouts/
│   │   ├── Layout.astro        # 全站 HTML 骨架、Font 載入、主題切換
│   │   ├── Main.astro
│   │   ├── PostDetails.astro
│   │   └── AboutLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about.md
│   │   ├── 404.astro
│   │   ├── search.astro
│   │   ├── posts/
│   │   ├── tags/
│   │   ├── archives/
│   │   ├── og.png.ts           # 動態 OG 圖片產生
│   │   ├── robots.txt.ts
│   │   └── rss.xml.ts
│   ├── scripts/
│   │   └── theme.ts            # 主題切換邏輯
│   ├── styles/
│   │   ├── global.css          # 主要樣式：配色、字型、Terminal 風格
│   │   └── typography.css      # 文章排版（prose 樣式覆寫）
│   ├── utils/
│   │   ├── generateOgImages.ts
│   │   ├── getSortedPosts.ts
│   │   ├── og-templates/
│   │   └── transformers/       # Shiki 自訂 transformer
│   ├── config.ts               # 網站設定（TODO: 需自訂）
│   ├── constants.ts
│   └── content.config.ts       # Astro Content Collections 定義
├── astro.config.ts
├── tsconfig.json
├── package.json
├── bun.lock
├── wrangler.toml
└── CLAUDE.md
```

## Astro 配置重點

`astro.config.ts` 主要設定：

- **Integrations**: `sitemap`, `mdx`
- **Tailwind**: 透過 `@tailwindcss/vite` 作為 Vite plugin 載入（非 `@astrojs/tailwind`）
- **Shiki**: 雙主題 `github-light` / `github-dark`，搭配 `@shikijs/transformers` 提供 diff、highlight、fileName 等功能
- **字型**: 使用 Astro experimental fonts API，透過 `fontProviders.google()` 載入 Fira Code
- **輸出模式**: `static`（預設）
- **圖片**: responsive styles + constrained layout

```typescript
// 字型設定（在 experimental.fonts 中）
{
  name: "Fira Code",
  cssVariable: "--font-fira-code",
  provider: fontProviders.google(),
  fallbacks: ["JetBrains Mono", "SF Mono", "Cascadia Code", "ui-monospace", "monospace"],
  weights: [400, 500, 600, 700],
}
```

## Terminal CSS 客製化

### 字型載入

在 `src/layouts/Layout.astro` 使用 Astro 的 `<Font>` 元件：

```astro
<Font
  cssVariable="--font-fira-code"
  preload={[{ subset: "latin", weight: 400, style: "normal" }]}
/>
```

### 樣式架構（`src/styles/global.css`）

Tailwind CSS 4.x 使用 CSS-based 配置，不使用 `tailwind.config.cjs`。所有主題變數定義在 `global.css`：

```css
@import "tailwindcss";
@import "./typography.css";

@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

/* Terminal CSS - Light */
:root,
html[data-theme="light"] {
  --background: #fafafa;
  --foreground: #282828;
  --accent: #c85050;
  --muted: #e6e6e6;
  --border: #c8c8c8;
}

/* Terminal CSS - Dark (主要配色) */
html[data-theme="dark"] {
  --background: #1a1a1d;
  --foreground: #c9cacc;
  --accent: #ff6b6b;
  --muted: #2d2d32;
  --border: #3c3c41;
}

/* 透過 @theme inline 暴露給 Tailwind 使用 */
@theme inline {
  --font-app: var(--font-fira-code);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-accent: var(--accent);
  --color-muted: var(--muted);
  --color-border: var(--border);
}
```

### Terminal 風格要素

- **字型**: Fira Code monospace，`letter-spacing: -0.01em`
- **選取文字**: accent 色 30% 透明度背景
- **連結**: 底線式 `border-bottom-2`，hover 時 accent 高亮
- **標題前綴**: 文章內 h1/h2/h3 顯示 `#`/`##`/`###` 前綴（opacity: 0.4）
- **程式碼區塊**: 無圓角（`border-radius: 0`），邊框
- **區塊引言**: accent 色左邊線 + 斜體

## Content Collections

文章定義在 `src/content.config.ts`，使用 glob loader 從 `src/data/blog/` 載入：

```typescript
const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: `./${BLOG_PATH}` }),
  schema: ({ image }) => z.object({
    author: z.string().default(SITE.author),
    pubDatetime: z.date(),
    modDatetime: z.date().optional().nullable(),
    title: z.string(),
    featured: z.boolean().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default(["others"]),
    ogImage: image().or(z.string()).optional(),
    description: z.string(),
    canonicalURL: z.string().optional(),
    hideEditPost: z.boolean().optional(),
    timezone: z.string().optional(),
  }),
});
```

## 文章 Frontmatter 格式

在 `src/data/blog/` 建立 `.md` 檔案：

```yaml
---
author: "作者名稱"          # 選用，預設取 SITE.author
pubDatetime: 2025-02-04T00:00:00Z
modDatetime: 2025-02-04T00:00:00Z  # 選用
title: "文章標題"
slug: "url-slug"              # 選用，預設使用檔名
featured: false               # 選用
draft: false                  # 選用
tags:
  - tag1
  - tag2
description: "文章描述"
ogImage: ""                   # 選用，社群分享圖片
---
```

## 部署設定

### GitHub Actions

- **`ci.yml`**: PR 觸發，執行 lint → format check → build
- **`deploy.yml`**: push 到 `main` 觸發，使用 bun 建置後透過 wrangler 部署至 Cloudflare Pages

兩個 workflow 皆使用 bun（`oven-sh/setup-bun@v2`）。

### Cloudflare 設定

1. 在 Cloudflare Dashboard 建立 Pages 專案
2. 取得 Account ID（帳戶首頁右側）
3. 建立 API Token（需要 Cloudflare Pages 編輯權限）
4. 在 GitHub repo Settings → Secrets 加入：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

### wrangler.toml

```toml
name = "shyuan-blog"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"
```

## 開發指令

```bash
# 開發伺服器
bun dev

# 建置（含 astro check + pagefind 索引）
bun run build

# 預覽建置結果
bun run preview

# 檢查 Astro 設定
bun astro check

# 格式化
bun run format

# Lint
bun run lint

# 新增文章
# 在 src/data/blog/ 建立 .md 檔案
```

## TODO（待自訂）

- [ ] 更新 `src/config.ts` 中的 `website`、`author`、`profile`、`title`、`desc`、`timezone`、`editPost.url`
- [ ] 在 GitHub Secrets 設定 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`
- [ ] 確認 `wrangler.toml` 和 `deploy.yml` 中的專案名稱 `shyuan-blog` 是否正確

## 注意事項

1. **Tailwind CSS 4.x**: 使用 CSS-based 配置（`@theme inline`），不使用 `tailwind.config.cjs`
2. **配色調整**: 修改 `src/styles/global.css` 中的 CSS 變數即可，可參考 https://panr.github.io/terminal-css/
3. **字型備援**: Fira Code → JetBrains Mono → SF Mono → Cascadia Code → ui-monospace → monospace
4. **深色模式**: 透過 `html[data-theme="dark"]` 切換，Terminal 風格建議以深色為主
5. **圖片優化**: 放在 `src/assets/` 的圖片會被 Astro 自動優化
6. **MDX 元件**: 已啟用 MDX 支援，可在文章中引入 Astro 元件
7. **搜尋功能**: 使用 Pagefind，build 時自動產生索引至 `dist/pagefind/`
8. **OG 圖片**: 支援動態產生，使用 satori + sharp

## 參考資源

- AstroPaper 文件: https://github.com/satnaing/astro-paper
- Terminal CSS 產生器: https://panr.github.io/terminal-css/
- Astro 官方文件: https://docs.astro.build/
- Cloudflare Pages 文件: https://developers.cloudflare.com/pages/
- Tailwind CSS 4.x: https://tailwindcss.com/docs

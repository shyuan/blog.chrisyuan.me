# CLAUDE.md - Astro Blog 專案指引

## 專案概述

基於 AstroPaper v5 主題建立個人技術部落格，套用 Terminal CSS 風格（Fira Code monospace 字型、復古終端機美學），部署至 Cloudflare Pages。

## 技術棧

- **框架**: Astro 7.x (`^7.0.0`，Rust 編譯器 + Vite 8 / Rolldown）
- **基礎主題**: AstroPaper v5 (https://github.com/satnaing/astro-paper)
- **樣式**: Tailwind CSS 4.x (CSS-based config) + Terminal CSS 配色
- **內容格式**: Markdown / MDX
- **CJK 間距**: AutoCorrect (`autocorrect-node`) — 強制 CJK 與英數間加空格
- **部署**: GitHub Actions + Cloudflare Wrangler → Cloudflare Pages
- **套件管理**: bun

## 目錄結構

```
/
├── .github/
│   └── workflows/
│       ├── ci.yml              # PR 時執行 lint job → build job
│       └── deploy.yml          # push main 時 lint job → build & deploy job
├── public/
│   ├── assets/                 # 靜態資源
│   ├── fonts/                  # 自託管字型子集（POJ、CJK 標點）
│   ├── noise.svg               # Noise 紋理疊層（SVG feTurbulence）
│   ├── pagefind/               # 搜尋索引（build 時產生）
│   └── favicon.svg
├── src/
│   ├── assets/
│   │   ├── icons/
│   │   └── images/
│   ├── components/             # Astro 元件
│   ├── data/
│   │   └── blog/               # Markdown 文章（主要寫作位置）
│   │       └── *.md            # 底線開頭的子目錄不會被收錄
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
│   │   ├── remark-mermaid.ts   # Mermaid → SVG remark plugin
│   │   ├── og-templates/
│   │   └── transformers/       # Shiki 自訂 transformer
│   ├── config.ts               # 網站設定
│   ├── constants.ts
│   └── content.config.ts       # Astro Content Collections 定義
├── .autocorrectrc             # AutoCorrect 設定（僅啟用 space-word）
├── astro.config.ts
├── tsconfig.json
├── package.json
├── bun.lock
└── CLAUDE.md
```

## Astro 配置重點

`astro.config.ts` 主要設定：

- **Integrations**: `sitemap`, `mdx`, `partytown`（Google Analytics）
- **Tailwind**: 透過 `@tailwindcss/vite` 作為 Vite plugin 載入（非 `@astrojs/tailwind`）
- **Markdown processor**: Astro 7 預設改用 Rust 的 Sätteri pipeline。本專案重度依賴 remark/rehype 外掛，故安裝 `@astrojs/markdown-remark` 並以 `markdown.processor: unified({ remarkPlugins, rehypePlugins })` 走回 unified 流程（`markdown.remarkPlugins` / `rehypePlugins` 頂層寫法已 deprecated，勿再使用）。`shikiConfig` 仍留在 `markdown` 頂層。`astro-embed` 仍以舊 API 注入 remark plugin，build 時會印一行 deprecation 警告，屬上游套件問題、不影響功能
- **Mermaid**: `beautiful-mermaid` 透過自製 remark plugin（`src/utils/remark-mermaid.ts`）在 build 時將 `` ```mermaid `` code block 渲染為 SVG
- **Shiki**: 雙主題 `github-light` / `github-dark`，搭配 `@shikijs/transformers` 提供 diff、highlight、fileName 等功能
- **字型**: 使用 Astro fonts API（Astro 6+ 穩定功能），透過 `fontProviders.google()` 載入 Fira Code
- **輸出模式**: `static`（預設）
- **圖片**: responsive styles + constrained layout

```typescript
// 字型設定（頂層 fonts 配置）
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
  --accent: #059669;
  --muted: #e6e6e6;
  --border: #c8c8c8;
}

/* Terminal CSS - Dark (主要配色) */
html[data-theme="dark"] {
  --background: #1a1a1d;
  --foreground: #c9cacc;
  --accent: #05ce91;
  --muted: #2d2d32;
  --border: #3c3c41;
}

/* 透過 @theme inline 暴露給 Tailwind 使用 */
@theme inline {
  --font-app: "Noto Sans Mono CJK TC", var(--font-fira-code);
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
- **程式碼區塊**: `rounded-md`、`border-2 border-accent/50`、`bg-muted/40`
- **表格**: `border border-accent/50`，與 code block 同色系
- **區塊引言**: accent 色左邊線 + 斜體
- **卡片**: hover 時 `translateY(-2px)` + accent 邊框 + 陰影
- **背景效果**: 格線底紋 + 頂部放射光暈 + Noise 紋理疊層（`Layout.astro`）
- **內容寬度**: `max-w-4xl`，xl 螢幕 `max-w-5xl`（原 Astro Paper 為 `max-w-3xl`）
- **Back-to-Top**: 固定右下角圓形按鈕 + conic-gradient 捲動進度環

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

## Table of contents
```

文章 frontmatter 結束後須加上 `## Table of contents`，`remark-toc` 會自動產生目錄，`remark-collapse` 會將其包成可收合區塊。

**重要**：`## Table of contents` 與下一個 h2 之間的內容會被 `remark-toc` 替換為自動生成的目錄，放在這個區間的散文會消失。如果文章有開場段落（無 h2 標題），必須放在 `## Table of contents` **之前**，這樣才能正常渲染。

### 新增文章 Checklist（從原始 Markdown 到可發布狀態）

當收到一份只有內容、沒有 frontmatter 的原始 Markdown 檔案時，依照以下步驟處理：

1. **補 frontmatter**：在檔案最上方加入 `---` 區塊，必填欄位：
   - `pubDatetime`：發布日期（ISO 8601 格式，如 `2026-02-19T00:00:00Z`）
   - `title`：文章標題（注意 YAML 引號跳脫，標題內含引號時用不同引號包裹）
   - `tags`：至少一個標籤
   - `description`：1-2 句摘要，用於 SEO 與社群分享卡片。長度以**顯示寬度**（半形單位）為準，不用原始字元數——詳見下方「meta description 長度標準」。目標 **130–156 半形（≈ 65–78 個中文字）**，把最重要的資訊放前 ~60 字
   - `slug`：英文 URL 路徑（如 `taiwan-stock-odd-lot-trading-reform`），中文檔名時必填，避免 URL 出現中文
   - `draft: false`：設為 false 才會發布
   - 選填：`featured`、`ogImage`、`canonicalURL`

2. **加 `## Table of contents`**：frontmatter `---` 結束後、內文開始前，加上 `## Table of contents`

3. **移除內文 h1 標題**：frontmatter 的 `title` 會自動渲染為 h1，內文不應重複寫 h1（`#`），否則頁面會出現兩個標題

4. **整理標題層級**：
   - 內文最高層級使用 h2（`##`），不使用 h1
   - 檢查 h2/h3 結構是否合理——相關段落應收納為同一 h2 下的 h3，避免過多扁平 h2 導致目錄冗長
   - 理想的 ToC 頂層項目控制在 4-6 個

5. **敘事改進**：使用 `pixar-storytelling-rules` skill 檢視文章結構，找出可讓敘事更生動的改進方向（適用於非純技術文章）

6. **AI 語法修訂**：使用 `writing-humanizer` skill 檢測並修正 AI 寫作痕跡（誇大象徵、宣傳性語言、否定式排比等），使文字更自然

7. **專有名詞補連結**：為人名、機構名、法案名、書名等專有名詞補上外部連結
   - 連結須經查證確認可正常訪問（使用 WebFetch 或 WebSearch 驗證）
   - 不可自行臆測 URL，必須查到實際頁面
   - 若遭網站技術性阻擋（Cloudflare 驗證、403 等），列出改由真人測試
   - 優先使用官方網站、維基百科、或權威來源

8. **CJK 間距**：執行 `bun run fix:text` 自動在 CJK 與英數之間補上空格（或依賴 lint-staged 在 commit 時自動修正）

9. **檢查 description 長度**：執行 `bun run lint:desc`，確認新文章的 meta description 顯示寬度落在 130–156 半形（過短會被 Bing 回報 too short、過長會被 SERP 截斷）

10. **驗證建置**：執行 `bun run build` 確認無錯誤

### meta description 長度標準

搜尋引擎的 SERP snippet 是依**像素寬度**截斷（桌機 ~920px、手機 ~680px），**不是字元數**。英文 920px ≈ 150–160 字元，但 CJK 每字約佔 2 倍寬，所以中文約 65–80 字就填滿。因此本專案以「半形等寬」估算顯示寬度（CJK／全形 = 2、ASCII = 1），而非字元數。

| 區間（半形寬度） | 判定 | 說明 |
|---|---|---|
| < 100 | 過短 | Bing Webmaster Tools 會回報「meta description too short」 |
| 100–129 | 可接受 | 不理想但不會被特別標記 |
| **130–156** | **理想** | 中文約 65–78 字，前置重點、不被 SERP 截斷 |
| > 156 | 過長 | 桌機 SERP 會截斷尾段 |

要點：

- **不要追 Bing 建議的 150–160「字元數」**——那是英文校準值，對中文站是偽陽性；硬塞到 150 字會讓顯示寬度爆到 ~300，反而被 SERP 截斷
- **前置重要資訊**：手機只顯示前 ~120px（~60 中文字），把賣點／關鍵字放最前面
- 長度**不影響排名**（Google 官方多次重申），只影響 CTR；且 Google 約七成情況會自行改寫 description
- 結構頁（home／posts／archives／tags）的 meta description 來自 `SITE.desc`（`src/config.ts`）與各頁面傳給 `<Layout>` 的 `description` prop，不要讓它們共用 fallback
- **GEO（生成式引擎優化）**：對 AI 答案引擎而言 meta description 影響很小，重點在內文前 200 字直接回答主問題、結構化（短段落／清單／表格）、freshness、robots.txt 不擋 AI 爬蟲——本專案的 Astro 靜態站天然符合

檢查指令：

```bash
bun run lint:desc              # 掃描全部文章，advisory（exit 0）
bun run lint:desc --strict     # 有違規就 exit 1（CI 全庫把關用）
```

`scripts/lint-descriptions.ts` 會略過 `draft: true` 的草稿。目前既有文章中仍有部分落在區間外（過短／過長），屬待整理項目，故預設為 advisory、未納入 CI 硬擋。

## 部署設定

### GitHub Actions

兩個 workflow 皆使用 bun（`oven-sh/setup-bun@v2`），各自拆為兩個 job：

- **`ci.yml`**（PR 觸發）：
  1. **lint** job：AutoCorrect（CJK 間距）→ ESLint → format check
  2. **build** job：`bun run build`（含 OG 圖片，完整驗證）
- **`deploy.yml`**（push 到 `main` / 每小時 cron / `workflow_dispatch` 觸發）：
  1. **lint** job：同 ci.yml
  2. **deploy** job：`bun run build`（含 GA 環境變數）→ wrangler 部署至 Cloudflare Pages

lint 快速失敗時不浪費 build 資源；deploy 只 build 一次（不再透過 `workflow_call` 呼叫 ci.yml 導致雙重 build）。

### 排程發布（scheduledPostMargin）

文章 frontmatter 的 `pubDatetime` 可以設為未來時間。`src/utils/postFilter.ts` 在 production build 時會依下列規則決定文章是否納入：

```ts
Date.now() > new Date(pubDatetime).getTime() - SITE.scheduledPostMargin
```

- **`SITE.scheduledPostMargin`**（`src/config.ts`）預設 `65 * 60 * 1000` = 65 分鐘
- 配合 `deploy.yml` 的 `schedule: cron "0 * * * *"`（每小時 0 分觸發 rebuild）
- 意義：文章 `pubDatetime` 與 build 時間的差距小於 65 分鐘時即會上線；GitHub Actions cron 通常會延遲 0-15 分鐘，65 分 margin 確保「下個整點 cron」一定會把文章納入
- **生效範圍**（dev 模式不檢查，所有非 draft 都顯示）：`index.astro`、`posts/[...page].astro`、`posts/[...slug]/index.astro`、`archives/index.astro`、`tags/*`、`rss.xml.ts`、`llms.txt.ts`、`og.png.ts`（per-post）
- **dev 不受影響**：`import.meta.env.DEV` 時 postFilter 跳過時間檢查，未來日期的文章在本地預覽都可見

### Cloudflare 設定

- **Pages 專案名稱**: `blog-chrisyuan-me`
- **自訂網域**: `blog.chrisyuan.me`
- **GitHub Repo**: https://github.com/shyuan/blog.chrisyuan.me
- **GitHub Secrets**:
  - `CLOUDFLARE_API_TOKEN`（需要 Cloudflare Pages 編輯權限）
  - `CLOUDFLARE_ACCOUNT_ID`
- **GitHub Variables**:
  - `PUBLIC_GA_MEASUREMENT_ID`（Google Analytics GA4 Measurement ID，格式 `G-XXXXXXXXXX`）

### Google Analytics

- 使用 `@astrojs/partytown` 將 GA4 script 移至 Web Worker 執行，避免影響主執行緒效能
- GA script 在 `src/layouts/Layout.astro` 中透過 `type="text/partytown"` 載入
- 環境變數 `PUBLIC_GA_MEASUREMENT_ID` 定義在 `astro.config.ts` 的 `env.schema` 中
- 條件渲染：未設定環境變數時不會注入 GA script
- `deploy.yml` 的 build step 透過 `${{ vars.PUBLIC_GA_MEASUREMENT_ID }}` 注入環境變數

## 開發指令

```bash
# 開發伺服器
bun dev

# 建置（含 astro check + OG 圖片 + pagefind 索引）
bun run build

# 快速建置（跳過 OG 圖片生成，~12s vs ~15s，差異已不大）
bun run build:fast

# 預覽建置結果
bun run preview

# 檢查 Astro 設定
bun astro check

# 格式化
bun run format

# Lint
bun run lint

# CJK 間距檢查（CJK 與英數之間須有空格）
bun run lint:text

# CJK 間距自動修正
bun run fix:text

# meta description 長度檢查（顯示寬度，advisory）
bun run lint:desc
bun run lint:desc --strict   # 有違規就 exit 1

# 新增文章
# 在 src/data/blog/ 建立 .md 檔案
```

## 注意事項

1. **Tailwind CSS 4.x**: 使用 CSS-based 配置（`@theme inline`），不使用 `tailwind.config.cjs`
2. **配色調整**: 修改 `src/styles/global.css` 中的 CSS 變數即可，可參考 https://panr.github.io/terminal-css/
3. **字型備援**: Fira Code → JetBrains Mono → SF Mono → Cascadia Code → ui-monospace → monospace
4. **深色模式**: 透過 `html[data-theme="dark"]` 切換，Terminal 風格建議以深色為主
5. **圖片優化**: 放在 `src/assets/` 的圖片會被 Astro 自動優化
6. **MDX 元件**: 已啟用 MDX 支援，可在文章中引入 Astro 元件
7. **搜尋功能**: 使用 Pagefind，build 時自動產生索引至 `dist/pagefind/`
8. **OG 圖片**: 支援動態產生，使用 satori + @resvg/resvg-js，字型預載至 temp file 避免重複解析（詳見下方 OG 圖片架構）
9. **CJK 間距**: `text-autospace: no-autospace`（防止瀏覽器自動加間距破壞 monospace 對齊），改由 AutoCorrect 在 `.md` 原始碼層級處理。lint-staged 會在 commit `.md` 時自動 `autocorrect --fix`
10. **AutoCorrect 設定**: `.autocorrectrc` 僅啟用 `space-word` 規則，其餘（fullwidth、spellcheck 等）皆關閉。行內停用：`<!-- autocorrect-disable -->` / `<!-- autocorrect-enable -->`
11. **Mermaid 圖表**: 在 Markdown 中使用 `` ```mermaid `` code block，build 時由 `beautiful-mermaid` 渲染為 inline SVG。支援 flowchart、sequence、state、class、ER、XY chart。SVG 使用 CSS 變數（`var(--background)` 等），dark/light 主題自動適配。樣式與 code block 一致（`border-2 border-accent/50`、`bg-muted/40`）

## OG 圖片架構

使用 satori（virtual DOM → SVG）+ @resvg/resvg-js（SVG → PNG）動態生成 OG 圖片：

- **模板位置**：`src/utils/og-templates/site.ts`（全站）、`post.ts`（文章）
- **字型載入**：`src/utils/loadGoogleFont.ts`，使用 Fira Code + Noto Sans TC
- **字型預載**：`preloadFonts()` 在 `getStaticPaths` 收集所有文章標題字元，一次下載 4 個字型子集（Fira Code 400/700 + Noto Sans TC 400/700），寫入 `os.tmpdir()` 作為 temp file
- **resvg fontFiles**：`generateOgImages.ts` 透過 `getFontFilePaths()` 取得 temp file 路徑，傳入 resvg 的 `font.fontFiles` 選項，避免每張圖重新解析嵌入字型（這是原本 ~2.8s/張的瓶頸）
- **字元累積**：`preloadFonts()` 支援多次呼叫，自動累積字元集，只在發現新字元時才重新 fetch Google Fonts API
- **全站 OG**：`SITE.ogImage` 設為空字串，fallback 到動態端點 `/og.png`
- **文章 OG**：`SITE.dynamicOgImage` 控制是否生成，`FAST_BUILD=true` 時跳過
- **視覺風格**：Terminal 深色主題（#1a1a1d 背景、終端機 title bar 三色圓點、prompt 行、游標）
- **重要**：`loadGoogleFont` 的 `text` 參數必須涵蓋圖片中所有字元，缺字會顯示方框（⊠）。路徑符號如 `/`、`~`、`>` 容易遺漏

## 參考資源

- AstroPaper 文件: https://github.com/satnaing/astro-paper
- Terminal CSS 產生器: https://panr.github.io/terminal-css/
- Astro 官方文件: https://docs.astro.build/
- Cloudflare Pages 文件: https://developers.cloudflare.com/pages/
- Tailwind CSS 4.x: https://tailwindcss.com/docs

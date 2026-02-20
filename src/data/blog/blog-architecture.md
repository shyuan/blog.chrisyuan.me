---
pubDatetime: 2026-02-21T00:00:00Z
title: 這個部落格是怎麼蓋的
slug: blog-architecture
tags:
  - astro
  - cloudflare
  - bun
  - github-actions
description: "從 Hashnode 搬家到自架 Astro 部落格的動機與技術選型：Terminal 視覺風格、bun 建置、GitHub Actions CI/CD、Cloudflare Pages 部署。"
draft: false
---

## Table of contents

## 離開 Hashnode

之前部落格放在 [Hashnode](https://hashnode.com/)，用了一陣子後發現幾個痛點。Hashnode 的主要客群是英語世界的開發者，對中文內容的支援不太友善——最明顯的問題是 slug 產生機制。英文標題可以自動轉成乾淨的 URL slug，但中文標題完全無法處理，既不會用拼音也不會保留中文，就是產生一串無意義的字元。

我的 workaround 是在每篇文章的中文標題後面加上括號寫一次英文翻譯，像是「台股零股交易變革（Taiwan Stock Odd Lot Trading Reform）」，讓 Hashnode 能從括號裡的英文產生 slug。每次寫文章都要多做這一步，久了實在煩。

既然都要自己處理 slug，不如乾脆自己架，想怎麼控制就怎麼控制。

## 我想要的視覺風格

我一直很喜歡 monospace 等寬字型搭配 Terminal/TUI 風格的網頁設計。這種風格有幾個特點：用等寬字型排版、色彩簡潔、看起來像在終端機裡閱讀。一些讓我很有感覺的參考：

- [PlanetScale](https://planetscale.com/) 官網——monospace 字型配上精緻的技術感排版
- [ASCII Moon](https://asciimoon.com/)——用 ASCII art 呈現月相，極簡到不行
- [WebTUI](https://github.com/webtui/webtui)——把 TUI 的設計語言搬到網頁上
- [Terminal.css](https://github.com/panr/terminal-css)——直接把終端機的美學做成 CSS framework

這個部落格最終採用了 [Terminal.css](https://terminalcss.xyz/) 的配色方案，字型選用 [Fira Code](https://github.com/tonsky/FiraCode)，搭配 `letter-spacing: -0.01em` 讓文字更緊湊。一些細節像是標題前面會顯示 `##`、`###` 前綴（模擬 Markdown 語法）、程式碼區塊用方正無圓角的邊框、連結用底線而非變色——都是為了維持那種「在終端機裡讀文件」的感覺。

## 為什麼選 Astro

[Astro](https://astro.build/) 這個 framework 我關注很久了。它的核心理念是 content-first，預設輸出純靜態 HTML，不送多餘的 JavaScript 到瀏覽器——對技術部落格來說這正是我要的。

觸發我動手的契機是 [Cloudflare 併購了 Astro 團隊](https://astro.build/blog/joining-cloudflare/)。Cloudflare 已經是我主要的基礎設施提供者（DNS、CDN、Pages），看到他們把 Astro 納入旗下讓我對這個 framework 的長期發展更有信心。在此之前 Cloudflare 也[捐贈了 $150,000 給 Astro](https://astro.build/blog/cloudflare-official-partner/) 成為官方託管夥伴。

起點是 [AstroPaper](https://github.com/satnaing/astro-paper) 這個模板。它是 Astro 生態系中最受歡迎的部落格模板之一，內建了文章管理、標籤系統、搜尋、RSS、OG 圖片產生等功能，省去從零開始的大量工作。我在這個基礎上套用 Terminal CSS 風格，調整配色和排版，就得到了現在的樣子。

## 用 bun 加速建置

[bun](https://bun.sh/) 是一個用 Zig 寫的 JavaScript/TypeScript runtime，同時也是套件管理器和 bundler。選擇 bun 的主要原因是速度——`bun install` 比 `npm install` 快很多，整體建置時間也有感縮短。

[Anthropic 在 2025 年底併購了 bun 的公司 Oven](https://bun.com/blog/bun-joins-anthropic)，這是 Anthropic 的第一筆收購案。bun 會維持開源與 MIT 授權，原團隊繼續開發。Anthropic 在 AI 領域的投入加上 bun 的效能優勢，這個組合很值得期待。

目前的建置流程：

```bash
# 完整建置（含 OG 圖片產生，~185s）
bun run build

# 快速建置（跳過 OG 圖片，~14s）
bun run build:fast
```

完整的 `build` 指令實際上串了四個步驟：

```bash
astro check && astro build && pagefind --site dist && cp -r dist/pagefind public/
```

1. `astro check`——TypeScript 型別檢查
2. `astro build`——靜態網站產生（包含動態 OG 圖片）
3. `pagefind --site dist`——建立全站搜尋索引
4. `cp -r dist/pagefind public/`——把搜尋索引複製到 public 目錄供開發用

## GitHub Actions：CI/CD Pipeline

我想要充分利用 GitHub Actions 來自動化整個建置和部署流程，而不是把 CI/CD 交給 Cloudflare 管理。這樣做的好處是完全掌控每一步要執行什麼、什麼條件下才部署。

### CI（Pull Request 檢查）

每次開 PR 都會觸發 CI workflow，依序執行：

```
bun install → bun run lint → bun run format:check → bun run build
```

lint、格式檢查、建置都通過才算 CI 成功。這個 workflow 同時也被 deploy workflow 引用為 reusable workflow。

### Deploy（推上 main 自動部署）

Push 到 `main` 分支後：

1. 先呼叫 CI workflow 確認品質
2. CI 通過後才執行部署步驟
3. 用 `bun run build` 建置（注入 Google Analytics 的 Measurement ID）
4. 透過 [Wrangler](https://developers.cloudflare.com/workers/wrangler/) 把 `dist/` 目錄部署到 Cloudflare Pages

```yaml
- name: Deploy to Cloudflare Pages
  uses: cloudflare/wrangler-action@v3
  with:
    command: pages deploy dist --project-name=blog-chrisyuan-me --commit-dirty=true
```

## Cloudflare Pages：不用 Git Hook 的部署方式

Cloudflare Pages 預設的使用方式是直接連結 GitHub repo，讓 Cloudflare 自己監聽 commit 然後觸發建置。但我刻意不這樣做。

原因是我想要更細緻的控制：

- **自訂建置工具**：我要用 bun 而不是 npm，Cloudflare 的建置環境雖然支援 bun，但我更信任自己管理的 GitHub Actions 環境
- **CI 品質門檻**：部署前必須通過 lint、format check、build 三關，Cloudflare 原生的 hook 機制不方便加這些檢查
- **環境變數管理**：Google Analytics 的 Measurement ID 透過 GitHub Variables 注入，不需要在 Cloudflare 端額外設定
- **建置快取**：GitHub Actions 的快取機制比較成熟，bun 的依賴快取可以大幅加速 CI

做法是在 Cloudflare Pages 專案中不設定 Git 整合，改用 Wrangler CLI 的 `pages deploy` 指令從 GitHub Actions 主動推送建置產物。只需要在 GitHub Secrets 中設定 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID` 就好。

這樣 Cloudflare Pages 就變成一個純粹的靜態網站託管服務，搭配它本身的全球 CDN 和自訂網域功能，簡單又夠用。

## 小結

整個架構可以用一句話概括：**Astro 產生靜態頁面，bun 加速建置，GitHub Actions 控制 CI/CD，Cloudflare Pages 負責託管。**

每個環節都選擇了自己能完全掌控的方案——從 Hashnode 搬出來就是為了這個。寫文章用 Markdown、slug 自己定、視覺風格自己調、部署流程自己管，不再被平台的限制綁住。

## 參考資料

### Framework 與模板

- [Astro](https://astro.build/) — content-first 的靜態網站框架
- [AstroPaper](https://github.com/satnaing/astro-paper) — 本站使用的 Astro 部落格模板
- [Astro Docs](https://docs.astro.build/) — Astro 官方文件
- [Astro is joining Cloudflare](https://astro.build/blog/joining-cloudflare/) — Astro 團隊加入 Cloudflare 的公告
- [Cloudflare Acquires Astro](https://blog.cloudflare.com/astro-joins-cloudflare/) — Cloudflare 官方部落格公告

### Terminal / Monospace 視覺風格參考

- [Terminal.css](https://terminalcss.xyz/) — 終端機風格 CSS framework（[GitHub](https://github.com/panr/terminal-css)）
- [WebTUI](https://github.com/webtui/webtui) — 把 TUI 設計語言帶到網頁
- [ASCII Moon](https://asciimoon.com/) — 用 ASCII art 呈現即時月相
- [PlanetScale](https://planetscale.com/) — monospace 排版的經典商業網站
- [Fira Code](https://github.com/tonsky/FiraCode) — 本站使用的等寬字型，支援 ligatures

### 建置與部署

- [bun](https://bun.sh/) — 高效能 JavaScript/TypeScript runtime 與套件管理器
- [Bun is joining Anthropic](https://bun.com/blog/bun-joins-anthropic) — Anthropic 併購 bun 的官方公告
- [Cloudflare Pages](https://pages.cloudflare.com/) — 靜態網站託管與全球 CDN
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) — Cloudflare 的 CLI 工具，用於部署 Pages
- [GitHub Actions](https://docs.github.com/en/actions) — CI/CD 自動化平台

### 其他用到的工具

- [Pagefind](https://pagefind.app/) — 靜態網站的全文搜尋引擎
- [Shiki](https://shiki.style/) — 語法高亮引擎，支援 VS Code 主題
- [satori](https://github.com/vercel/satori) — 用 HTML/CSS 產生 SVG，本站用於動態 OG 圖片

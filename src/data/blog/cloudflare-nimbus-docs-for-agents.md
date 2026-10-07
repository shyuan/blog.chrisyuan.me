---
pubDatetime: 2026-10-07T05:15:00Z
title: "Cloudflare 為何捨棄 Starlight 自製 Nimbus：寫技術文件的人該懂的 agent 優先設計"
slug: "cloudflare-nimbus-docs-for-agents"
featured: false
draft: false
tags:
  - astro
  - AI
  - cloudflare
  - documentation
description: "Cloudflare 把開發者文件從 Starlight 換成自製的 Nimbus，前提是 agent 會成為文件的主要讀者：每頁附 Markdown 版與 llms.txt，安裝功能也交給 coding agent。"
---

2026 年 7 月 21 日，Cloudflare 在 [cloudflare-docs](https://github.com/cloudflare/cloudflare-docs) repo 合併了一個標題只有「nimbus: live」的 [PR #32181](https://github.com/cloudflare/cloudflare-docs/pull/32181)，把 [developers.cloudflare.com](https://developers.cloudflare.com/) 的建置切到自己開發的文件框架 [Nimbus](https://nimbus-docs.com/)。在這之前，這個站跑的是 Astro 官方的文件主題 [Starlight](https://starlight.astro.build/)（切換前的 `package.json` 是 `@astrojs/starlight` 0.39.2）。

文件站產生器（SSG）已經很多了，[Docusaurus](https://docusaurus.io/)、Starlight、[Mintlify](https://www.mintlify.com/) 各有大量使用者。Cloudflare 為什麼還要自己做一個？我讀完 Nimbus 的文件和原始碼，覺得答案在它的前提：技術文件以後的主要讀者會是 AI agent，人退到第二位。Nimbus 從輸出格式到 CLI 都照這個前提設計。

本文的資料來源是 Nimbus 的 [GitHub repo](https://github.com/cloudflare/nimbus)（MIT 授權，2026-10-04 發布 `@cloudflare/nimbus-docs` 0.16.0）、nimbus-docs.com 與 developers.cloudflare.com 的實際回應（2026-10-07 以 `curl` 取得）。Cloudflare 沒有發文說明為什麼換掉 Starlight，文中提到的動機取自 Nimbus 文件的 [Philosophy](https://nimbus-docs.com/philosophy/) 頁。

## Table of contents

## Agent 讀文件的方式和人不同

人打開文件頁，看的是排版過的 HTML：側欄、麵包屑、分頁標籤、可以複製的程式碼區塊。Coding agent 拿到同一頁，得先從一大段 HTML 裡把導覽列、script、樣式剝掉，才找得到正文。分頁標籤裡的 npm／pnpm／bun 三種指令，在 HTML 裡可能是三個隱藏的 `<div>`，抽取時容易丟失或混在一起。

Agent 比較想要乾淨的 Markdown 正文，token 少，不用猜哪段是導覽。它也需要一份索引，先知道站上有哪些頁面，再決定讀哪幾頁。後者就是 [llms.txt](https://llmstxt.org/) 提案在做的事：在網站根目錄放一份 Markdown 格式的清單，列出重要頁面與一句說明。這個提案由 Answer.AI 的 Jeremy Howard 在 [2024 年 9 月發表](https://www.answer.ai/posts/2024-09-03-llmstxt.html)，之後很多文件平台都跟進了：Mintlify [會自動產生](https://www.mintlify.com/docs/ai/llmstxt)，Starlight 也有社群外掛 [starlight-llms-txt](https://github.com/delucis/starlight-llms-txt)。

所以「讓 agent 讀得到」本身已經不算新鮮。Nimbus 自己在 Philosophy 頁也承認這點：

> Every Nimbus site already ships the formats agents read … A year ago that set a docs tool apart; today it's table stakes.

Nimbus 和其他工具的差別有兩個。一個是 agent 版本的細節做得很足，而且是框架預設；另一個是它假設 agent 也會改文件、維護文件。

## Nimbus 怎麼把文件交給 agent

用 `npx @cloudflare/create-nimbus-docs@latest my-docs` 建立的專案是一個普通的 Astro 7 專案（`@cloudflare/nimbus-docs` 的 peer dependency 是 `astro >=7.2.6 <8.0.0`）。Agent 相關的功能不需要另外安裝，scaffold 出來就有。

### 每一頁都有 `.md` 與 `.mdx` 兩個版本

任何一頁網址後面加 `index.md`，就會拿到該頁的 Markdown 版本，Content-Type 是 `text/markdown`。以 Get started 頁為例：

```bash
curl -s https://nimbus-docs.com/get-started/index.md
```

<!-- prettier-ignore -->
````markdown
---
title: "Get started"
description: "Build docs on Astro where humans and agents are both first-class — and you own every file."
---

> Documentation Index
> Fetch the complete documentation index at: https://nimbus-docs.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Get started
...
## Quickstart

```sh
npm create @cloudflare/nimbus-docs@latest
yarn create @cloudflare/nimbus-docs
pnpm create @cloudflare/nimbus-docs@latest
bun create @cloudflare/nimbus-docs@latest
```
````

開頭多出來的「Documentation Index」是 Nimbus 自動加的，agent 不管從哪一頁進來，都會被叫回去先讀 `llms.txt`。原始 MDX 裡的 `<PackageManagers>` 元件，在這裡被展開成四行純文字指令；`<CardGrid>` 則變成一般清單。檔案結尾還有一行 `Source: …/index.mdx`，指向保留 JSX 原貌的 `.mdx` 版本，要改這份文件的 agent 可以直接拿原始碼。

把 MDX 轉成 Markdown 的是 `renderEntryAsMarkdown()`（`packages/nimbus-docs/src/_internal/transform.ts`）。它不會整份重新序列化：如果某一塊在 MDX 和 Markdown 中語意相同，就保留作者原本的寫法，只有轉換會失真的地方才重寫。表格也刻意不對齊欄寬，原始碼的註解是：

```ts
// Unpadded tables: column alignment only adds bytes for an agent to read.
```

對齊欄寬是給人看的，agent 讀的時候只是多幾個 token，Nimbus 就把它拿掉了。

### 三層 `llms.txt` 索引

- `/llms.txt`：全站索引，列出頂層頁面的 `.md` 連結，與各 section 的子索引
- `/<section>/llms.txt`：每個章節一份，例如 [`/ai/llms.txt`](https://nimbus-docs.com/ai/llms.txt) 列出 AI 章節的四頁與各自的一句說明
- `/llms-full.txt`：整站合併成一份 Markdown，每頁以 `#` 標題分隔，附 `Source:`（HTML 網址）與 `Markdown:`（`.md` 網址）

Cloudflare 自己的文件站可以看出為什麼要分層。[developers.cloudflare.com/llms.txt](https://developers.cloudflare.com/llms.txt) 大約 17 KB，只列產品清單，每個產品再連到自己的 `llms.txt`。Cloudflare 有上百個產品，要是把全部頁面塞進一份索引，agent 光讀索引就會吃掉一大塊 context。

有版本的文件站，舊版本不會出現在主索引，各自有 `/<version>/llms.txt`；每份 `.md` 的 frontmatter 會帶 `version:`，讓 agent 能確認自己讀的是哪一版。

### 在 HTML 裡留導引

不是每個 agent 都知道要去找 `.md` 或 `llms.txt`，很多 agent 還是直接抓 HTML。Nimbus 在 HTML 裡放了兩種導引。第一種在 `<head>`：

<!-- prettier-ignore -->
```html
<link rel="alternate" type="text/markdown" href="https://nimbus-docs.com/get-started/index.md">
<link rel="alternate" type="text/plain" href="https://nimbus-docs.com/llms.txt" title="LLM index">
```

第二種在 `<body>`，是一段對人隱藏（`sr-only`）的文字，來自 starter 的 `AgentDirective.astro` 元件：

```html
<aside class="sr-only" data-ai-agent-directive>
  This page is available in Markdown format. Markdown is recommended for AI
  consumption. See <a href="…/index.md">…/index.md</a> for this page, or
  <a href="…/llms.txt">…/llms.txt</a> for the full documentation index.
</aside>
```

`<link rel="alternate">` 是給會解析 head 的工具用的；`AgentDirective` 是給把 HTML 轉成純文字再丟給模型的工具用的，轉換後這段話會留在正文開頭，模型讀到就知道有更適合的版本。頁面工具列另外還有給人用的「View as Markdown」按鈕。

### Build 時就產生好，而且每次結果相同

這些 Markdown 檔不是 request 進來才轉換，而是 build 時由 `bakeAgentEndpointAssets()`（`agent-endpoint-assets.ts`）一次產生：

- 每份檔案以 SHA-256 雜湊命名（內容定址），內容沒變就不重寫，可以增量快取
- `llms-full.txt` 依 URL 排序、不帶時間戳，同樣的內容重新 build，輸出的位元組完全相同（byte-identical）
- `draft: true`、`noindex: true` 的頁面與隱藏的版本會被排除；如果某頁無法判定是否公開，build 直接失敗，不會冒險把它放進索引

`.md` 和 `llms-full.txt` 都是公開的靜態檔，文件裡寫明 request 時的權限檢查保護不了它們，私密內容要放在 content collection 之外。多產生一份給 agent 的副本，就多一個外洩的出口，Nimbus 在 build 階段就把它擋掉。

### 連 Agent Skills 也一起發布

原始碼裡還有一個 `agent-skills.ts`：專案根目錄的 `skills/<name>/` 資料夾，會依 Cloudflare 提出的 [Agent Skills Discovery RFC](https://github.com/cloudflare/agent-skills-discovery-rfc) 發布到 `/.well-known/agent-skills/index.json`。developers.cloudflare.com 已經在用：

```bash
curl -s https://developers.cloudflare.com/.well-known/agent-skills/index.json
```

```json
{
  "$schema": "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
  "skills": [
    {
      "name": "agents-sdk",
      "type": "archive",
      "description": "Build, debug, or review Cloudflare Agents SDK applications using the agents package.",
      "url": "/.well-known/agent-skills/agents-sdk.tar.gz",
      "digest": "sha256:cd0f260a…"
```

`agents-sdk` 這個 skill 打包成 tar.gz，agent 可以直接下載安裝（格式見 [agentskills.io](https://agentskills.io/)）。以前要另外去 GitHub 找的 skill，現在和文件放在同一個網域下。

## 不只讓 agent 讀，也讓 agent 改

Philosophy 頁的 Readable is the floor 一節，把 Nimbus 的定位寫得很直接：

> Everyone made docs readable by agents. Nimbus makes docs writable, maintainable, and operable by them — end to end, on a codebase you fully own.

我猜這一節才是 Cloudflare 沒有在 Starlight 上加外掛、決定自己做框架的主因。前一節的 `.md` 端點和 `llms.txt`，在 Starlight 上用外掛大致做得到；下面這些和 Starlight 的主題套件模式正好相反。

### 所有檔案都在你的 repo 裡

Starlight 和 Docusaurus 都是「主題套件」模式：版面、元件放在 `node_modules` 裡，要客製就得 override 或 swizzle。Nimbus 反過來，scaffold 時把 layouts、components、styles、routes 全部寫進你的 repo，之後不再管它們；只有建置流程、索引、Markdown 轉換這些看不到的部分以 npm 套件提供。連 agent 端點的路由檔也在你的 repo 裡，每個只有幾行，從 `@cloudflare/nimbus-docs/agent-endpoints` 匯入 `markdownRoute()`、`llmsRoute()` 等函式。

文件裡的理由是：

> Coding agents work the same way you do. When nothing important hides behind an import boundary, an agent can reason about the repo far better.

主題放在 `node_modules`，agent 要改版面只能去猜 override 的接點；檔案在 repo 裡，它改之前就能把相關程式碼讀完。

### 新功能以「給 agent 的說明」形式安裝

`nimbus-docs add <slug>` 依項目類型有兩種行為：

- **元件與工具函式**（`registry:ui`、`registry:lib`）：直接複製檔案進 repo，和 [shadcn/ui](https://ui.shadcn.com/) 的做法相同
- **功能**（`registry:feature`）：不複製檔案，而是輸出一份 Markdown 格式的步驟說明（recipe），交給 coding agent 依你的專案狀況調整後套用

偵測到自己在 coding agent 裡執行時，CLI 會直接把 recipe 輸出給 agent；從一般 shell 執行，則可以用 `--print` 導給你慣用的 agent：

```bash
npx @cloudflare/nimbus-docs add new-version --print | claude
```

Recipe 要求 agent 先看專案、確認計畫再動手，動手前檢查這個功能是不是已經裝過，做完要確認 build 還能過。像「新增一個文件版本」要動好幾處設定，每個專案又長得不一樣，寫成固定的安裝程式很難顧到所有情況，交給讀得懂專案的 agent 比較實際。

### 給 agent 的 lint 與來源標記

`nimbus-docs lint --format json` 輸出帶版本號的 JSON 診斷，修正位置精確到字元，`--fix` 直接套用。Scaffold 寫在根目錄的 `AGENT.md` 裡有一份稽核文件的步驟，連回報格式都規定好了，讓 agent 掃完整站後交出另一個工具也能解析的結果。

Agent 能寫文件以後，讀者會想知道某一頁是誰寫的、有沒有人審過。Nimbus 的處理方式很簡單，在 content collection 的 schema 加一個欄位。nimbus-docs.com 自己加了 `aiGenerated: true`，agent 起草、還沒人審的頁面會掛著「awaiting review」標籤，有人審完把欄位拿掉才消失。

## 拿我的部落格對照

這個部落格是 [AstroPaper](https://github.com/satnaing/astro-paper) 改的，也是 Astro 7，已經有 `/llms.txt` 與 `/llms-full.txt`，`<head>` 裡有一行 `<link rel="llms-txt" href="/llms.txt" />`。和 Nimbus 對照如下：

| 項目                                          | 本站 | Nimbus                 |
| --------------------------------------------- | ---- | ---------------------- |
| 全站 `llms.txt`                               | 有   | 有，分三層             |
| `llms-full.txt`                               | 有   | 有，byte-identical     |
| 單頁 `.md`                                    | 無   | 有，另附 `.mdx` 原始碼 |
| `<link rel="alternate" type="text/markdown">` | 無   | 有                     |
| HTML 內的隱藏導引文字                         | 無   | 有                     |
| 公開性無法判定時 build 失敗                   | 無   | 有                     |

部落格是給人讀的，不一定要全部補上；但單頁 `.md` 和 `rel="alternate"` 成本很低，可能是之後值得加的兩項。

## 現在要不要用

`@cloudflare/nimbus-docs` 的 repo 7 月才建立，10 月已經發到 0.16.0，API 還在快速變動。cloudflare-docs 光是 9 月就從 0.14.1 升到 0.15.0，外部專案採用的話，要準備好常常跟著改。它也綁定 Astro 7（peer dependency 限定 `astro <8.0.0`），互動元件要 React 19，不用 Astro 的團隊直接出局。

功能類的 `add` 預設你手邊有 coding agent。沒有的話也能用，只是要自己照 recipe 一步步做，和讀一份安裝說明差不多。

至於「agent 是文件的主要讀者」，我覺得要看文件類型。Cloudflare 的文件大多是 API、CLI 參數和設定範例，開發者現在多半是叫 Claude Code 或 Cursor 去查，人自己點進頁面的機會確實在變少。概念說明和入門教學就不一定了，那類文件還是人在讀，Nimbus 的 HTML 版也照樣做了深淺色主題和 Pagefind 搜尋。`llms.txt` 是 Nimbus 最容易抄的部分，用外掛就有。我比較想學的是它在 build 階段替每一頁產出 agent 能直接讀、也能拿回去改的版本，頁面上還標著是誰寫的、審過沒有。

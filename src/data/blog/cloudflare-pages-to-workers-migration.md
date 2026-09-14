---
pubDatetime: 2026-09-14T11:44:14Z
title: "Cloudflare Pages 要被淘汰了嗎？用官方 migration prompt 把 Astro 部落格搬到 Workers"
slug: "cloudflare-pages-to-workers-migration"
tags:
  - cloudflare
  - cloudflare-workers
  - cloudflare-pages
  - wrangler
  - astro
  - claude-code
description: "Cloudflare 沒淘汰 Pages，但新功能只做在 Workers。記錄用官方 migration prompt 讓 Claude Code 搬遷 Astro 部落格，以及網域切換與 token 權限造成的斷線。"
draft: false
---

Cloudflare 沒有宣布要淘汰 Pages，但從 2025 年 4 月起，官方已經明說新專案該從 [Workers](https://developers.cloudflare.com/workers/) 開始，新功能也只做在 Workers 上。官方文件裡還附了一份給 coding agent 用的 [migration prompt](https://developers.cloudflare.com/workers/prompts/pages-to-workers.txt)，我拿它讓 Claude Code 把這個 Astro 部落格從 Pages 搬到 Workers。純靜態站要改的只有幾個檔案，出問題的是 prompt 沒涵蓋的自訂網域切換和 API token 權限，網站因此斷線了幾分鐘。

## Table of contents

## 起因：幫公司建內部網站時才發現

最近幫公司建一個 internal website，要選 Cloudflare 上的部署方式，才注意到文件和 dashboard 的重心都放在 Workers。Pages 的[文件首頁](https://developers.cloudflare.com/pages/)最上方直接寫著：

> Workers supports most Pages use cases and offers a broader feature set. It is Cloudflare's primary platform for building applications. Start new projects with Workers.

這個部落格[當初架站](/posts/blog-architecture/)時用的是 Pages，部署流程也[寫過一篇](/posts/github-actions-cloudflare-pages-material-for-mkdocs/)。看到這段之後，我回頭翻了 Cloudflare 這幾年的公告，想確認 Pages 是不是要收掉。

## Pages 的現況：繼續支援，新功能只給 Workers

Cloudflare 在 2023 年 5 月的部落格〈[Pages and Workers are converging into one experience](https://blog.cloudflare.com/pages-and-workers-are-converging-into-one-experience/)〉就宣布兩個產品要合流。2025 年 4 月 Workers 支援 static assets 和 SSR 之後，〈[Your frontend, backend, and database — now in one Cloudflare Worker](https://blog.cloudflare.com/full-stack-development-on-cloudflare-workers/)〉直接建議新專案從 Workers 開始，也寫明了之後的投資方向：

> Cloudflare Pages will continue to be supported, but, going forward, all of our investment, optimizations, and feature work will be dedicated to improving Workers.

2025 年 11 月，Workers tech lead Kenton Varda 在 [Hacker News](https://news.ycombinator.com/item?id=46037452) 留言：

> We are not sunsetting Pages. We are taking all the Pages-specific features and turning them into general Workers features -- which we should have done in the first place. At some point -- when we can do it with zero chance of breakage -- we will auto-migrate all Pages projects to this new implementation, essentially merging the platforms.

所以 Pages 會繼續運作，將來 Cloudflare 會自動把專案轉過去，現在不搬也不會壞。不過官方 [migration guide](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/) 底部的 compatibility matrix 已經拉出差距，Workers 有、Pages 沒有的功能包括 Cron Triggers、Workers Logs、Logpush、Source Maps、Gradual Deployments、Queue Consumers、Rate Limiting 等等。反過來，Pages 有、Workers 還沒完全支援的是 Early Hints、Branch Deploy Controls、Custom Branch Aliases、檔案式路由的 Pages Functions，以及不在 Cloudflare zone 裡的自訂網域。

社群的看法差不多。[Bejamas](https://bejamas.com/stack/hosting/cloudflare) 建議「If you’re evaluating Cloudflare Pages in 2026, evaluate Workers instead」，同時提到沒有強制期限，可以挑自己的時間搬；[Rick Cogley](https://cogley.jp/articles/cloudflare-pages-to-workers-migration) 在 2026 年初把手上所有 Pages 專案都搬完，整理了一份很長的遷移筆記。

計費上沒有差別。Migration guide 寫明 Workers 的 static assets 請求一樣免費，Pages Functions 本來就用 Workers 的費率計算。

## 官方給 coding agent 的 migration prompt

Migration guide 裡有這麼一段：

> You can add the following experimental prompt in your preferred coding assistant (e.g. Claude Code, Cursor) to make your project compatible with Workers

Prompt 本身是 [`pages-to-workers.txt`](https://developers.cloudflare.com/workers/prompts/pages-to-workers.txt)，標為 experimental。coding agent 如果接了 [Cloudflare Docs MCP server](https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/docs-ai-search)，要求遷移時也會自動帶入。

它先要 agent 把 Wrangler 升到 v4，看 lockfile 決定用 npm、pnpm、yarn 還是 bun。設定檔改成 `wrangler.jsonc`，`pages_build_output_dir` 換成 `"assets": {"directory": "..."}`，並補上 `compatibility_date`。接著依專案類型分流：有 `functions/` 目錄要先跑 `wrangler pages functions build`，build 產出有 `_worker.js` 要設 `main` 和 `ASSETS` binding，兩者都沒有就是 assets-only。指令方面，`wrangler pages deploy` 換成 `wrangler deploy`，`wrangler pages dev` 換成 `wrangler dev`。驗證時先 build、跑 `wrangler deploy --dry-run`，得到使用者同意才真的部署，最後交出 Project Analysis、Migration Steps、Validation 三段摘要。

## 實際遷移這個部落格

我把整份 prompt 貼給 [Claude Code](https://claude.com/product/claude-code) 執行。

### 專案判斷：純靜態、沒有 Functions

這個部落格是 Astro static output，沒有 `functions/` 目錄，build 後也沒有 `_worker.js`，屬於 prompt 裡最單純的 assets-only。原本也沒有 wrangler 設定檔，部署完全靠 GitHub Actions 裡的一行 `wrangler pages deploy dist`。

有兩個 Pages 的預設行為 prompt 沒提，是 agent 自己查 migration guide 補上的。Pages 會自動把 `dist/404.html` 當成找不到頁面時的回應，Workers 要在 `not_found_handling` 明確指定。另一個是 `public/_redirects`，裡面有 10 條改 slug 留下的 301，Workers static assets 原生支援這個檔案，不用動。

### 新增 `wrangler.jsonc`

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "blog-chrisyuan-me",
  "compatibility_date": "2026-09-14",
  // 純靜態站（Astro static output），沒有 Worker script，只用 Workers Assets
  "assets": {
    "directory": "./dist",
    // 與 Pages 預設行為一致：/foo → /foo/、/foo.html → /foo
    "html_handling": "auto-trailing-slash",
    // Pages 會自動回傳 dist/404.html，Workers 需明確指定
    "not_found_handling": "404-page",
  },
  "routes": [{ "pattern": "blog.chrisyuan.me", "custom_domain": true }],
  // 只走自訂網域，關閉 *.workers.dev 與 preview URL，避免重複內容被索引
  "workers_dev": false,
  "preview_urls": false,
}
```

Worker 名稱沿用原本的 Pages 專案名稱。部落格用不到 preview 環境，所以 `workers_dev` 和 `preview_urls` 都明確設成 `false`，免得同一份內容在 `*.workers.dev` 上又被搜尋引擎收錄一次。

### GitHub Actions 只改一行

```diff
- command: pages deploy dist --project-name=blog-chrisyuan-me --commit-dirty=true --commit-message="${{ github.sha }}"
+ command: deploy --message="${{ github.sha }}"
```

專案名稱、輸出目錄都改由 `wrangler.jsonc` 提供。沿用 commit SHA 當部署訊息，是因為之前遇過 Cloudflare API 拒收含中文的 commit message。

Cogley 提到他搬家後改用 GitHub Actions 部署，兩週就把 Actions 分鐘數用完，因為 Pages 原本是在 Cloudflare 那邊 build。我原本就在 GitHub Actions 裡 build，repo 又是 public，分鐘數不計費，所以沒差。

另外把 `wrangler` 加進 devDependencies。`cloudflare/wrangler-action` 發現專案裡已經裝了 Wrangler 就會直接用，本地和 CI 跑的是同一版。

### 本地驗證

`bun run build` 之後跑 `wrangler deploy --dry-run`，Wrangler 讀到 dist 裡的檔案，沒有 binding，設定檢查通過。再用 `wrangler dev` 起本地伺服器實際打幾個路徑：

| 路徑                                       | 結果                             |
| ------------------------------------------ | -------------------------------- |
| `/`、`/posts/mdns/`、`/og.png`、`/rss.xml` | 200                              |
| `/posts/part-1/`                           | 301，依 `_redirects` 導向新 slug |
| `/nope`                                    | 404，回傳站內自訂的 404 頁       |
| `/posts`                                   | 307 → `/posts/`                  |

和 Pages 不一樣的地方是補斜線的狀態碼，還沒刪的舊 `*.pages.dev` 網址回 308，Workers 回 307。搜尋引擎兩種都會跟，我就沒處理。到這裡為止都沒遇到問題。

## 切換自訂網域時踩到的坑

### Prompt 沒有處理網域切換

Prompt 從頭到尾沒提到自訂網域或 DNS。`wrangler.jsonc` 裡的 `custom_domain` route 會在部署時把網域綁到 Worker，但 `blog.chrisyuan.me` 還綁在 Pages 專案上，DNS 也有一筆指向 `*.pages.dev` 的 CNAME。Workers 的[自訂網域文件](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)寫著「You cannot create a Custom Domain on a hostname with an existing CNAME DNS record」，所以直接部署會失敗。

只能先在 Pages 專案移除自訂網域，再刪掉 `blog` 的 CNAME 紀錄，最後部署 Worker，讓 Wrangler 建立新的網域綁定。從移除網域到 Worker 部署完成之間，網站連不上。

我手上正好有另一個處理 Cloudflare 設定的 Claude Code session，本來想讓負責遷移的 session 直接傳訊息請它刪網域綁定和 DNS，結果被 Claude Code 的 auto mode 擋下來，理由是這屬於 DNS／網域變更，不能透過另一個 session 代做。最後是我自己切到那個 session 下指令。我覺得這裡擋得對，刪 DNS 紀錄應該由我本人確認。

### `--dry-run` 不會檢查 token 權限

網域解除綁定後 push，lint 和 build 都過了，卡在部署：

```
A request to the Cloudflare API (/accounts/***/workers/services/blog-chrisyuan-me) failed.
  Authentication error [code: 10000]
```

同一組 `CLOUDFLARE_API_TOKEN` 部署 Pages 一直正常，我以為 Workers 的權限早就開了，結果沒有。Cloudflare 的 [GitHub Actions 文件](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)建議建立 token 時直接選「Edit Cloudflare Workers」範本，涵蓋部署 Worker 和設定 route 需要的權限。

本地驗證抓不到這個問題，因為 `wrangler deploy --dry-run` 不會呼叫 API，我本機的 Wrangler 沒登入也能跑完。這時網域已經拆掉，Worker 又部署不上去，網站只能繼續斷著。補好 token 權限後重跑失敗的 job，Worker 部署成功，Wrangler 輸出 `blog.chrisyuan.me (custom domain)`，網站恢復。從 push 到重跑成功大約六分鐘，加上前面解除綁定的時間，實際斷線比這更久一點。

網站恢復後我的 Mac 還是連不上，`dig` 查得到 IP，`curl` 卻回 `Could not resolve host`，原因是 macOS 把斷線期間「查無此網域」的結果快取起來了，清掉 DNS 快取就好：

```bash
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

### 如果重來一次

token 權限的問題可以在拆網域之前就發現。第一次部署時先暫時把 `workers_dev` 設成 `true`、拿掉 `routes`，讓 CI 真的部署到 `*.workers.dev`。權限不夠會在這一步失敗，網站還好好地跑在 Pages 上。確認 `*.workers.dev` 上的網站沒問題，再把 `routes` 加回去切網域。

切換本身也該用腳本做。Cogley 寫了一支腳本連續呼叫 Cloudflare API，從 Pages 刪掉網域後馬上建立 Workers 的綁定，斷線只有 2–5 秒。我是手動拆完再等 CI 跑 lint 和 build，就拖到分鐘等級。

## 結語

最後 repo 裡的改動是新增 `wrangler.jsonc`、改 `deploy.yml` 一行、加一個 devDependency，外加文件更新，Claude Code 照著 prompt 沒多久就做完。那幾分鐘的斷線全出在 Cloudflare 帳號這一側，下次搬公司的專案，我會先部署到 `*.workers.dev` 確認 token 沒問題再動網域。

舊的 Pages 專案我先留著，`blog-chrisyuan-me.pages.dev` 目前還連得到，過幾天確認沒問題再刪。

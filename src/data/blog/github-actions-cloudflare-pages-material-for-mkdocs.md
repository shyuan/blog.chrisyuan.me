---
title: "GitHub Actions 自動部署靜態網站到 Cloudflare Pages：推送即上線"
pubDatetime: 2025-05-09T03:34:38.000Z
modDatetime: 2026-07-09T08:47:21Z
slug: "github-actions-cloudflare-pages-material-for-mkdocs"
description: "用 GitHub Actions 把靜態網站自動部署到 Cloudflare Pages，git push 就上線。以 Material for MkDocs 示範，但管線與 SSG 無關，換 Hugo、Jekyll 只改 build 一步。"
tags:
  - cloudflare
  - cloudflare-pages
  - github-actions
  - mkdocs
  - wrangler
  - static-site
---

每次改完文件，你是不是都要重複同一套動作：本地跑一次 build、把 `public/` 或 `dist/` 拖上去、等它上傳、再開網頁確認沒壞。做十次還好，做一百次就會有一次忘了 build、或上傳到錯的目錄，然後線上掛著半天才發現。

這篇要換掉那套手動流程，讓部署變成一件你不用再想的事——`git push` 之後，剩下的交給 [GitHub Actions](https://github.com/features/actions) 建置、交給 [Cloudflare Pages](https://pages.cloudflare.com/) 上線。文章全程以 [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) 當範例，但先講結論：**這條管線跟你用哪個靜態網站生成器（SSG）幾乎無關**，真正綁定工具的只有「build 那一步」，其餘從憑證到部署全部通用。看完你手上的 Hugo、Jekyll、Next.js 專案，換一行指令就能套。

## Table of contents

## 為什麼是 GitHub Actions + Cloudflare Pages 這個組合

自動化部署的工具不少，這篇挑這個組合，是因為兩邊各自把一件事做到「不用再管」：

- **GitHub Actions** 就住在你的 repo 裡，push 即觸發，不必再接第三方 CI，build 環境每次都乾淨一致。
- **Cloudflare Pages** 提供全球 CDN、免費 SSL 與 DDoS 防護、自訂網域，免費方案每月 500 次建構、頻寬無上限——對一個文件站或部落格來說，等於「架好就不用再繳費、不用再擔心流量」。

兩者交會點是 Cloudflare 官方的 [`wrangler-action`](https://developers.cloudflare.com/workers/wrangler/)：GitHub Actions build 完，把成品目錄交給它，它負責上傳、部署、回傳網址。整條線一次設定、之後全自動。

## 準備工作

在開始之前，請先備妥：

1. 一個靜態網站專案並推送到 GitHub（本文以 Material for MkDocs 為例，但**任何 SSG 都適用**）
2. 一組 Cloudflare 帳號
3. 對 GitHub Actions 的基本概念（知道 workflow、job、step 是什麼即可）
4. 一個 Status 為 [Current、Active 或 Maintenance](https://nodejs.org/en/about/previous-releases#looking-for-the-latest-release-of-a-version-branch) 的 [Node.js](https://nodejs.org/) 版本（本地執行 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) 時需要）

整套設定分五步：拿憑證 → 存進 GitHub Secrets → 建立 Pages 專案 → 寫 workflow → 首次部署。前四步只做一次，之後每次上線都只剩 `git push`。

### 步驟一：取得 Cloudflare 憑證

自動化部署需要兩樣東西向 Cloudflare 證明「我有權限」：一組 API Token（能做什麼）和一個 Account ID（對哪個帳號做）。

#### 1.1 生成 Cloudflare API Token

Cloudflare 提供兩種類型的 API Token：[User-Owned Token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/) 和 [Account-Owned Token](https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/)。差別在於 Token 綁在「你個人」還是「帳號」上——個人專案用前者最快，團隊環境用後者才不會因為人員異動而失效。

##### 方式一：User-Owned Token（個人使用）

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 點擊右上角的使用者圖示，選擇「My Profile」
3. 在左側選單選擇「API Tokens」
4. 點擊「Create Token」
5. 在「Custom Token」下方點擊「Get started」
6. 設定如下：
   - **Token name**：輸入一個識別名稱，例如 `GitHub Actions Deploy`
   - **Permissions**：選擇 `Account` → `Cloudflare Pages` → `Edit`
   - **Account Resources**：Include → 選擇您的帳號
7. 點擊「Continue to summary」
8. 檢查設定後點擊「Create Token」
9. 複製並安全保存生成的 API Token

##### 方式二：Account-Owned Token（團隊協作/企業使用）

Account-Owned Token 屬於帳號而非個人，成員來去都不影響部署，因此更適合團隊：

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 選擇您的帳號，進入 Account Dashboard
3. 在左側選單中選擇「Manage Account」→「API Tokens」
4. 點擊「Create Token」
5. 在「Custom Token」下方點擊「Get started」
6. 設定如下：
   - **Token name**：輸入一個識別名稱，例如 `CI/CD Deployment Token`
   - **Permissions**：選擇 `Account` → `Cloudflare Pages` → `Edit`
   - **IP Address Filtering**（選擇性）：如果 CI/CD 系統有固定 IP，可在此限制 Token 只能從特定 IP 使用
7. 點擊「Continue to summary」
8. 檢查設定後點擊「Create Token」
9. 複製並安全保存生成的 API Token

> **選哪一種？** 個人專案用 User-Owned Token 最省事；企業或團隊建議用 Account-Owned Token——避免 Token 與個人帳號綁定、便於團隊共同管理、減少人員異動時的影響。無論哪一種，權限都只需 `Cloudflare Pages → Edit` 這一項，不要多給。

#### 1.2 取得 Account ID

1. 在 Cloudflare Dashboard 中選擇「Account Home」
2. 在右側的「API」區塊找到「Account ID」
3. 複製該 ID 備用

### 步驟二：設定 GitHub Secrets

拿到的 Token 與 Account ID 不能寫進 repo，要存進 GitHub Secrets，讓 workflow 執行時才注入、不會外洩到程式碼裡：

1. 前往您的 GitHub repository
2. 點擊「Settings」
3. 在左側選單選擇「Secrets and variables」→「Actions」
4. 點擊「New repository secret」
5. 新增兩個 Secrets：
   - **Name**: `CLOUDFLARE_API_TOKEN`
     **Secret**: 貼上步驟 1.1 的 API Token
   - **Name**: `CLOUDFLARE_ACCOUNT_ID`
     **Secret**: 貼上步驟 1.2 的 Account ID

### 步驟三：建立 Cloudflare Pages 專案

workflow 部署時會指定「要送到哪個 Pages 專案」，所以這個專案得先存在。以下兩種方式擇一：

#### 方式一：使用 Wrangler CLI（推薦）

在本地終端機執行：

```bash
# 安裝或更新 Wrangler
npm install -g wrangler

# 登入 Cloudflare
npx wrangler login

# 建立專案
npx wrangler pages project create my-docs-site
```

建立專案時會詢問您是否要設定生產分支，建議選擇 `main`。

#### 方式二：使用 Cloudflare Dashboard

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 選擇「Pages」
3. 點擊「Create a project」
4. 選擇「Direct Upload」
5. 輸入專案名稱（例如：`my-docs-site`）
6. 點擊「Create project」

### 步驟四：建立 GitHub Actions Workflow

這是整條管線的核心。在專案根目錄建立 `.github/workflows/deploy-to-cloudflare-pages.yml`：

```yaml
name: Build site and deploy it to Cloudflare Pages

on:
  push:
    branches:
      - main

env:
  PYTHON_VERSION: "3.13.2"
  MKDOCS_MATERIAL_VERSION: "9.6.5"
  CLOUDFLARE_PROJECT_NAME: "my-docs-site" # 改為您的專案名稱

permissions:
  contents: write

jobs:
  build-and-deploy:
    name: Build site and deploy it to Cloudflare Pages
    runs-on: ubuntu-latest
    steps:
      - name: Checkout git repository
        uses: actions/checkout@v4

      - name: Setup Python environment
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Set cache id
        run: echo "cache_id=$(date --utc '+%V')" >> $GITHUB_ENV

      - name: Cache mkdocs build
        uses: actions/cache@v4
        with:
          key: mkdocs-material-${{ env.cache_id }}
          path: |
            ~/.cache/pip
            .cache
          restore-keys: |
            mkdocs-material-

      # ↓↓↓ 這一步是唯一綁定 SSG 的地方，換工具就換這裡 ↓↓↓
      - name: Install dependencies and build site
        run: |
          pip install mkdocs-material==${{ env.MKDOCS_MATERIAL_VERSION }}
          mkdocs build --site-dir public
      # ↑↑↑ 換工具就換這裡 ↑↑↑
      - name: Deploy to Cloudflare
        id: deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy public --project-name=${{ env.CLOUDFLARE_PROJECT_NAME }}

      - name: Print wrangler command output
        env:
          CMD_OUTPUT: ${{ steps.deploy.outputs.command-output }}
        run: echo "$CMD_OUTPUT"
```

先記住我用註解框起來的那一步——這是全篇唯一跟 MkDocs 有關的地方，後面〈換成任何 SSG〉整節就是在替換它。其餘每一步（checkout、cache、deploy）對所有 SSG 都一樣。

幾個關鍵設定：

- **`env` 區塊集中管理版本與專案名**：升級 MkDocs 或改專案名稱時只改一個地方。`CLOUDFLARE_PROJECT_NAME` 必須與步驟三建立的專案名稱一致，它也決定了你的預設網址 `https://<project-name>.pages.dev`。
- **cache 用「週數」當 key**：`$(date --utc '+%V')` 取當年第幾週，於是快取每週自動翻新一次；當週沒有快取時，`restore-keys` 會退而用最近一份，讓多數 build 都能省下重裝依賴的時間。
- **`wrangler-action` 收尾**：把 `public` 目錄交給它，它驗證憑證、上傳檔案、部署、回傳網址，你不必自己碰 API。

### 步驟五：首次部署與後續設定

把 workflow 推上去，管線就開始運轉：

```bash
git add .github/workflows/deploy-to-cloudflare-pages.yml
git commit -m "Add GitHub Actions workflow for Cloudflare Pages deployment"
git push origin main
```

推送後到 GitHub 的 **Actions** 分頁，就能看到 workflow 正在跑；跑完在日誌尾端會印出 Wrangler 回傳的網址，打開 `https://<project-name>.pages.dev` 確認網站上線。

之後就進入「推送即上線」的日常——每次 `git push` 到 `main`，網站就自動更新，你不用再碰部署。想更進一步，可以回 Cloudflare Dashboard 的 Pages 專案裡設定自訂網域、查看部署歷史、配置重新導向規則。

## 換成任何 SSG：唯一要改的是 build 那一步

這才是整篇的重點。前面四步——憑證、Secrets、Pages 專案、`wrangler-action` 部署——完全不管你用什麼工具生成網站。真正綁定 SSG 的，只有步驟四裡我框起來的那一步：**安裝工具、跑 build、把成品放進一個目錄**。

換言之，把那一步換掉，這條管線就直接服務另一個 SSG。以下是幾個常見工具的替換版本：

**Hugo**：

```yaml
- name: Install dependencies and build site
  run: |
    wget https://github.com/gohugoio/hugo/releases/download/v0.124.1/hugo_extended_0.124.1_linux-amd64.deb
    sudo dpkg -i hugo_extended_0.124.1_linux-amd64.deb
    hugo --minify -d public
```

**Jekyll**：

```yaml
- name: Install dependencies and build site
  run: |
    gem install bundler jekyll
    bundle install
    bundle exec jekyll build -d public
```

**Next.js（靜態輸出）**：

```yaml
- name: Install dependencies and build site
  run: |
    npm install
    npm run build
    npm run export
    mv out public
```

**Hexo**：

```yaml
- name: Install dependencies and build site
  run: |
    npm install hexo-cli -g
    npm install
    hexo generate
```

抓到通用原則就好——不管哪個 SSG，都只是三件事：

1. **裝對應的建構工具**（`pip install`、`gem install`、`npm install`……）
2. **執行 build 指令** 生成靜態檔案
3. **把成品放進部署目錄**——上面全部統一輸出到 `public`，好對接 `wrangler-action`

如果你的 SSG 預設輸出到 `dist`（或別的目錄），不必硬改它，把部署指令的目錄一起改掉即可：

```yaml
- name: Deploy to Cloudflare
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: pages deploy dist --project-name=${{ env.CLOUDFLARE_PROJECT_NAME }}
```

build 步驟輸出的目錄，和 `pages deploy` 指定的目錄對得上，就成了。這就是為什麼標題說「靜態網站」而不是「MkDocs」——MkDocs 只是這篇借來的示範。

## 進階設定

基本管線跑起來之後，可以視需要再加料。

### 依分支採不同部署策略

想讓 `main` 以外的分支也能各自預覽，用 `--branch` 帶入當前分支名：

```yaml
on:
  push:
    branches:
      - main
      - staging
      - "feature/**"

# ...（env 同上）

jobs:
  deploy:
    steps:
      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy public --project-name=${{ env.CLOUDFLARE_PROJECT_NAME }} --branch=${{ github.ref_name }}
```

### 只在內容變更時才部署

改了 README 也重新部署一次網站，很浪費。用 `paths` 限定只有文件或設定變動時才觸發：

```yaml
on:
  push:
    branches:
      - main
    paths:
      - "docs/**"
      - "mkdocs.yml"
      - ".github/workflows/deploy-to-cloudflare-pages.yml"
```

### 部署通知

在成功或失敗時發出提醒，接上 Slack、Discord 就不必盯著 Actions 分頁：

```yaml
- name: Notify on success
  if: success()
  run: |
    echo "Deployment successful! 🎉"
    # 可以在這裡加入 Slack 或 Discord 通知

- name: Notify on failure
  if: failure()
  run: |
    echo "Deployment failed! ❌"
    # 可以在這裡加入錯誤通知
```

## 常見問題排除

第一次接管線，多半會撞到下面幾個錯誤，這裡對照解法：

### `Project "my-docs-site" does not exist`

Pages 專案還沒建。回到步驟三，用 Wrangler CLI 或 Dashboard 先把專案建起來。

### `Failed to create deployment`（API Token 權限不足）

Token 權限不對。確認它具有 `Account → Cloudflare Pages → Edit`；必要時重新生成 Token 並更新 GitHub Secrets。

### 快取相關問題

當快取讓 build 出現詭異結果時，可以手動刪除 GitHub Actions 的快取，或修改 cache key 強制翻新一份。

### `Project not found`（專案名稱不一致）

`CLOUDFLARE_PROJECT_NAME` 與實際在 Cloudflare 建立的專案名稱必須**完全一致**，且該專案已成功建立。

### 部署了空目錄或找不到檔案

build 輸出目錄和部署目錄要對得上：MkDocs 用 `--site-dir public`，Wrangler 就得 `pages deploy public`；換成別的 SSG（輸出到 `dist` 等）時，兩邊要一起改。

## 結語

設定看起來有五步，但真正的變化只有一個：部署從「一件你每次都要記得做的事」，變成「一件你不用再想的事」。之後你的注意力可以全部放回內容本身——工具則保持可替換，哪天想從 MkDocs 換到 Hugo，改的也只是 build 那一步。

這條管線帶來的：

- **推送即部署**，手動上傳與「忘記 build」從此絕跡
- **cache 機制**省下重裝依賴的時間
- **版本與專案設定集中管理**，升級維護只改一處
- **版本鎖定**確保每次 build 環境一致
- **Cloudflare 全球 CDN** 讓網站在各地都快

延伸閱讀：

- [Cloudflare Pages 官方文件](https://developers.cloudflare.com/pages/)
- [GitHub Actions 文件](https://docs.github.com/en/actions)
- [Material for MkDocs 指南](https://squidfunk.github.io/mkdocs-material/)

---
title: "使用 GitHub Actions 自動部署靜態網頁生成工具內容到 Cloudflare Pages - 以 Material for MkDocs 為例"
pubDatetime: 2025-05-09T03:34:38.000Z
slug: "github-actions-cloudflare-pages-material-for-mkdocs"
description: "為什麼選擇 Cloudflare Pages？ Cloudflare Pages 提供了以下優勢： 全球 CDN 加速，提供極快的載入速度 免費的 SSL 憑證和 DDoS 防護 支援自訂網域 每月高達 500 次建構和無限頻寬 整合 Cloudflare 的生態系統 準備工作 在開始之前，請確保您已經： 擁有一個靜態網頁生成工具專案（本文以 Material for MkDocs 為例）並"
tags:
  - cloudflare
  - cloudflare-pages
  - github-actions
  - mkdocs
  - wrangler
  - static-site
---

# 為什麼選擇 Cloudflare Pages？

[Cloudflare Pages](https://pages.cloudflare.com/) 提供了以下優勢：

- 全球 CDN 加速，提供極快的載入速度
- 免費的 SSL 憑證和 DDoS 防護
- 支援自訂網域
- 每月高達 500 次建構和無限頻寬
- 整合 Cloudflare 的生態系統

# 準備工作

在開始之前，請確保您已經：

1. 擁有一個靜態網頁生成工具專案（本文以 [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) 為例）並推送到 GitHub
2. 註冊 Cloudflare 帳號
3. 了解基本的 [GitHub Actions](https://github.com/features/actions) 概念
4. 安裝 Status 為 [Current, Active 或 Maintenance] 的 (https://nodejs.org/en/about/previous-releases#looking-for-the-latest-release-of-a-version-branch) [Node.js](https://nodejs.org/) 版本（用於執行 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)）

## 步驟一：取得 Cloudflare 憑證

### 1.1 生成 Cloudflare API Token

Cloudflare 提供兩種類型的 API Token：[User-Owned Token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/) 和 [Account-Owned Token](https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/)。選擇適合您需求的方式：

#### 方式一：User-Owned Token（個人使用）

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 點擊右上角的使用者圖示，選擇「My Profile」
3. 在左側選單選擇「API Tokens」
4. 點擊「Create Token」
5. 在「Custom Token」下方點擊「Get started」
6. 設定如下：
   - **Token name**：輸入一個識別名稱，例如 `GitHub Actions Deploy`
   - **Permissions**：
     - 選擇 `Account` → `Cloudflare Pages` → `Edit`
   - **Account Resources**：
     - Include → 選擇您的帳號
7. 點擊「Continue to summary」
8. 檢查設定後點擊「Create Token」
9. 複製並安全保存生成的 API Token

#### 方式二：Account-Owned Token（團隊協作/企業使用）

Account-Owned Token 更適合團隊環境，因為它屬於帳號而非個人，不會因為人員異動而受影響。

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 選擇您的帳號，進入 Account Dashboard
3. 在左側選單中選擇「Manage Account」→「API Tokens」
4. 點擊「Create Token」
5. 在「Custom Token」下方點擊「Get started」
6. 設定如下：
   - **Token name**：輸入一個識別名稱，例如 `CI/CD Deployment Token`
   - **Permissions**：
     - 選擇 `Account` → `Cloudflare Pages` → `Edit`
   - **IP Address Filtering**（選擇性）：
     - 如果您的 CI/CD 系統有固定 IP，可以在此限制 Token 只能從特定 IP 使用
7. 點擊「Continue to summary」
8. 檢查設定後點擊「Create Token」
9. 複製並安全保存生成的 API Token

:::tip[建議]
對於企業或團隊使用，建議使用 Account-Owned Token。這樣可以：
- 避免 Token 與個人帳號綁定
- 便於團隊共同管理
- 減少人員異動時的影響
:::

### 1.2 取得 Account ID

1. 在 Cloudflare Dashboard 中選擇「Account Home」
2. 在右側的「API」區塊找到「Account ID」
3. 複製該 ID 備用

## 步驟二：設定 GitHub Secrets

1. 前往您的 GitHub repository
2. 點擊「Settings」
3. 在左側選單選擇「Secrets and variables」→「Actions」
4. 點擊「New repository secret」
5. 新增兩個 Secrets：
   - **Name**: `CLOUDFLARE_API_TOKEN`
     **Secret**: 貼上步驟 1.1 的 API Token
   - **Name**: `CLOUDFLARE_ACCOUNT_ID`
     **Secret**: 貼上步驟 1.2 的 Account ID

## 步驟三：建立 Cloudflare Pages 專案

在設定 GitHub Actions 之前，我們需要先在 Cloudflare 建立專案。您可以選擇以下兩種方式之一：

### 方式一：使用 Wrangler CLI（推薦）

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

### 方式二：使用 Cloudflare Dashboard

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 選擇「Pages」
3. 點擊「Create a project」
4. 選擇「Direct Upload」
5. 輸入專案名稱（例如：`my-docs-site`）
6. 點擊「Create project」

## 步驟四：建立 GitHub Actions Workflow

在專案根目錄建立 `.github/workflows/deploy-to-cloudflare-pages.yml`：

```yaml
name: Build site and deploy it to Cloudflare Pages with Wrangler2

on:
  push:
    branches:
      - main

env:
  PYTHON_VERSION: '3.13.2'
  MKDOCS_MATERIAL_VERSION: '9.6.5'
  CLOUDFLARE_PROJECT_NAME: 'my-docs-site'  # 改為您的專案名稱

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

      - name: Install dependencies and build site
        run: |
          pip install mkdocs-material==${{ env.MKDOCS_MATERIAL_VERSION }}
          mkdocs build --site-dir public

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

### 設定說明

在 `env` 區塊中，您需要設定：

- `CLOUDFLARE_PROJECT_NAME`: 您在 Cloudflare Pages 的專案名稱（必須與步驟三建立的專案名稱相同）

這個名稱將會成為您的網站 URL 的一部分：`https://<project-name>.pages.dev`

## 步驟五：首次部署與後續設定

### 5.1 首次部署

推送 workflow 文件到您的 repository：

```bash
git add .github/workflows/deploy-to-cloudflare-pages.yml
git commit -m "Add GitHub Actions workflow for Cloudflare Pages deployment"
git push origin main
```

### 5.2 Cloudflare Pages 專案設定

部署成功後，您可以在 Cloudflare Dashboard 進行進一步設定：

1. 登入 Cloudflare Dashboard
2. 選擇「Pages」→ 找到您的專案（例如：`my-docs-site`）
3. 在專案中可以：
   - 設定自訂網域
   - 查看部署歷史
   - 設定環境變數
   - 配置網頁重新導向規則

專案部署後會獲得一個預設網址：`https://<project-name>.pages.dev`

### 5.3 驗證部署

您可以透過以下方式驗證部署是否成功：

1. 在 GitHub Actions 頁面查看 workflow 執行狀態
2. 檢查 workflow 日誌中的 Wrangler 輸出
3. 訪問您的網站：`https://my-docs-site.pages.dev`
4. 在 Cloudflare Dashboard 中查看部署詳情

## 工作流程詳解

### 環境變數設定

我們在 workflow 中定義了幾個環境變數，方便統一管理：

```yaml
env:
  PYTHON_VERSION: '3.13.2'
  MKDOCS_MATERIAL_VERSION: '9.6.5'
  CLOUDFLARE_PROJECT_NAME: 'my-docs-site'
```

這些變數的用途：

- `PYTHON_VERSION`: Python 執行環境版本
- `MKDOCS_MATERIAL_VERSION`: MkDocs Material 套件版本
- `CLOUDFLARE_PROJECT_NAME`: Cloudflare Pages 專案名稱

這樣的設計讓版本和專案設定更加集中和便利，當需要修改時，只需要在一個地方調整。

### Cache 機制解析

我們的工作流程實現了高效的快取機制：

```yaml
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
```

這個設計具有以下特點：

1. **快取 key 設計**：使用週數（`%V`）作為 cache key，每週更新一次快取
2. **快取範圍**：同時快取 pip 套件和 MkDocs 建構結果
3. **還原機制**：如果當週快取不存在，會使用最近的快取

### Wrangler CLI 部署

工作流程使用 Cloudflare 官方的 `wrangler-action` 進行部署：

```yaml
- name: Deploy to Cloudflare
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: pages deploy public --project-name=${{ env.CLOUDFLARE_PROJECT_NAME }}
```

Wrangler 會：
1. 驗證 API Token 和 Account ID
2. 上傳 `public` 目錄中的靜態檔案
3. 部署到 Cloudflare Pages
4. 返回部署結果和 URL

部署完成後，您的網站會在 `https://<project-name>.pages.dev` 上線。例如，如果專案名稱設為 `my-docs-site`，網址就會是 `https://my-docs-site.pages.dev`。

# 進階設定

## 1. 不同分支的部署策略

如果您想要為不同分支設定不同的部署策略：

```yaml
on:
  push:
    branches:
      - main
      - staging
      - 'feature/**'

env:
  PYTHON_VERSION: '3.13.2'
  MKDOCS_MATERIAL_VERSION: '9.6.5'
  CLOUDFLARE_PROJECT_NAME: 'my-docs-site'

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

## 2. 條件式部署

只在特定檔案變更時觸發部署：

```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'docs/**'
      - 'mkdocs.yml'
      - '.github/workflows/deploy-to-cloudflare-pages.yml'
```

## 3. 部署通知

加入部署成功或失敗的通知：

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

## 1. 專案不存在錯誤

如果在首次部署時遇到錯誤：
```
Error: Project "my-docs-site" does not exist
```

這表示您尚未在 Cloudflare 建立專案。請回到步驟三，使用 Wrangler CLI 或 Dashboard 建立專案。

## 2. API Token 權限不足

錯誤訊息：
```
Error: Failed to create deployment
```

解決方案：
- 確認 API Token 具有正確的權限（Account → Cloudflare Pages → Edit）
- 重新生成 Token 並更新 GitHub Secrets

## 3. 快取失效問題

如果遇到快取相關問題，可以：
1. 手動刪除 GitHub Actions 的快取
2. 修改 cache key 來強制更新

## 4. 專案名稱不一致

如果出現以下錯誤：
```
Error: Project not found
```

確保：
- GitHub Actions 中的 `CLOUDFLARE_PROJECT_NAME` 與實際在 Cloudflare 建立的專案名稱完全一致
- 專案已經在 Cloudflare Pages 中成功建立

## 5. 部署目錄錯誤

確保：
- MkDocs 建構輸出目錄設定正確（`--site-dir public`）
- Wrangler 部署指定的目錄相符（`pages deploy public`）

# 結語

透過本文的設定，您的靜態網站現在可以自動化部署到 Cloudflare Pages。這個流程不僅節省了手動部署的時間，還確保了每次更新都能即時上線。雖然本文以 MkDocs Material 為範例，但同樣的流程可以套用到任何靜態網頁生成工具。

主要優勢：
- 推送即部署，完全自動化
- 快取機制提升建構速度
- 版本控制集中管理，升級維護更方便
- 版本鎖定確保環境一致性
- Cloudflare 全球 CDN 加速

如果您在設定過程中遇到問題，可以參考：
- [Cloudflare Pages 官方文件](https://developers.cloudflare.com/pages/)
- [GitHub Actions 文件](https://docs.github.com/en/actions)
- [MkDocs Material 指南](https://squidfunk.github.io/mkdocs-material/)

# 適用於其他靜態網站生成器

這套部署流程的優點在於它的通用性，您可以將其應用到任何靜態網站生成器（Static Site Generator, SSG）。只需要調整以下部分：

### 常見的靜態網站生成器設定範例

1. **Hugo**：
```yaml
- name: Install dependencies and build site
  run: |
    # 安裝 Hugo
    wget https://github.com/gohugoio/hugo/releases/download/v0.124.1/hugo_extended_0.124.1_linux-amd64.deb
    sudo dpkg -i hugo_extended_0.124.1_linux-amd64.deb
    # 建構網站
    hugo --minify -d public
```

2. **Jekyll**：
```yaml
- name: Install dependencies and build site
  run: |
    gem install bundler jekyll
    bundle install
    bundle exec jekyll build -d public
```

3. **Next.js (靜態輸出)**：
```yaml
- name: Install dependencies and build site
  run: |
    npm install
    npm run build
    npm run export
    mv out public
```

4. **Hexo**：
```yaml
- name: Install dependencies and build site
  run: |
    npm install hexo-cli -g
    npm install
    hexo generate
```

## 通用原則

無論使用哪種靜態網站生成器，只要遵循以下原則即可：

1. **安裝相應的建構工具**：根據您使用的 SSG 安裝對應的套件
2. **執行建構指令**：執行相應的建構指令來生成靜態檔案
3. **統一輸出目錄**：確保靜態檔案輸出到 `public` 目錄，或修改 Wrangler 部署指令中的目錄路徑

例如，如果您的 SSG 輸出到 `dist` 目錄，可以這樣修改部署指令：

```yaml
- name: Deploy to Cloudflare
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: pages deploy dist --project-name=${{ env.CLOUDFLARE_PROJECT_NAME }}
```

這種靈活性讓您可以輕鬆地將任何靜態網站專案部署到 Cloudflare Pages，享受其提供的全球 CDN 加速和安全防護。

祝您部署順利！

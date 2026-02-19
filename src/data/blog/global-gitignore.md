---
title: "Global gitignore"
pubDatetime: 2020-10-22T05:03:56.000Z
slug: "global-gitignore"
tags:
  - git
  - cli
description: "專案的 .gitignore 應只放專案相關的忽略規則，個人開發工具產生的檔案（如 .idea、.DS_Store）應透過 git global ignore 在全域層級處理，避免汙染團隊的 .gitignore。"
---

## Table of contents

## 問題：誰該負責忽略 `.idea`？

用 JetBrains 產品（IntelliJ IDEA、WebStorm、GoLand 等）開專案時，會在專案目錄下建一個 `.idea` 目錄，存放 IDE 的專案設定檔。同樣地，VS Code 會產生 `.vscode` 目錄，macOS 會在每個資料夾留下 `.DS_Store`，Vim 會產生 `.swp` 暫存檔。

這些檔案都不該進版控，但問題是：**該放在專案的 `.gitignore` 裡嗎？**

答案是**不該**。專案的 `.gitignore` 應只包含與專案本身相關的忽略規則（如 `node_modules/`、`dist/`、`.env`），而非特定開發者的工具產物。不是每個團隊成員都用 JetBrains，把 `.idea` 放進 `.gitignore` 等於讓專案去適應個人的工具偏好。

正確做法是讓每位開發者自己設定 **global gitignore**。

## 設定方式

### 建立全域忽略檔案

建立一個全域的 gitignore 檔案（檔名和路徑可自訂）：

```bash
touch ~/.gitignore_global
```

### 告訴 Git 使用這個檔案

```bash
git config --global core.excludesFile ~/.gitignore_global
```

這會在 `~/.gitconfig` 中加入：

```ini
[core]
    excludesFile = ~/.gitignore_global
```

### 編輯忽略規則

在 `~/.gitignore_global` 中加入你個人開發環境會產生的檔案：

```gitignore
# JetBrains IDEs
.idea/
*.iml

# VS Code
.vscode/

# macOS
.DS_Store
.AppleDouble
.LSOverride

# Vim
*.swp
*.swo
*~

# Emacs
*~
\#*\#
.\#*
```

設定完成後，這些規則會自動套用到你電腦上的**所有 Git 倉庫**，不需要在每個專案的 `.gitignore` 重複設定。

## 運作原理

Git 在判斷是否忽略某個檔案時，會依照以下優先順序檢查：

1. **命令列參數**：`git add -f` 可強制加入被忽略的檔案
2. **`.gitignore`**（專案層級）：隨專案版控，團隊共享
3. **`.git/info/exclude`**（倉庫層級）：僅限本地，不隨專案版控
4. **`core.excludesFile`**（全域層級）：你的個人設定，套用到所有倉庫

全域 gitignore 的優先順序最低，如果專案的 `.gitignore` 明確追蹤某個檔案，全域設定不會覆蓋它。

## 小結

| 層級 | 檔案                  | 用途                                     | 共享範圍 |
| ---- | --------------------- | ---------------------------------------- | -------- |
| 專案 | `.gitignore`          | 專案產物（`node_modules/`、`dist/`）     | 團隊共享 |
| 倉庫 | `.git/info/exclude`   | 個人在特定倉庫的忽略                     | 僅自己   |
| 全域 | `~/.gitignore_global` | 個人開發工具產物（`.idea`、`.DS_Store`） | 僅自己   |

原則很簡單：**專案相關的放 `.gitignore`，個人工具相關的放 global gitignore**。這樣團隊的 `.gitignore` 保持乾淨，每個人也不用擔心自己的 IDE 檔案意外被提交。

## 參考資料

- [Global gitignores](https://augustl.com/blog/2009/global_gitignores/)
- [Configuring ignored files for all repositories on your computer](https://docs.github.com/en/free-pro-team@latest/github/using-git/ignoring-files#configuring-ignored-files-for-all-repositories-on-your-computer)
- [How to manage projects under Version Control Systems](https://intellij-support.jetbrains.com/hc/en-us/articles/206544839)
- [全域範圍 global .gitignore](https://clouding.city/git/global-gitignore/)
- [How to gitignore .idea files](https://intellij-support.jetbrains.com/hc/en-us/community/posts/115000154070-How-to-gitignore-idea-files)

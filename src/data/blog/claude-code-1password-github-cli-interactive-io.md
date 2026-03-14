---
pubDatetime: 2026-03-14T00:00:00Z
title: "解決 Claude Code 中 1Password + GitHub CLI 的 Interactive IO 問題"
slug: claude-code-1password-github-cli-interactive-io
draft: false
tags:
  - claude-code
  - 1password
  - github
  - cli
description: "Claude Code 以 non-interactive 子程序執行 gh，導致 1Password shell plugin 的 TouchID 認證失敗。記錄從發現問題到最終用條件式 alias + op read 注入 GH_TOKEN 的除錯過程。"
---

## Table of contents

## 問題

我日常開發用 1Password 管理各種 credentials，GitHub CLI（`gh`）透過 1Password shell plugin 取得 access token——平時在終端機裡用得好好的，TouchID 一按就過。

但在 Claude Code 裡就炸了。Claude Code 嘗試呼叫 `gh` 查詢 GitHub 資訊時，跳出 TouchID 認證後直接報錯：

```
[ERROR] 2026/02/08 01:30:41 interactive IO not available
```

原因不難猜：Claude Code 以非互動式（non-interactive）子程序執行 `gh`，1Password CLI 需要的 TouchID 互動介面根本不存在。

## 踩過的坑

解決這個問題花了不少來回，紀錄一下過程中踩到的幾個坑。

### 第一步：注入 GH_TOKEN 環境變數

思路很直接——既然問題出在 1Password plugin 的互動認證，那就在啟動 Claude Code 之前先把 token 取出來塞進 `GH_TOKEN`，讓 `gh` 直接用環境變數認證。

寫成 alias 放在 `~/.zshrc`：

```bash
alias claude='GH_TOKEN=$(op item get "GitHub Personal Access Token" --fields token) claude'
```

### 坑 1：1Password 項目名稱要完全正確

啟動後馬上報錯：

```
"GitHub Personal Access Token" isn't an item.
```

`op item get` 的項目名稱必須跟 1Password 裡存的一模一樣。用 `op item list | grep -i github` 查到我的項目全名是 `GitHub Personal Access Token - GitHub CLI`。

### 坑 2：1Password shell plugin 的 alias 攔截

設了正確的 `GH_TOKEN`，啟動 Claude Code 也沒報錯了，但在裡面跑 `gh` 還是一樣噴 `interactive IO not available`。

問題在 1Password shell plugin。它在 `~/.config/op/plugins.sh` 裡定義了：

```bash
alias gh="op plugin run -- gh"
```

這個 alias 會被子 shell 繼承，所以 Claude Code 裡的 `gh` 根本不是原生的 `gh`，而是被 1Password plugin 包裝過的版本。就算 `GH_TOKEN` 已經設好了，呼叫還是會走 `op plugin run` 這條路。

### 坑 3：改 PATH 蓋不掉 alias

我的第一個想法是透過修改 `PATH` 讓 `gh` 指向原生二進位：

```bash
alias claude='GH_TOKEN=$(op item get "..." --fields token) PATH="$(dirname $(whence -p gh)):$PATH" claude'
```

沒用。alias 的優先級高於 `PATH`，shell 會先匹配 alias 再去找 `PATH`。

### 坑 4：OP_PLUGIN_ALIASES_SOURCED 的陷阱

想到用環境變數做條件判斷，在 `plugins.sh` 裡有條件地載入 alias。但打開 `~/.config/op/plugins.sh` 一看：

```bash
export OP_PLUGIN_ALIASES_SOURCED=1
alias aws="op plugin run -- aws"
alias gh="op plugin run -- gh"
```

第一行就 `export OP_PLUGIN_ALIASES_SOURCED=1`！如果拿這個變數做 `if [[ -z "$OP_PLUGIN_ALIASES_SOURCED" ]]` 判斷，條件永遠為 false，`gh` alias 永遠不會被設定——連一般終端機也壞掉。

### 坑 5：op item get 需要 --reveal

好不容易搞定 alias 的問題，結果 `gh` 回報 `HTTP 401: Bad credentials`。

原來 `op item get` 預設不會顯示敏感欄位的實際值，只會輸出：

```
[use 'op item get xxx --reveal' to reveal]
```

所以 `GH_TOKEN` 拿到的是這串提示文字而不是真正的 token。需要加 `--reveal` 或改用 `op read`。

## 最終方案

### ~/.config/op/plugins.sh

用一個自訂的環境變數 `CLAUDE_CODE_SESSION` 做條件判斷，在 Claude Code 內跳過 `gh` 的 1Password plugin alias：

```bash
export OP_PLUGIN_ALIASES_SOURCED=1
alias aws="op plugin run -- aws"
if [[ -z "$CLAUDE_CODE_SESSION" ]]; then
  alias gh="op plugin run -- gh"
fi
```

### ~/.zshrc

```bash
alias claude='GH_TOKEN=$(op read "op://Private/GitHub Personal Access Token - GitHub CLI/token" 2>/dev/null) CLAUDE_CODE_SESSION=1 claude'
```

這裡用 `op read` 搭配 secret reference 路徑取得 token，語法比 `op item get` 清楚，也不需要額外加 `--reveal`。

### 效果

- 一般終端機：`CLAUDE_CODE_SESSION` 未設定 → `gh` 照舊走 1Password plugin + TouchID
- Claude Code 內：`CLAUDE_CODE_SESSION=1` → 跳過 plugin alias，`gh` 用原生二進位 + `GH_TOKEN` 環境變數認證

兩邊互不干擾。

## 延伸：其他會呼叫 gh 的工具

同樣的問題不只發生在 Claude Code。任何在內部呼叫 `gh` 的工具，只要它的執行環境繼承了 1Password plugin 的 alias，都會碰到一樣的 `interactive IO not available`。

例如 [octorus](https://github.com/ushironoko/octorus) 這類 GitHub PR review 工具，會在內部啟動 `gh` 來操作 PR。解法一樣——在 alias 裡預先注入 `GH_TOKEN`：

```bash
alias or='GH_TOKEN=$(op read "op://Private/GitHub Personal Access Token - GitHub CLI/token" 2>/dev/null) or'
```

只要某個工具會在 non-interactive 環境下呼叫 `gh`，就用 alias 把 `GH_TOKEN` 預先餵進去。

## 小結

根本原因就一句話：Claude Code 的子程序是 non-interactive 的，1Password plugin 需要 interactive IO。但從發現問題到真正解決，中間經過了項目名稱、alias 優先級、環境變數覆蓋、`op` 指令參數等好幾個小坑。

如果你也用 1Password shell plugin 搭配 Claude Code，記得：

1. 啟動前用 `op read` 或 `op item get --reveal` 預先取得 token 注入環境變數
2. 確保 Claude Code 的子 shell 中 1Password plugin alias 不會攔截 CLI 工具
3. 用條件判斷讓日常終端和 Claude Code 的行為各自獨立

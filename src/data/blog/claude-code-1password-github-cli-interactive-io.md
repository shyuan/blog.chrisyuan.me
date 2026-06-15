---
pubDatetime: 2026-03-14T00:00:00Z
modDatetime: 2026-03-14T09:00:00Z
title: "解決 Claude Code 中 1Password + GitHub CLI / AWS CLI / kubectl 的 Interactive IO 問題"
slug: claude-code-1password-cli-interactive-io
draft: false
tags:
  - claude-code
  - 1password
  - github
  - aws
  - kubernetes
  - cli
description: "Claude Code 的 non-interactive 子程序導致 1Password TouchID 失敗。用條件式 alias + op read 注入 credentials 解決 gh / aws / kubectl 認證問題。"
---

## Table of contents

## 問題

我日常開發用 1Password 管理各種 credentials，GitHub CLI（`gh`）和 AWS CLI（`aws`）都透過 1Password shell plugin 取得 access token——平時在終端機裡用得好好的，TouchID 一按就過。

但在 Claude Code 裡就炸了。Claude Code 嘗試呼叫 `gh` 或 `aws` 時，直接報錯：

```
[ERROR] 2026/02/08 01:30:41 interactive IO not available
```

原因不難猜：Claude Code 以非互動式（non-interactive）子程序執行指令，1Password CLI 需要的 TouchID 互動介面根本不存在。同樣的問題也影響了 `kubectl`——因為 EKS 的 kubeconfig 是透過 `op plugin run -- aws` 取得認證 token 的。

## 最終方案

先講結論，踩坑過程放在後面。

### ~/.config/op/plugins.sh

用一個自訂的環境變數 `CLAUDE_CODE_SESSION` 做條件判斷，在 Claude Code 內跳過所有 1Password plugin alias，讓 `gh`、`aws` 等 CLI 工具直接使用原生執行檔，從 `GH_TOKEN`、`AWS_ACCESS_KEY_ID` 等環境變數取得 credentials：

```bash file="~/.config/op/plugins.sh"
export OP_PLUGIN_ALIASES_SOURCED=1
if [[ -z "$CLAUDE_CODE_SESSION" ]]; then
  alias aws="op plugin run -- aws"
  alias gh="op plugin run -- gh"
fi
```

### ~/.zshrc

用 function 在啟動 Claude Code 前，透過 `op read` 預先取出所有需要的 credentials：

```bash file="~/.zshrc"
claude() {
  export GH_TOKEN=$(op read "op://Private/GitHub Personal Access Token - GitHub CLI/token" 2>/dev/null)
  export AWS_ACCESS_KEY_ID=$(op read "op://Private/<item-id>/access key id" 2>/dev/null)
  export AWS_SECRET_ACCESS_KEY=$(op read "op://Private/<item-id>/secret access key" 2>/dev/null)
  KUBECONFIG="$HOME/.kube/config-claude" CLAUDE_CODE_SESSION=1 command claude "$@"
}
```

`op read` 搭配 secret reference 路徑取得 credentials，語法比 `op item get` 清楚，也不需要額外加 `--reveal`。項目名稱含特殊字元（如括號）時，改用 item ID 取代名稱（詳見下方坑 6）。

### ~/.kube/config-claude

EKS 的 kubeconfig 預設用 `op plugin run -- aws` 取得認證 token。在 Claude Code 中 `op` 無法互動式認證，需要建立一份獨立的 kubeconfig，把 `command: op` 改成 `command: aws`：

```yaml file="~/.kube/config-claude"
users:
  - name: arn:aws:eks:<region>:<account-id>:cluster/<cluster-name>
    user:
      exec:
        apiVersion: client.authentication.k8s.io/v1beta1
        args:
          - --region
          - <region>
          - eks
          - get-token
          - --cluster-name
          - <cluster-name>
          - --output
          - json
        command: aws # 原本是 op，args 也要移除 plugin run -- aws 的部分
```

原始的 `~/.kube/config` 保持不動，一般終端機繼續走 `op` + TouchID。Claude Code 啟動時透過 `KUBECONFIG` 環境變數指向這份獨立的 config。

### 效果

- 一般終端機：`CLAUDE_CODE_SESSION` 未設定 → `aws`、`gh` 走 1Password plugin + TouchID，`kubectl` 用 `~/.kube/config`（透過 `op` 認證）
- Claude Code 內：`CLAUDE_CODE_SESSION=1` → 跳過 plugin alias，用原生 CLI + 環境變數認證，`kubectl` 用 `~/.kube/config-claude`（直接呼叫 `aws`）

兩邊互不干擾。

## 踩過的坑

上面是最終方案，下面記錄我是怎麼一步步走到這裡的。

### 第一步：注入 GH_TOKEN 環境變數

思路很直接——既然問題出在 1Password plugin 的互動認證，那就在啟動 Claude Code 之前先把 token 取出來塞進 `GH_TOKEN`，讓 `gh` 直接用環境變數認證。

寫成 alias 放在 `~/.zshrc`：

```bash file="~/.zshrc"
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

```bash file="~/.config/op/plugins.sh"
alias gh="op plugin run -- gh"
```

這個 alias 會被子 shell 繼承，所以 Claude Code 裡的 `gh` 根本不是原生的 `gh`，而是被 1Password plugin 包裝過的版本。就算 `GH_TOKEN` 已經設好了，呼叫還是會走 `op plugin run` 這條路。

### 坑 3：改 PATH 蓋不掉 alias

我的第一個想法是透過修改 `PATH` 讓 `gh` 指向原生二進位：

```bash file="~/.zshrc"
alias claude='GH_TOKEN=$(op item get "..." --fields token) PATH="$(dirname $(whence -p gh)):$PATH" claude'
```

沒用。alias 的優先級高於 `PATH`，shell 會先匹配 alias 再去找 `PATH`。

### 坑 4：OP_PLUGIN_ALIASES_SOURCED 的陷阱

想到用環境變數做條件判斷，在 `plugins.sh` 裡有條件地載入 alias。但打開 `~/.config/op/plugins.sh` 一看：

```bash file="~/.config/op/plugins.sh"
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

### 坑 6：op read 的 secret reference 不支援特殊字元

AWS 的 1Password 項目名稱是 `AWS Access Key(my-project)`，直接用名稱會報錯：

```
[ERROR] invalid secret reference: invalid character in secret reference: '('
```

解法是改用 item ID 取代名稱。用 `op item list --vault Private | grep -i aws` 找到 ID 後，以 ID 替代：

```bash
# 不行：名稱含括號
op read "op://Private/AWS Access Key(my-project)/access key id"

# 可以：用 item ID
op read "op://Private/<item-id>/access key id"
```

### 試過但不適用：op run --env-file

1Password 有 `op run --env-file` 可以一次解析所有 `op://` reference 並注入環境變數：

```bash
# secrets.env（只有 reference，不含實際密碼）
GH_TOKEN=op://Private/GitHub Personal Access Token - GitHub CLI/token
AWS_ACCESS_KEY_ID=op://Private/<item-id>/access key id

# 啟動時
alias claude='op run --env-file="$HOME/.config/claude/secrets.env" -- claude'
```

看起來很優雅，但實際上 `op run` 會接管子程序的 stdin/stdout，導致 Claude Code 報錯：

```
Error: Input must be provided either through stdin or as a prompt argument when using --print
```

`op run` 適合一次性腳本或背景服務，不適合需要持續互動式 terminal 的工具。

## 延伸：其他會呼叫 gh 的工具

同樣的問題不只發生在 Claude Code。任何在內部呼叫 `gh` 的工具，只要它的執行環境繼承了 1Password plugin 的 alias，都會碰到一樣的 `interactive IO not available`。

例如 [octorus](https://github.com/ushironoko/octorus) 這類 GitHub PR review 工具，會在內部啟動 `gh` 來操作 PR。解法一樣——在 alias 裡預先注入 `GH_TOKEN`：

```bash file="~/.zshrc"
alias or='GH_TOKEN=$(op read "op://Private/GitHub Personal Access Token - GitHub CLI/token" 2>/dev/null) or'
```

只要某個工具會在 non-interactive 環境下呼叫 `gh`，就用 alias 把 `GH_TOKEN` 預先餵進去。

## 小結

根本原因就一句話：Claude Code 的子程序是 non-interactive 的，1Password plugin 需要 interactive IO。但從發現問題到真正解決，中間經過了項目名稱、alias 優先級、環境變數覆蓋、`op` 指令參數、secret reference 特殊字元、kubeconfig exec 認證等好幾個小坑。

如果你也用 1Password shell plugin 搭配 Claude Code，記得：

1. 啟動前用 `op read` 預先取得 credentials 注入環境變數（項目名稱含特殊字元時改用 item ID）
2. 確保 Claude Code 的子 shell 中 1Password plugin alias 不會攔截 CLI 工具
3. 用條件判斷讓日常終端和 Claude Code 的行為各自獨立
4. kubeconfig 中用 `op` 包裝的 exec 認證，需要建立獨立的 config 改用原生 CLI
5. `op run --env-file` 看似方便但會搶佔 stdin，不適合互動式工具

## 後記：其他可能的方向

本文的做法是在啟動前預先取出 credentials，但還有幾個值得追蹤的替代方案：

- **Claude Code 原生支援 `op://` reference**：已有 [Issue #23642](https://github.com/anthropics/claude-code/issues/23642) 提議讓 Claude Code 直接解析 1Password secret reference，如果實現的話就不需要這些 workaround 了
- **AWS `credential_process`**：可以在 `~/.aws/config` 中設定 `credential_process = op read ...`，讓 AWS CLI 按需取得憑證，而不是在啟動時預先注入環境變數。不過在 Claude Code 的 non-interactive 環境下，`op read` 一樣需要先完成 TouchID 認證才行
- **1Password Service Account**：如果想完全跳過 TouchID 互動，可以用 [1Password Service Account](https://developer.1password.com/docs/service-accounts/) 搭配 `OP_SERVICE_ACCOUNT_TOKEN` 環境變數。適合 CI/CD 或無頭環境，但在本機開發用 Service Account 就少了 TouchID 這層保護

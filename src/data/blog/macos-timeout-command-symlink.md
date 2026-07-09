---
pubDatetime: 2026-07-09T04:08:42Z
title: "macOS 上補 timeout 指令的正確做法：從「加 PATH」到「建 symlink」的除錯記錄"
slug: "macos-timeout-command-symlink"
tags:
  - macOS
  - Shell
  - Homebrew
  - coreutils
  - 除錯
description: "macOS 沒有 timeout 指令。把 gnubin 加進 PATH 會整批換掉 ls 等指令、弄壞顏色；alias 又進不了子行程。正解是 ~/.local/bin 指向 gtimeout 的 symlink。"
draft: false
---

像 [Claude Code](https://claude.com/claude-code) 這類 coding agent 在跑腳本時，很愛用 [GNU coreutils](https://www.gnu.org/software/coreutils/) 的 `timeout` 幫指令加上逾時保護，免得卡死。問題是 Apple 因為 GPL 授權的關係，macOS 內建的是 BSD 工具、沒有 `timeout`，得自己安裝。這篇記錄一次補 `timeout` 的除錯過程：從 Homebrew 官方建議的「把 gnubin 加進 PATH」，一路踩到 `ls` 顏色消失的副作用，再到最後用 symlink 收尾。中間還澄清了一個常見盲點：`.zshrc` 裡的 alias 和 function，其實沒辦法從 Makefile 開的子行程使用。

## Table of contents

## 背景：timeout 是什麼，為什麼 macOS 上沒有

在某個專案裡跑 `make build` 時失敗，錯誤訊息是：

```
./scripts/safe-build.sh: line 77: timeout: command not found
```

原因很單純：`scripts/safe-build.sh` 裡用 `timeout $MAX_BUILD_TIME npx next build` 這種寫法來替建置流程加上逾時保護，但 macOS 內建的是 BSD 工具，沒有 `timeout` 這個指令，這是 [GNU coreutils](https://www.gnu.org/software/coreutils/) 才有的東西。

## 第一次嘗試：把整個 gnubin 塞進 PATH

我已經用 [Homebrew](https://brew.sh/) 安裝了 `coreutils` 套件：

```bash
brew install coreutils
```

裝完後，Homebrew 會給出一段常見的 Caveats 提示：

```
Commands also provided by macOS and the commands dir, dircolors, vdir have been installed with the prefix "g".
If you need to use these commands with their normal names, you can add a "gnubin" directory to your PATH with:
  PATH="/opt/homebrew/opt/coreutils/libexec/gnubin:$PATH"
```

照這個提示，在 `~/.zshrc` 加了一行：

```bash
export PATH="/opt/homebrew/opt/coreutils/libexec/gnubin:$PATH"
```

這個目錄裡其實已經放好了一份「去掉 `g` 前綴」的 symlink（例如 `timeout -> ../../bin/gtimeout`），所以只要把它排到 PATH 前面，打 `timeout`（不用打 `gtimeout`）馬上就能用。實測也證實 `make build` 確實往下跑得更遠、不再卡在 timeout not found。

### 副作用：ls 的顏色不見了

看似解決問題，但後來發現：在 shell 下 `ls` 後，目錄／檔案類型顏色標示消失了。

根因分析：

- `gnubin` 目錄裡不是只有 `timeout`，而是把 `ls`、`dir`、`vdir` 等一堆 macOS 本來就有、但 GNU coreutils 也提供同名版本的指令，全部用去掉 `g` 前綴的 symlink 放在同一個資料夾。
- 一旦把這個目錄排到 PATH 最前面，這些指令就全被 GNU 版本一併換掉，不是只有原本要的 `timeout`。
- macOS 原生 `ls` 的顏色設定靠環境變數 `LSCOLORS`（BSD 風格的簡短字母編碼）；GNU `ls` 則是看 `LS_COLORS`（透過 `dircolors` 產生的另一套格式）。兩者格式不相容，原本的 `LSCOLORS` 設定對 GNU `ls` 完全沒作用，於是顏色就消失了。

Homebrew 官方 Caveats 建議的「把 gnubin 整個塞進 PATH」，看起來無害，實際上影響面很廣：它不是「多裝一個指令」，而是「把一整批系統指令換掉」，容易在不知情的狀況下產生看不出因果關係的副作用。

## 收斂方向：只包裝真正需要的那個指令

於是決定退回去，只針對 `timeout` 這一個指令做處理，`.zshrc` 裡的 gnubin PATH 改回註解掉：

```bash
# coreutils
#export PATH="/opt/homebrew/opt/coreutils/libexec/gnubin:$PATH"
```

第一個念頭是寫一個 shell function：

```bash
timeout() { gtimeout "$@"; }
```

### 岔題：alias 還是 function 比較好？

在單純「原樣轉發參數」的情境下，兩種寫法效果幾乎一樣：

```bash
alias timeout=gtimeout
# vs
timeout() { gtimeout "$@"; }
```

技術上 function 略勝一籌：

- `"$@"` 可以保證參數與引號被正確保留展開，不會有 edge case。
- alias 展開的規則是「只在指令是一行的第一個字時才生效」，遇到 `sudo timeout ...`、或放在某些管線／複合指令中可能不會被展開；function 沒有這個限制。
- 之後如果想加額外邏輯（例如「系統原生 timeout 存在就優先用，不存在才 fallback 到 gtimeout」），function 也比較好擴充。

### 真正的關鍵盲點：alias 和 function 都跳不出互動式 shell 的掌控

但這個 alias/function 之爭其實是個假議題，兩者都無法解決最初想解決的問題。

原因是：`~/.zshrc` 只會在「互動式 shell 啟動時」被 source。而 `make build` 實際上會呼叫：

```
scripts/safe-build.sh   # 檔案開頭是 #!/bin/bash
```

這是一個帶自己 shebang 的獨立腳本，執行時會開一個全新的 bash process，這個 process 完全不會去 source 我的 `~/.zshrc`。不管是互動式定義的 alias 還是 function，都只存在於「定義它的那個 shell session」裡，不會被子行程繼承。

換句話說：

- 我在自己的終端機直接打 `timeout 5 sleep 10`，用 alias 或 function 都能動。
- 但 `make` → `npm run build` → `./scripts/safe-build.sh` 這條呼叫鏈裡，`timeout` 這個字對那個新開的 bash 而言，就是「PATH 上找不到的一個指令」，alias 和 function 在這裡都不存在。

這一點很容易被忽略，卻直接決定了「這個修正到底有沒有解決原始問題」。

## 正確解法：在 PATH 上放一個真實可執行檔（symlink）

真正能同時滿足「互動式 shell 能用」與「非互動式子行程／腳本／Makefile 也能用」的做法，是在一個「已經在 PATH 上、且不會整批覆蓋其他指令」的目錄裡，只放這一個指令的 symlink：

```bash
mkdir -p ~/.local/bin
ln -sf "$(command -v gtimeout)" ~/.local/bin/timeout
```

（這裡 `command -v gtimeout` 假設 Homebrew 的 bin 已經在 PATH 上；若沒有，把目標寫死成 `"$(brew --prefix)/bin/gtimeout"` 會更保險，免得展開成空字串、建出一個指向空路徑的壞 symlink。）

`~/.local/bin` 只要已經在 PATH 上就不用再改設定——我的 `.zshrc` 本來就有這一行。要注意的是 macOS 預設並不會把 `~/.local/bin` 放進 PATH，如果你的環境還沒有，得先自己加一行：

```bash
export PATH="$HOME/.local/bin:$PATH"
```

而這一步之所以能讓子行程也吃到 `timeout`，靠的正是 PATH 會被匯出、由子行程繼承，而不是子行程回頭去 source 你的 `.zshrc`。這個方式：

- 只新增 `timeout` 一個指令，不會動到 `ls`／`dir`／`vdir` 等任何其他東西。
- 是檔案系統層級的真實 PATH 項目，任何 shell、任何非互動式子行程（Makefile recipe、CI 腳本、`xargs`／`find -exec` 等直接 exec 呼叫的情境）都能找到它，不受「有沒有 source `.zshrc`」影響。

同時把 `.zshrc` 裡先前加的 function 拿掉，改成註解說明原因：

```bash
# coreutils (GNU) — wrap only the specific commands needed instead of
# prepending gnubin to PATH, which silently replaces ls/dir/vdir with the
# GNU versions and breaks macOS ls color highlighting (LSCOLORS vs LS_COLORS).
# `timeout` is provided via a ~/.local/bin/timeout symlink to gtimeout instead
# of an alias/function, so it's also visible to non-interactive child scripts
# (e.g. Makefile recipes) that don't source this file.
#export PATH="/opt/homebrew/opt/coreutils/libexec/gnubin:$PATH"
```

### 驗證

分兩種情境驗證，確保兩邊都吃得到。

互動式 shell：

```bash
$ zsh -ic 'command -v timeout; type timeout; timeout 1 sleep 2; echo "exit code: $?"'
/Users/chrisyuan/.local/bin/timeout
timeout is /Users/chrisyuan/.local/bin/timeout
exit code: 124
```

模擬非互動式子行程（乾淨環境、不 source 任何 rc 檔）：

```bash
$ env -i PATH="$HOME/.local/bin:/usr/bin:/bin:/opt/homebrew/bin" bash -c \
    'command -v timeout; timeout 1 sleep 2; echo "exit code: $?"'
/Users/chrisyuan/.local/bin/timeout
exit code: 124
```

兩者都正確回傳 exit code 124（逾時），確認 `timeout` 在任何呼叫情境下都能正常運作。

## 結論：只需要一兩個指令時，別整批覆蓋

1. Homebrew 的「把 gnubin 加進 PATH」是圖方便的整批方案，代價是覆蓋一整組同名系統指令，在 macOS 上容易產生像 `ls` 顏色消失這種不易聯想到根因的副作用。只要不是真的想全面切換成 GNU 工具鏈，就不該這樣用。
2. 只需要一兩個 GNU 指令時，該做的是「選擇性放行」，而不是「整批覆蓋」，可以用 alias、function，或（更好）symlink 到一個乾淨的個人 bin 目錄。
3. Alias 和 function 都只是互動式 shell 內部的語法糖，不會被子行程繼承。如果目標包含「讓 Makefile、腳本、CI 這類非互動式流程也能用到這個指令」，就必須讓它變成 PATH 上一個真實存在的檔案（執行檔或 symlink），這是唯一在所有呼叫情境下都成立的做法。
4. 這個案例也說明「debug 時看起來解決了」不等於「真的解決了根本問題」。`make build` 有繼續往下跑，並不代表修正在所有情境下都站得住；如果沒有進一步確認子行程的 shell 語意，很容易在 alias／function 這層就誤以為大功告成。

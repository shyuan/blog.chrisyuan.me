---
pubDatetime: 2026-10-12T15:01:08+08:00
title: "mosh 連 macOS 出現 mosh-server: command not found：改 ~/.zshenv 解決"
slug: "mosh-server-command-not-found-macos"
tags:
  - ssh
  - macos
  - homebrew
  - cli
  - til
description: "mosh 連 macOS 報 mosh-server: command not found，因 Homebrew 的 PATH 寫在 .zprofile，SSH 執行指令時讀不到。改 ~/.zshenv 即可，另附 socketfilterfw 防火牆設定。"
draft: false
---

在一台遠端 Mac 上用 [Homebrew](https://brew.sh/) 裝好 [mosh](https://mosh.org/)，從另一台機器執行 `mosh user@host`，結果直接報錯：

```text
zsh:1: command not found: mosh-server
```

奇怪的是，SSH 進去打 `which mosh-server` 明明找得到。

## Table of contents

## 原因

mosh 的連線流程是先用 SSH 登入，再執行 `mosh-server new ...` 啟動 server。這一步跑在非互動、非 login 的 shell 裡。

Homebrew 安裝完叫你加的那行 `eval "$(/opt/homebrew/bin/brew shellenv)"`，一般寫在 `~/.zprofile`。[zsh 只有 login shell 才讀 `.zprofile`](https://zsh.sourceforge.io/Intro/intro_3.html)，所以 mosh 透過 SSH 執行指令時，PATH 裡根本沒有 `/opt/homebrew/bin`。

用這行就能重現：

```bash
ssh user@host 'which mosh-server'
# mosh-server not found
```

## 解法

臨時的做法是在 client 端直接指定 server 路徑：

```bash
mosh --server=/opt/homebrew/bin/mosh-server user@host
```

能用，但每次都要打，從 iPad 之類的 client 連也得各自設定。

比較乾淨的做法是改遠端 Mac 的 `~/.zshenv`。zsh 不管是哪種模式啟動都會讀這個檔案：

```bash
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshenv
```

再從 client 驗證一次：

```bash
ssh user@host 'which mosh-server'
# /opt/homebrew/bin/mosh-server
```

之後 `mosh user@host` 就能直接登入了。

`~/.zshenv` 會在每一個 zsh 啟動時執行，連 script 也不例外，所以裡面只適合放 PATH 這種輕量設定。會印出文字的指令千萬別放進去，mosh 啟動時要從 SSH 輸出裡讀連線資訊，多出來的文字會讓握手失敗。

## 順便記一下：防火牆用 CLI 設定

網路上常被引用的 [Chris Krycho 這篇教學](https://v4.chriskrycho.com/2017/set-up-mosh-on-macos.html) 是用 System Preferences 的圖形介面把 mosh-server 加進防火牆。遠端機器不方便開 GUI 的話，可以用 `socketfilterfw`：

```bash
FW=/usr/libexec/ApplicationFirewall/socketfilterfw

sudo $FW --getglobalstate          # 防火牆沒開就不用設

MOSH=$(realpath "$(which mosh-server)")
sudo $FW --add "$MOSH"
sudo $FW --unblockapp "$MOSH"
sudo $FW --listapps                # 確認結果
```

要用 `realpath` 是因為 `which` 回傳的是 `/opt/homebrew/bin` 底下的 symlink，防火牆規則要綁在 Cellar 裡的實際執行檔上。代價是 `brew upgrade mosh` 之後路徑會變，規則得重加一次。

那篇文章裡的 `sudo pfctl -f /etc/pf.conf` 大概可以省略。Application Firewall 和 pf 是兩套不同的機制，`socketfilterfw` 加的規則會直接生效。

如果連的是跑 Dropbear 的主機，`mosh-server` 找得到卻還是連不上，可以參考[另一篇排查紀錄](/posts/mosh-dropbear-no-ssh-pty/)。

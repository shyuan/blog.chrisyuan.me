---
pubDatetime: 2026-08-25T05:15:35Z
title: "mosh 連不上 Dropbear？加 --no-ssh-pty 就通：排查過程與全域設定的安全性"
slug: "mosh-dropbear-no-ssh-pty"
tags:
  - ssh
  - cli
  - homelab
description: "mosh 連 Dropbear 一直失敗，看起來像 mosh-server 沒啟動，其實 mosh 沒有 daemon。根因是 ssh -n -tt 讓 Dropbear 提前關線，加 --no-ssh-pty 即解，全域加也安全。"
draft: false
---

在跑 [Dropbear](https://matt.ucc.asn.au/dropbear/dropbear.html) 的主機上用 [mosh](https://mosh.org/)，client 會一直連不上，看起來像是 mosh-server 沒有啟動。實際上 mosh 根本不需要常駐 server：問題出在 mosh 預設用 `ssh -n -tt` 做 bootstrap，Dropbear 吃不下這個矛盾的旗標組合，會在 `MOSH CONNECT` 訊息送達前就關閉連線。解法是加上 `--no-ssh-pty`，而且這個 flag 對一般的 OpenSSH 主機沒有副作用，可以放心設成全域 alias。

## Table of contents

## 起因：以為是 mosh-server 沒有自動啟動

我有一台 Raspberry Pi 3 跑 [DietPi](https://dietpi.com/)，當 homelab 的 subnet router（走 [Tailscale](https://tailscale.com/)）。DietPi 預設的 SSH server 是輕量的 Dropbear，不是 OpenSSH。在上面裝了 mosh 之後，從 Mac 直接 `mosh dietpi@homelab-subnetrouter` 連不上，第一直覺是「mosh server 沒有自動啟動，大概要補一個 systemd service」。

這個直覺是錯的，而且錯得很有代表性，所以值得記錄下來。

## mosh 本來就沒有常駐 daemon

mosh 的架構跟 sshd 完全不同：

1. mosh client 先透過一般的 SSH 登入遠端（Dropbear 也支援）。
2. 這條 SSH session 幫你臨時啟動一個專屬的 `mosh-server` 程序，它挑一個 UDP port（預設 60000-61000 範圍）監聽，並印出一行 `MOSH CONNECT <port> <key>`。
3. client 解析到這行後，SSH 連線就功成身退，之後全部走 UDP + AES 加密通道。

所以 `mosh-server` 是每次連線按需啟動、session 結束就消失的，設定開機自動啟動的 service 不但沒必要，也沒有意義。如果 mosh 連不上，方向應該是查 bootstrap 過程哪裡壞掉，而不是去補 service。

## 排查：mosh-server 和 UDP 通道都是好的

在 DietPi 上逐項檢查，全部正常：

- `mosh-server` 1.4.0 裝在 `/usr/bin/mosh-server`，在 PATH 內
- locale 是 UTF-8（mosh 的硬性要求，這在精簡系統上很常見出問題）
- iptables 沒有擋 UDP 60000-61000（Tailscale 的規則只處理它自己的流量）

甚至手動驗證了整條路：在遠端跑 `mosh-server new -p 60001` 拿到 key，從 Mac 用 `MOSH_KEY=... mosh-client <ip> 60001` 直連 UDP，完全可以連上。也就是說 mosh-server 和 UDP 通道都是好的，壞掉的只有 mosh wrapper 自動做的那段 SSH bootstrap。

## 根因：`ssh -n -tt` 遇上 Dropbear

看 mosh 的 wrapper script（它其實是一個 perl script）就真相大白：

```perl
my @sshopts = ( '-n' );
if ($ssh_pty) {
    push @sshopts, '-tt';
}
```

mosh 固定用 `-n`（stdin 接到 /dev/null），預設又加 `-tt`（強制配置遠端 pty）。「不開 stdin」加上「強制互動式 pty」是個矛盾的組合。OpenSSH server 容忍它，但 Dropbear 會在 mosh-server 的輸出送回 client 之前就把連線關掉，client 等不到 `MOSH CONNECT`，看起來就像 server 沒起來。

這是個老問題，上游早就知道（[mosh issue #819](https://github.com/mobile-shell/mosh/issues/819)），mosh 1.3.0 就為此加了 `--no-ssh-pty` 選項，作用單純：不要加 `-tt`。

```
mosh --no-ssh-pty dietpi@homelab-subnetrouter   # 這樣就通了
```

### 其他解法的評估

- 升級 Dropbear：沒用。Dropbear 2022.82 修過一個 pty 資料 flush 的問題（[mkj/dropbear#85](https://github.com/mkj/dropbear/issues/85)），但顯然沒涵蓋這個情境，我這台已經是 Debian 13 的 2025.89，問題依舊。
- `~/.ssh/config` 設 `RequestTTY no`：無效。mosh 是用命令列旗標 `-tt`，優先權高於 config。
- 直接改 mosh script 的預設值：可行，但每次 `brew upgrade` 都會被蓋掉。
- 把 DietPi 的 SSH server 換成 OpenSSH：唯一的「治本」解，`dietpi-software` 可以一鍵切換，Pi 3 的 1GB RAM 也負擔得起。但如果想保留 Dropbear 的輕量，就只剩 client 端處理。

我選擇保留 Dropbear，在 client 端把 flag 固定下來。

## 全域加上 `--no-ssh-pty` 安全嗎

安全，這是這次研究中最值得記下的結論。`--no-ssh-pty` 唯一的作用是不要求遠端 pty，而 bootstrap 階段本來就不需要 pty：遠端只是執行 `mosh-server new` 這個非互動指令，真正互動用的 pty 是之後 mosh-server 在 UDP session 裡自己配置的。對 OpenSSH 主機：

- 公鑰、密碼認證：無影響（OpenSSH client 的密碼提示直接讀寫 client 端的 `/dev/tty`，跟遠端 pty 無關）
- host key 確認、keyboard-interactive / OTP：無影響，都在 client 端處理

唯一的例外是登入流程中有「在 server 端執行、且需要 tty 的互動式程式」的主機，典型如 Duo 的 [`login_duo`](https://duo.com/docs/loginduo) forced command、bastion 登入選單。mosh 1.4 把 pty 改成預設開啟就是為了這類情境。沒有這種主機的話，全域加 flag 就是安全的。

### 跟既有 alias 整合的小坑

我在 [oh-my-zsh](https://ohmyz.sh/) 的 custom aliases 裡本來就有 `alias mosh='mosh --ssh="ssh -A"'`（agent forwarding），直接改成：

```zsh
alias mosh='mosh --ssh="ssh -A" --no-ssh-pty'
```

順帶一提一個 zsh 小坑：如果既有 alias 還在，又在 `.zshrc` 用 `mosh() { ... }` 定義同名 function，zsh 在定義 function 時會先展開 alias，直接 parse error。同名的 alias 和 function 只能擇一，或先 `unalias` 再定義。

## 結語

「mosh 連不上」的第一反應常常是去找 server 端的 service 設定，但 mosh 的設計哲學就是沒有 daemon。遇到連不上，先理解工具的架構再排查，這次的答案是 client 端一個 mosh 1.3.0 就加好的 flag。

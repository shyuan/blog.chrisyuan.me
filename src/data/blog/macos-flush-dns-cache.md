---
pubDatetime: 2026-11-10T07:31:56Z
title: "改完 DNS 還連到舊 IP？macOS 清除 DNS Cache 的兩行指令"
slug: "macos-flush-dns-cache"
tags:
  - macOS
  - dns
  - cli
  - til
description: "macOS 清除 DNS cache 只要兩行：dscacheutil -flushcache 加 killall -HUP mDNSResponder。說明兩個指令的作用，以及清完仍連到舊 IP 時該查的三個地方。"
draft: false
---

改了 DNS 記錄、改了 `/etc/hosts`、切了 VPN，電腦卻還是連到舊的 IP，多半是本機的 DNS 快取還沒過期。macOS 清快取的指令只有兩行，但平常用不到，很容易忘。

## Table of contents

## 結論先說

在終端機執行以下兩行（需要管理員密碼）：

```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

或合併成一行：

```bash
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

macOS 10.10.4 之後的版本都適用，包含 Sonoma、Sequoia 等較新的系統。

執行後沒有任何輸出，這是正常的，表示已經成功。

## 兩個指令各做什麼

| 指令                         | 作用                                                             |
| ---------------------------- | ---------------------------------------------------------------- |
| `dscacheutil -flushcache`    | 清除系統層級的目錄服務（Directory Service）快取                  |
| `killall -HUP mDNSResponder` | 對 mDNSResponder 送出 HUP 訊號，DNS 解析快取主要是靠這一行清掉的 |

[mDNSResponder](https://github.com/apple-oss-distributions/mDNSResponder) 是 macOS 負責 DNS 解析（以及 Bonjour）的背景服務。指令名稱雖然叫 `killall`，加上 `-HUP` 只是送訊號給它，mDNSResponder 收到後會清空快取，行程本身繼續跑，網路不會中斷。

## 清完還是沒變？檢查這幾個地方

### 1. 瀏覽器有自己的 DNS 快取

Chrome 開啟 `chrome://net-internals/#dns`，按下「Clear host cache」。Firefox 則是 `about:networking#dns` 頁面裡的「Clear DNS Cache」按鈕。都找不到的話，重開瀏覽器也行，這類快取通常只存在記憶體裡。

### 2. VPN / Tailscale 可能接管了 DNS

有在用 Tailscale 或其他 VPN 的話，它們可能有自己的 DNS 設定，例如 Tailscale 的 [MagicDNS](https://tailscale.com/kb/1081/magicdns)。用下面的指令可以看系統目前實際使用哪些 resolver：

```bash
scutil --dns
```

先找出是哪個 resolver 在負責你要查的網域，再判斷快取卡在哪一層。

### 3. 上游 DNS 本身還有快取

本機清乾淨了，路由器或 ISP 的 DNS 可能還留著舊記錄。這時只能等 TTL 過期，或改用其他 DNS 伺服器測試。

## 小抄

```bash
# 清除 macOS DNS cache
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# 查看目前使用的 DNS resolver
scutil --dns
```

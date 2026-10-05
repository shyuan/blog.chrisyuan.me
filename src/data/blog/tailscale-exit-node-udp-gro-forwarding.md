---
pubDatetime: 2026-10-05T10:40:02+08:00
title: "Tailscale exit node 調校：為什麼要開 UDP GRO forwarding、關 rx-gro-list"
slug: "tailscale-exit-node-udp-gro-forwarding"
tags:
  - tailscale
  - linux
  - homelab
  - til
description: "Tailscale exit node 官方建議用 ethtool 開 rx-udp-gro-forwarding、關 rx-gro-list。解釋兩個選項的作用、為何需要 kernel 6.2，以及重開機後保留設定的做法。"
draft: false
---

在 Linux 上執行 `tailscale up --advertise-exit-node`，有時會看到這行警告：

```text
Warning: UDP GRO forwarding is suboptimally configured on eth0, UDP forwarding throughput capability will increase with a configuration change.
See https://tailscale.com/s/ethtool-config-udp-gro
```

服務照樣能用，只是 Tailscale 認為這台機器轉送 UDP 流量的效率還有改善空間。連結指向官方的 [Performance best practices](https://tailscale.com/kb/1320/performance-best-practices#linux-optimizations-for-subnet-routers-and-exit-nodes)，建議的修正只有一行 `ethtool`，但它為什麼要「開一個、關一個」，文件沒有多解釋。

## Table of contents

## 官方建議的設定

Tailscale 文件說明，Tailscale 1.54 以上搭配 Linux kernel 6.2 以上，就能用 transport layer offload 提升 UDP 吞吐量。機器若擔任 [exit node](https://tailscale.com/kb/1103/exit-nodes) 或 subnet router，要對預設路由那張網卡做以下設定：

```bash
NETDEV=$(ip -o route get 8.8.8.8 | cut -f 5 -d " ")
sudo ethtool -K "$NETDEV" rx-udp-gro-forwarding on rx-gro-list off
```

第一行找出往外連線走的是哪張網卡，第二行開啟 `rx-udp-gro-forwarding`、關閉 `rx-gro-list`。

套用前後可以用 `ethtool -k`（小寫 k 是查詢，大寫 K 是修改）確認：

```console
$ ethtool -k "$NETDEV" | grep -E "rx-udp-gro-forwarding|rx-gro-list"
rx-gro-list: off
rx-udp-gro-forwarding: off
```

`rx-udp-gro-forwarding` 的預設值通常是 off。執行設定後應該變成：

```console
rx-gro-list: off
rx-udp-gro-forwarding: on
```

`generic-receive-offload`（一般的 GRO）通常本來就是 on，不用動。

## 這兩個選項在做什麼

### GRO 與 UDP 轉送

GRO（Generic Receive Offload）讓 kernel 在收封包時，把同一條連線連續到來的小封包合併成一個大封包，再往上層送。後續的路由、防火牆、NAT 都只處理一次，不必對每個小封包各跑一遍。

TCP 很早就有 GRO。UDP 的 GRO 則分兩種情況：封包是給本機 socket 收的，或是要轉送到別的介面去的。exit node 屬於後者：網路上回來的 UDP 封包（例如 QUIC、視訊通話）進了實體網卡，要經過 NAT 轉送到 `tailscale0` 這張 TUN 介面，再由 tailscaled 加密送回 tailnet 裡的裝置。

針對轉送路徑的 UDP GRO，kernel 有兩套做法：

- `rx-gro-list`（`NETIF_F_GRO_FRAGLIST`）把封包串成 skb list，合併後的封包內部仍保留原本每個封包的邊界
- `rx-udp-gro-forwarding`（`NETIF_F_GRO_UDP_FWD`）把封包合併成一般的 UDP GSO 封包，也就是一個大 payload 加上「每段多大」的資訊，送出時再依這個大小切開

第二種是 Alexander Lobakin 在 2021 年送進 kernel 的 [patch](https://lkml.iu.edu/hypermail/linux/kernel/2101.2/07782.html) 加入的。patch 說明裡寫到，兩個旗標同時開啟時由 fraglist 優先。所以只開 `rx-udp-gro-forwarding` 不夠，`rx-gro-list` 還開著的話，走的仍是 fraglist 那條路徑。

### 為什麼需要 kernel 6.2

合併成 UDP GSO 封包後，下一站是 TUN 介面。TUN 必須能接收這種大封包，否則 kernel 還是得在送進 TUN 前先切回一個個小封包，前面的合併就白做了。

TUN 支援 UDP segmentation offload（USO）是 Andrew Melnychenko 的 [TUN/VirtioNet USO patch 系列](https://lkml.iu.edu/hypermail/linux/kernel/2212.0/06933.html)，在 Linux 6.2 合併。有了它，tailscaled 一次 read 就能從 TUN 拿到一批 UDP 資料，加密、送出也能整批處理。Tailscale 這邊的批次處理與 UDP GSO/GRO 支援，背景可以參考官方部落格的 [Surpassing 10Gb/s with Tailscale](https://tailscale.com/blog/more-throughput) 與更早的 [throughput improvements](https://tailscale.com/blog/throughput-improvements)。

Tailscale 自己的檢查程式也是照這個順序判斷。[`netkernelconf_linux.go`](https://github.com/tailscale/tailscale/blob/main/net/netkernelconf/netkernelconf_linux.go) 先看 TUN 介面有沒有 `tx-udp-segmentation`，沒有就直接略過不檢查，因為這時 UDP GRO forwarding 開不開都用不上。TUN 支援時，才去檢查預設路由網卡是否「`rx-udp-gro-forwarding` 開、`rx-gro-list` 關」，不符合就發出開頭那段警告。

## 讓設定重開機後還在

`ethtool -K` 改的是執行中的網卡狀態，重開機就會恢復預設。

### 官方做法：networkd-dispatcher

Tailscale 文件給的是 [networkd-dispatcher](https://gitlab.com/craftyguy/networkd-dispatcher) 的寫法，在網路進入 routable 狀態時執行：

```bash
printf '#!/bin/sh\n\nethtool -K %s rx-udp-gro-forwarding on rx-gro-list off \n' \
  "$(ip -o route get 8.8.8.8 | cut -f 5 -d " ")" \
  | sudo tee /etc/networkd-dispatcher/routable.d/50-tailscale
sudo chmod 755 /etc/networkd-dispatcher/routable.d/50-tailscale
```

這個做法的好處是網卡每次重新變成 routable（例如 networkd 重新設定介面）都會再套用一次。前提是系統有在用 systemd-networkd，而且裝了 networkd-dispatcher。

### 沒有 networkd-dispatcher 時：systemd oneshot

用 ifupdown 管網路，或系統沒裝 networkd-dispatcher，可以改寫成開機時跑一次的 systemd service。

先寫一支腳本 `/usr/local/sbin/udp-gro-forwarding`：

```sh
#!/bin/sh
NETDEV=$(ip -o route get 8.8.8.8 | awk '{for(i=1;i<=NF;i++) if($i=="dev"){print $(i+1); exit}}')
exec /usr/sbin/ethtool -K "$NETDEV" rx-udp-gro-forwarding on rx-gro-list off
```

這裡把 `cut -f 5` 換成 awk 找 `dev` 後面的欄位。`cut` 的寫法假設輸出是 `8.8.8.8 via <gateway> dev <iface> ...`，第 5 欄剛好是網卡名稱；如果預設路由沒有 `via`，欄位位置就會跑掉。

再建立 `/etc/systemd/system/udp-gro-forwarding.service`：

```ini
[Unit]
Description=Enable UDP GRO forwarding for Tailscale exit node
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/udp-gro-forwarding

[Install]
WantedBy=multi-user.target
```

啟用並立即執行：

```bash
sudo chmod 755 /usr/local/sbin/udp-gro-forwarding
sudo systemctl enable --now udp-gro-forwarding.service
```

`Type=oneshot` 又沒設 `RemainAfterExit=yes`，所以執行完 `systemctl is-active` 會顯示 `inactive`，這是正常的。要確認有沒有成功，看執行結果：

```console
$ systemctl show -p Result -p ExecMainStatus udp-gro-forwarding.service
Result=success
ExecMainStatus=0
```

最後再用 `ethtool -k` 看一次，`rx-udp-gro-forwarding: on` 就完成了。

這個做法只在開機時執行一次。如果網卡之後被重新設定或熱插拔，設定可能會被重設，到時要手動再跑一次 service，或改用 networkd-dispatcher、udev rule 這類跟著介面事件觸發的機制。

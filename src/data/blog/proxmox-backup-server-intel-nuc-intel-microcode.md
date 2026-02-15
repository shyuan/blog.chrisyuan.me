---
title: "解決 Proxmox Backup Server 在舊款 Intel NUC 上的開機問題：Intel Microcode 更新指南"
pubDatetime: 2025-11-25T16:12:33.000Z
slug: "proxmox-backup-server-intel-nuc-intel-microcode"
description: "前言 最近撿到一台 2016 年推出的 MSI Cubi 2 NUC（內部代號 MS-B142），搭載第七代 Intel® Core™ i5-7200U 處理器、DDR4 16GB 記憶體、128GB M.2 2242 SSD 和 1TB 7200 轉傳統硬碟（皆為 SATA 介面）。原本打算將它作為 Proxmox Backup Server (PBS) 4.0 來備份 PVE 環境的 VM 和"
tags:
  - intel-microcode
  - proxmox-backup-server
  - nuc
---

## Table of contents

# 前言

最近撿到一台 2016 年推出的 MSI Cubi 2 NUC（內部代號 MS-B142），搭載第七代 Intel® Core™ i5-7200U 處理器、DDR4 16GB 記憶體、128GB M.2 2242 SSD 和 1TB 7200 轉傳統硬碟（皆為 SATA 介面）。原本打算將它作為 Proxmox Backup Server (PBS) 4.0 來備份 PVE 環境的 VM 和 LXC，卻在安裝後遇到無法正常開機的問題。

# 問題描述

安裝 PBS 4.0 (基於 Debian 13.0) 完成後，第一次開機時選擇 GRUB 的正常啟動模式會卡住不動，螢幕最後顯示的訊息為：

```
Loading initial ramdisk
```

但選擇 Recovery Mode 卻能正常進入系統，這表示系統本身沒有問題，而是某些開機參數導致無法正常載入。

# 診斷過程

## 初步排查

透過調整 `/etc/default/grub` 中的 `GRUB_CMDLINE_LINUX_DEFAULT` 參數，並移除 `quiet` 參數以顯示詳細開機訊息，發現以下關鍵錯誤：

```
[Firmware Bug]: TSC_DEADLINE disabled due to Errata: please update microcode to version: 0x52 (or later)
```

這個錯誤訊息指出 Intel Kaby Lake 架構（包括 i5-7200U）存在已知的硬體錯誤，需要更新 CPU Microcode 才能正常運作。

## 臨時解決方案

在 `/etc/default/grub` 中加入停用 Microcode 載入的參數：

```bash
GRUB_CMDLINE_LINUX_DEFAULT="quiet dis_ucode_ldr"
```

執行 `update-grub` 後重新開機，系統確實能正常啟動，但這只是暫時的 workaround，並未解決根本問題。

# 根本原因分析

檢查目前的 [Intel Microcode](https://en.wikipedia.org/wiki/Intel_microcode) 版本：

```bash
cat /proc/cpuinfo | grep microcode
# 顯示：microcode : 0x2a
```

版本 `0x2a` (十進位 42) 遠低於系統要求的最低版本 `0x52` (十進位 82)。這是導致 TSC_DEADLINE 功能無法使用，進而造成開機問題的根本原因。

## Intel Microcode 版本追蹤

根據 Intel 官方 [GitHub Repository](https://github.com/intel/Intel-Linux-Processor-Microcode-Data-Files) 的 Release Notes，i5-7200U (代號 KBL-U，F-M-S: 06-8e-09) 的 Microcode 更新歷史如下：

| Release Date | Version | 說明         |
| ------------ | ------- | ------------ |
| 2019-03-12   | 0x9a    | 早期安全修補 |
| 2019-05-14   | 0xb4    | MDS 漏洞修補 |
| 2019-11-12   | 0xc6    | 額外安全更新 |
| 2019-11-15   | 0xca    | 穩定性改善   |
| 2020-06-09   | 0xd6    | 進一步優化   |
| 2020-11-10   | 0xde    | 安全性增強   |
| 2021-06-08   | 0xea    | 新漏洞修補   |
| 2022-02-07   | 0xec    | 持續改善     |
| 2022-05-10   | 0xf0    | 效能優化     |
| 2023-05-12   | 0xf2    | 安全更新     |
| 2023-08-08   | 0xf4    | 穩定性修正   |
| 2024-08-13   | 0xf6    | 最新版本     |

# 完整解決方案

## 步驟 1：更新 Intel Microcode 檔案

檢查系統已安裝的 Microcode 套件：

```bash
dpkg -l | grep intel-microcode
# 顯示：intel-microcode/stable,stable-security,now 3.20240813.1~deb13u1 amd64
```

確認 Microcode 檔案存在：

```bash
ls -la /lib/firmware/intel-ucode/
# 應該看到 06-8e-09 或 06-8e-09.initramfs
```

如果檔案名稱有 `.initramfs` 後綴，建立符號連結：

```bash
cd /lib/firmware/intel-ucode/
ln -sf 06-8e-09.initramfs 06-8e-09
```

## 步驟 2：設定 Early Loading 機制

建立 `/etc/default/intel-microcode` 配置檔：

```bash
cat > /etc/default/intel-microcode << EOF
# Enable early loading - 確保 Microcode 在核心載入前更新
IUCODE_TOOL_INITRAMFS=early
# Auto-scan CPU - 自動選擇適合的 Microcode
IUCODE_TOOL_SCANCPUS=yes
EOF
```

## 步驟 3：移除 Microcode 黑名單

Debian/Proxmox 預設會黑名單 Microcode 模組以避免 late loading 造成的不穩定。但這也會阻止 Microcode 更新：

```bash
nano /etc/modprobe.d/intel-microcode-blacklist.conf
```

將 `blacklist microcode` 這行註解掉：

```bash
# blacklist microcode
```

**重要提醒**：只改變檔案副檔名（如 .conf.disabled）是無效的，`modprobe.d` 目錄下所有檔案都會被讀取，必須註解內容或移除檔案。

## 步驟 4：重建 initramfs

```bash
update-initramfs -u -k all
```

驗證 Microcode 已正確包含在 initramfs 中：

```bash
lsinitramfs /boot/initrd.img-$(uname -r) | grep GenuineIntel.bin
# 應該顯示：kernel/x86/microcode/GenuineIntel.bin
```

## 步驟 5：移除臨時 workaround

編輯 `/etc/default/grub`，恢復正常設定：

```bash
GRUB_CMDLINE_LINUX_DEFAULT="quiet"
```

更新 GRUB 配置：

```bash
update-grub
```

## 步驟 6：重新開機並驗證

重新開機後，確認 Microcode 已成功更新：

```bash
# 檢查 Microcode 版本
cat /proc/cpuinfo | grep microcode
# 應該顯示：microcode : 0xf6

# 確認 TSC_DEADLINE 正常運作
dmesg | grep -i tsc_deadline
# 不應該再看到錯誤訊息

# 查看 Microcode 載入訊息
dmesg | grep microcode
# 應該看到：microcode updated early to revision 0xf6, date = 2024-02-01
```

# 技術原理說明

## 為什麼需要 Early Loading？

Intel Microcode 更新有兩種載入時機：

1. **Early Loading**（推薦）：在核心載入前更新，最安全穩定
2. **Late Loading**（不推薦）：系統啟動後更新，可能造成不穩定或當機

## TSC_DEADLINE 是什麼？

TSC_DEADLINE 是 Local APIC 計時器的進階功能，提供更精確的計時機制。Kaby Lake 世代的 CPU 因硬體錯誤需要 Microcode 修正才能安全使用此功能。

## 為什麼老硬體會有這個問題？

1. 舊款主機板的 BIOS 停止更新，內建 Microcode 版本過舊
2. 新版作業系統需要較新的 Microcode 才能正常運作
3. 安全漏洞修補（如 Spectre、Meltdown）需要 Microcode 更新

# 結論

這次的經驗讓我深刻體會到，在老舊硬體上安裝新系統時，CPU Microcode 更新是容易被忽略但極其重要的一環。透過正確配置 early loading 機制並移除不必要的黑名單設定，即使是 2016 年的硬體也能順利運行最新的 Proxmox Backup Server 4.0。

希望這篇文章能幫助遇到類似問題的朋友，特別是在維護老舊設備時，別忘了檢查並更新 CPU Microcode！

# 參考資料

- [Intel Microcode GitHub Repository](https://github.com/intel/Intel-Linux-Processor-Microcode-Data-Files)
- [Intel Core i5-7200U 規格](https://www.intel.com.tw/content/www/tw/zh/products/sku/95443/intel-core-i57200u-processor-3m-cache-up-to-3-10-ghz/specifications.html)
- [MSI Cubi 2 規格](https://tw.msi.com/Desktop/Cubi-2/Specification)
- [Debian Intel Microcode Package](https://packages.debian.org/bookworm/intel-microcode)
- [Proxmox Backup Server Documentation](https://pbs.proxmox.com/docs/)

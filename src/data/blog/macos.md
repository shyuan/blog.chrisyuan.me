---
title: "macOS 的虛擬記憶體機制"
pubDatetime: 2025-06-11T08:43:03.000Z
slug: "macos"
description: "虛擬記憶體的基本概念 在現代作業系統中，虛擬記憶體（Virtual Memory）是一項重要的記憶體管理技術。它的主要用途是讓系統能夠執行超過實體記憶體（RAM）容量的程式。當實體記憶體不足時，作業系統會將暫時不使用的資料從記憶體移到硬碟上的特定區域，需要時再載入回來，這個過程稱為「記憶體交換」（Memory Swapping）。 虛擬記憶體不僅解決了記憶體不足的問題，還提供了記憶體保護機制，讓每"
tags:
  - macOS
  - virtual-memory
  - swap
---

# 虛擬記憶體的基本概念

在現代作業系統中，[虛擬記憶體](https://zh.wikipedia.org/zh-tw/%E8%99%9A%E6%8B%9F%E5%86%85%E5%AD%98)（[Virtual Memory](https://en.wikipedia.org/wiki/Virtual_memory)）是一項重要的記憶體管理技術。它的主要用途是讓系統能夠執行超過實體記憶體（RAM）容量的程式。當實體記憶體不足時，作業系統會將暫時不使用的資料從記憶體移到硬碟上的特定區域，需要時再載入回來，這個過程稱為「記憶體交換」（Memory Swapping）。

虛擬記憶體不僅解決了記憶體不足的問題，還提供了記憶體保護機制，讓每個程式都擁有獨立的記憶體空間，避免程式之間互相干擾。

# macOS 的 Swap 機制

在 macOS 中，用於虛擬記憶體的交換檔案（Swap file）統一存放在 `/System/Volumes/VM` 目錄下。這個目錄通常對一般使用者是隱藏的，需要特殊權限才能查看。

macOS 的 swap 機制有個獨特的設計：系統會根據需要動態建立多個 1GB 大小的 swap file。舉例來說，如果系統需要 3GB 的交換空間，就會在該目錄下產生 3 個名為 `swapfile0`、`swapfile1`、`swapfile2` 的檔案，每個都是 1GB。

```bash
bash-5.2$ ls -lh /System/Volumes/VM/
total 20971520
-rw-------  1 root  wheel   1.0G  6  9 10:57 swapfile0
-rw-------  1 root  wheel   1.0G  6  9 11:11 swapfile1
-rw-------  1 root  wheel   1.0G  6  9 11:20 swapfile2
-rw-------  1 root  wheel   1.0G  6  9 12:31 swapfile3
-rw-------  1 root  wheel   1.0G  6 11 09:23 swapfile4
-rw-------  1 root  wheel   1.0G  6  9 15:05 swapfile5
-rw-------  1 root  wheel   1.0G  6  9 22:18 swapfile6
-rw-------  1 root  wheel   1.0G  6 10 10:09 swapfile7
-rw-------  1 root  wheel   1.0G  6 11 09:40 swapfile8
-rw-------  1 root  wheel   1.0G  6 11 15:54 swapfile9
```

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1749631309439/79c660c5-2713-41f2-aa76-7e3c70953aef.png align="center")

這種動態管理機制相當智慧——當您開啟較多應用程式，實體記憶體不敷使用時，macOS 會自動增加 swap file 的數量；反之，當記憶體壓力減輕後，系統也會適時清理不需要的 swap file，釋放硬碟空間。

# 實際應用

在日常使用中，如果您發現 Mac 執行速度變慢，可以透過「活動監視器」查看記憶體壓力。當看到「已使用交換」（Swap Used）顯示數值時，就表示系統正在使用虛擬記憶體。雖然 swap 機制能讓我們執行更多程式，但由於硬碟存取速度遠低於記憶體，過度依賴 swap 會明顯影響系統效能。因此，如果經常看到大量 swap 使用，可能就是該考慮增加實體記憶體的時候了。

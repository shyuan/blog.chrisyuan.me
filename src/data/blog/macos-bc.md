---
title: "深入瞭解 macOS 上的命令列計算機工具 bc"
pubDatetime: 2025-05-08T14:21:05.000Z
slug: "macos-bc"
description: "bc 的歷史背景 bc 的全名是「basic calculator」或「bench calculator」，是一個支援任意精度運算的計算器語言。它的歷史可以追溯到 1975 年，首次出現在 Version 6 Unix 中。當時由貝爾實驗室的 Lorinda Cherry 開發，作為另一個計算器程式 dc(desk calculator) 的前端介面。 dc 使用的是反波蘭記法(Reverse P"
tags:
  - bc
  - macOS
  - open-source
  - cli
  - calculator
---

## Table of contents

# bc 的歷史背景

[bc](<https://en.wikipedia.org/wiki/Bc_(programming_language)>) 的全名是「basic calculator」或「bench calculator」，是一個支援任意精度運算的計算器語言。它的歷史可以追溯到 1975 年，首次出現在 [Version 6 Unix](https://en.wikipedia.org/wiki/Version_6_Unix) 中。當時由貝爾實驗室的 Lorinda Cherry 開發，作為另一個計算器程式 [dc(desk calculator)](<https://en.wikipedia.org/wiki/Dc_(computer_program)>) 的前端介面。

`dc` 使用的是[反波蘭記法(Reverse Polish Notation)](https://en.wikipedia.org/wiki/Reverse_Polish_notation)，輸入方式對一般使用者來說較為陌生。而 `bc` 則提供了類似 C 語言的語法，讓使用者能以更直觀的方式進行計算。

# 不同的 bc 實作版本

隨著時間發展，`bc` 衍生出了幾個不同的實作版本：

## 1. 傳統 Unix 實作

最初的 `bc` 實作是作為 `dc` 的前端，將 bc 程式碼轉換成 dc 指令。這個版本仍然存在於一些 Unix 和 Plan 9 系統中。

## 2. GNU bc

[GNU bc](https://www.gnu.org/software/bc/) 由 Philip A. Nelson 開發，首次發布於 1991 年。這個版本不再是 `dc` 的前端，而是一個獨立的位元組碼直譯器，使用 C 語言編寫。GNU bc 在 GPL3 授權下發布，並加入了許多擴展功能，如：

- 支援多字元的變數名稱
- 添加了 `&&`、`||`、`!` 等邏輯運算子
- `if` 語句可以使用 `else` 子句
- 新增 `print` 語句用於輸出

值得注意的是，GNU bc 在 2017 年 4 月發布 1.07.1 版後，曾經有將近 8 年沒有更新。不過就在最近，2024 年 12 月和 2025 年 1 月，GNU bc 連續發布了 1.08.0 和 1.08.1 版本，打破了長期停滯的狀態。

## 3. OpenBSD 實作

OpenBSD 在 2003 年重新實作了自己的 `bc` 版本，以符合他們對系統安全性和授權條款的要求。

## 4. Gavin Howard 的實作（macOS 採用版本）

這是 [macOS](https://en.wikipedia.org/wiki/MacOS) 上使用的版本，由 [Gavin Howard](https://github.com/gavinhoward) 個人開發，從 2018 年開始的專案。這個版本採用 BSD 授權，具有以下特點：

- 完全相容 POSIX 標準，同時實作了 GNU 擴展和 BSD 的點號（.）擴展
- 用同一個執行檔同時提供 `bc` 和 `dc` 功能（透過符號連結）
- 在效能和穩定性上有許多改進
- 提供更完善的錯誤處理
- 支援更多的數學函數擴展

見 [gavinhoward/bc @ GitHub](https://github.com/gavinhoward/bc)

# macOS 上的 bc

根據作者 Gavin Howard 在部落格中的說明，他的 `bc` 實作是[從 macOS 13 Ventura 開始被 Apple 收錄進 macOS](https://gavinhoward.com/2023/02/my-code-conquered-another-os/)的。在此之前，macOS 使用的是其他版本。

截至 2025 年，查看各版本的狀況：

- macOS 13.2.1 搭載的是 4.0.2 版
- macOS 14.4 已更新到 6.5.0 版
- macOS 15.4 更新到 6.7.6 版

macOS 採用的 bc 版本對應可參考 [Apple Open Source](https://opensource.apple.com/releases/) 和 [apple-oss-distributions/bc @ GitHub](https://github.com/apple-oss-distributions/bc)

這個版本也被 FreeBSD 採用，在 FreeBSD 13.3-RELEASE 中成為預設版本。目前這個專案持續活躍開發中，最新版本是 6.4.0（2024年釋出）。

# 與其他工具的比較

雖然有許多命令列計算工具（如 Python、dc、expr 等），`bc` 仍有其獨特優勢：

1. 任意精度運算（不受浮點數精度限制）
2. 類 C 語言語法，易於學習
3. 輕量級，啟動快速
4. 幾乎在所有 Unix-like 系統上都可用
5. 可編寫腳本，支援函數和流程控制

# 結語

`bc` 雖然是一個古老的工具，但它的設計理念和功能在今天仍然實用。特別是 macOS 採用的 Gavin Howard 實作版本，不僅保持了與傳統的相容性，還加入了現代化的改進。對於經常需要在終端機進行計算的使用者來說，熟悉 `bc` 絕對能提升工作效率。

而令人興奮的是，原本被認為已經停止開發的 GNU bc，在沉寂近 8 年後，最近又有了新的更新，顯示這個經典工具仍然保有生命力。這也反映了命令列工具在現代計算環境中的持續重要性。

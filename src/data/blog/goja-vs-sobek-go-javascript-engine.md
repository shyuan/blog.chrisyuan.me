---
pubDatetime: 2026-11-24T05:30:00Z
title: "goja 與 sobek 差在哪？Go 嵌入 JavaScript 引擎的選擇指南"
slug: "goja-vs-sobek-go-javascript-engine"
featured: false
draft: false
tags:
  - go
  - javascript
  - k6
description: "goja 與 sobek 是同一顆 Go 版 JavaScript 引擎：sobek 是 Grafana 為 k6 維護的分支，差別在實驗性的 ESM。本文比較規範、效能、API 與維護，並給出選擇建議。"
---

在 Go 裡嵌入 JavaScript 引擎，最常被提到的是 [goja](https://github.com/dop251/goja)。做負載測試、用過 [k6](https://github.com/grafana/k6) 的人，則多半聽過 [sobek](https://github.com/grafana/sobek)。很多人以為這是兩款競品，其實 sobek 是 goja 的 fork，到今天還由同一批人同步維護。

這篇文章把兩者的關係、規範支援、效能、API 與遷移成本拆開來看，最後給出選擇建議。文中的 GitHub 數據都是 2026-11-24 當天查得。

## Table of contents

## 緣起：同一套引擎的兩個名字

goja 由 Dmitry Panov（GitHub 帳號 [dop251](https://github.com/dop251)）從 2016 年 11 月開始開發，是純 Go 實作的 ECMAScript 引擎，靈感來自另一個 Go JS 引擎 otto。它長年是 Go 生態裡「把 JS 嵌進 Go 程式」的主要選項之一。

sobek 晚得多。從 git 歷史看，Grafana 在 2024 年 6 月 6 日建立 `grafana/sobek` 儲存庫，6 月 10 日的提交訊息是「Rename to sobek」。它不是用 GitHub 的 fork 按鈕分出來的（API 回報 `fork: false`），而是另開儲存庫、把 goja 的完整 git 歷史整包放進去，所以兩邊最早的提交都是 2016-11-04 的「Initial commit」。sobek 的 README 開頭也直接寫明這個專案是 goja 的 fork。

分家的原因寫在 README：ESM（ECMAScript Modules）支援是為了 k6 的需求而實作的。ESM 在 2024 年 7 月 8 日以「Modules (#1)」合併進 sobek，goja 至今沒有模組功能。

維護方式也值得一提。Dmitry Panov 本人在兩個儲存庫都持續提交，是兩邊最大的貢獻者。引擎核心的新功能與修復多半先發生在 goja，再由 sobek 定期以「Merge goja master into Sobek」拉進來。同步是單向的（goja → sobek），sobek 的 AGENTS.md 還規定合併上游只能用 merge commit，不能 rebase 或 squash。所以 sobek 不是無人照看的 fork，而是 k6 團隊與原作者一起維護的另一條長期分支。

兩者都是 MIT 授權。

## 規範支援：同一顆引擎，差在模組

兩者核心程式碼同源，JavaScript 語言能力基本一致：

- 完整支援 ECMAScript 5.1，含 strict mode 與完整的正規表示式。
- 支援大部分 ES6 功能，README 說這部分仍在進行中。
- 已實作的功能，幾乎都通過 [test262](https://github.com/tc39/test262)。兩個儲存庫的 `.tc39_test262_checkout.sh` 目前指向同一個 test262 提交，測試基準相同。README 只寫「nearly all」，沒有可引用的通過率百分比。
- 近年的新功能兩邊都有，例如 `Object.groupBy`、`Map.groupBy`、`ArrayBuffer.prototype.transfer`、`String.prototype.isWellFormed`、Iterator helpers、`Promise.try`、`Promise.withResolvers`、`RegExp.escape`，還有仍在提案階段的 `Float16Array`、`Math.sumPrecise`、`Map.prototype.getOrInsert`。各功能屬於哪一版規範，這裡不逐項標註，請以 TC39 的提案進度為準。

語言層面真正的差異只有一個：**ESM 只在 sobek**。sobek 支援 `import`／`export`、動態 `import()`、`import.meta`，模組內也有 top-level await。goja 的 parser 不認得 import／export 語法，只能執行傳統 script。

sobek 的 ESM 是實驗性的。README 說它的 API 貼近規範術語（`ModuleRecord`、`Link()`、`Evaluate()`），但很可能以 breaking 的方式改版。它沒有正式文件，想用得去讀 `modules_test.go` 與 `modules_integration_test.go`。引擎也不提供 event loop，要用 ESM（尤其是 top-level await 與動態 import）就得自己實作，k6 就是在引擎之上自建了一套。

兩者的已知不相容處也一樣，因為是同一份程式碼。`JSON.parse` 處理不了壞掉的 UTF-16 代理對，`Date` 則因為 Go 標準庫用 int 而非 float，溢出時會算錯。

## 效能：共用核心，差異可忽略

我沒找到任何官方基準測試直接比較 goja 與 sobek。但兩者的引擎核心（parser、compiler、VM、內建物件）除了版本落差以外是同一份程式碼，效能最佳化也是同一批提交，例如 lazy string concatenation、TypedArray 索引重構，兩邊都吃得到。所以對傳統 script 來說，兩者效能可以視為相同。

這個結論是從程式碼推論的，不是實測。如果你要在文件或選型報告裡寫效能數字，請自己跑一次 benchmark。

唯一可能有差的是 sobek 的 ESM 路徑，多了模組連結與求值的成本，但那是用不用模組的代價，不是引擎好壞。

若硬要找差異，只剩版本落差。以 2026-11-22 的 goja HEAD 來看，sobek 約落後 2.5 週、34 個提交還沒合入（最後一次合併上游是 2026-11-05），其中有 TypedArray 的安全修復與 `parseInt` 精度重構。這會在下次合併時消失。

## API 差異與遷移成本

核心 API（`Runtime`、`Compile`、`RunProgram`、`Object`／`Value` 轉換、`ConstructorCall` 等）兩邊相同，遷移主要是改名：

| 項目                                                                        | goja                     | sobek                           |
| --------------------------------------------------------------------------- | ------------------------ | ------------------------------- |
| module path                                                                 | `github.com/dop251/goja` | `github.com/grafana/sobek`      |
| package 名稱                                                                | `goja`                   | `sobek`                         |
| ESM API                                                                     | 無                       | 有（實驗性，可能 breaking）     |
| [goja_nodejs](https://github.com/dop251/goja_nodejs)（event loop、require） | 生態內可用               | 不相依（k6 自建 event loop）    |
| 附帶 REPL（`goja/` 子目錄）                                                 | 有                       | 無                              |
| 版本 tag／release                                                           | 無（以 commit 釘版）     | 無（k6 以 pseudo-version 釘版） |
| 授權                                                                        | MIT                      | MIT                             |
| 最低 Go 版本                                                                | 1.26                     | 1.26                            |

從 goja 遷移到 sobek 的實際成本，看你的用法：

- **只跑 script 的專案**：批次替換 import path 與 `goja.` 前綴即可，API 幾乎不用動。
- **依賴 goja_nodejs 的專案**（用它的 eventloop 或 `require`）：sobek 沒有這層相依，得自己實作事件迴圈與模組載入，或改用 sobek 的實驗性模組 API。這是遷移成本最高的情境。
- **反過來從 sobek 退回 goja**：會直接失去 ESM，模組相關程式碼必須整段移除或改寫。

兩個儲存庫都不打版本 tag，正式專案應該以 commit hash 釘住相依版本。k6 對 sobek 就是這樣做的，[v1.4.0 的 go.mod](https://github.com/grafana/k6/blob/v1.4.0/go.mod) 可以看到對 `github.com/grafana/sobek` 的 pseudo-version 相依。

## 維護狀態與社群

兩者都很活躍，但背景不同：

| 指標       | goja                 | sobek                                       |
| ---------- | -------------------- | ------------------------------------------- |
| 建立       | 2016-11-04           | 2024-06-06                                  |
| 星數       | 約 7,200             | 約 370                                      |
| fork 數    | 517                  | 24                                          |
| 開放 issue | 42                   | 29                                          |
| 最近推送   | 2026-11-22           | 2026-11-24                                  |
| 主要推手   | Dmitry Panov（個人） | Grafana 組織（Dmitry Panov 同為最大提交者） |

goja 是社群導向的上游，歷史長、周邊生態大（goja_nodejs 等），修復最先落地。sobek 則走 Grafana 的企業維護流程：用 Renovate 自動升級依賴（含安全修復）、CI 的 GitHub Actions 以 SHA 釘版、有 CODEOWNERS 與 Backstage 的 `catalog-info.yaml`，貢獻者名單也和 goja 高度重疊。

對使用者來說，想要最新的修復看 goja，想要 ESM 看 sobek，兩者之間的正常延遲大約數週。

## 怎麼選

- **需要 ESM，或要與 k6 生態對齊**（例如寫 k6 擴充、做模組化的嵌入系統）：選 sobek。這是它唯一的差異化功能，但要接受 API 可能 breaking，而且得自備 event loop。
- **一般的「在 Go 裡跑 JS」場景**（設定腳本、規則引擎、外掛腳本）：選 goja。上游修復最快、社群最大、eventloop 與 require 等周邊現成。
- **在意效能**：不必以此選擇，兩者可視為相同。
- **已經在用 goja**：除非需要 ESM，否則沒有遷移的必要。真要遷移，script 用途只需改名。

兩者共通的限制也要先知道：都不提供 event loop 與 timer（`setTimeout` 要自己接）；Runtime 不是 goroutine 安全的；物件不能跨 Runtime 傳遞；中斷執行要用 `Interrupt()`，不是 context 取消。

簡單說，goja 是上游主幹，sobek 是 k6 陣營的長期分支，同一顆引擎，多了一個實驗性的模組系統。需要 ESM 就選 sobek，否則用 goja。

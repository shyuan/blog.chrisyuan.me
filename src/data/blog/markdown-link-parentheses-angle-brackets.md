---
pubDatetime: 2026-09-17T03:35:18Z
title: "Markdown 連結網址含括號時，用角括號包起來"
slug: "markdown-link-parentheses-angle-brackets"
tags:
  - markdown
  - prettier
  - til
description: "Markdown 連結網址若含未成對括號或空白會解析失敗，把網址包進 <> 即可。CommonMark 規格允許這種寫法，Prettier 也會自動把含括號的網址改成角括號形式。"
draft: false
---

前幾天發一篇文章，commit 之後發現兩個維基百科連結被改了：`[Chandler](https://en.wikipedia.org/wiki/Chandler_(software))` 變成 `[Chandler](<https://en.wikipedia.org/wiki/Chandler_(software)>)`。改的是 lint-staged 裡的 Prettier。我原本以為是工具弄壞了連結，查了之後發現這是 CommonMark 規格裡的正式寫法。遇到括號不成對或含空白的網址，也應該改用這種寫法。

## Table of contents

## 網址裡的括號什麼時候會出問題

[CommonMark 規格](https://spec.commonmark.org/0.31.2/#link-destination)對連結網址（link destination）有兩種寫法。不加角括號時，網址不能含空白，括號也只能以成對的形式出現，或是用反斜線跳脫。加上角括號時，裡面除了換行和未跳脫的 `<`、`>`，什麼都可以放。

維基百科的 `Chandler_(software)` 括號剛好成對，所以不加角括號也能正確解析。麻煩的是括號不成對、或網址有空白的情況。下面是我用這個部落格實際使用的 remark + remark-gfm 跑出來的結果：

```markdown
[A](https://example.com/a_(b)
<!-- 連結失效：整段變成純文字，只有網址被 GFM 自動連結 -->

[A](https://example.com/a)_b)
<!-- 網址被截在第一個 )，變成 https://example.com/a，後面的 _b) 留在正文 -->

[A](https://example.com/my file.pdf)
<!-- 遇到空白就斷掉，連結失效 -->
```

改成角括號之後都正常：

```markdown
[A](https://example.com/a_(b)
<!-- href="https://example.com/a_(b" -->

[A](<https://example.com/a)_b>)
<!-- href="https://example.com/a)_b" -->

[A](<https://example.com/my file.pdf>)
<!-- href="https://example.com/my%20file.pdf" -->
```

角括號不算網址的一部分，輸出的 HTML 裡不會出現 `<` 和 `>`。

另外兩種做法也行：用反斜線跳脫，例如 `[A](https://example.com/a\)_b)`；或把括號寫成 percent-encoding 的 `%28`、`%29`。反斜線寫法讀起來比較亂，percent-encoding 則會讓原始檔裡的網址和瀏覽器網址列上看到的不一樣，之後要搜尋或比對比較麻煩。角括號只是在網址前後各加一個字元，原本的網址不用動。

## Prettier 為什麼會自動改

Prettier 格式化 Markdown 時，會用 [`printUrl`](https://github.com/prettier/prettier/blob/2ee9998fc3423eb62b29267011a51eee8dca8773/src/language-markdown/print/mdast.js#L464-L484) 重新輸出連結網址。只要網址含空白、控制字元、以 `<` 開頭，或是（行內連結與圖片的情況下）含任何 `(` 或 `)`，就一律包上角括號，括號成對也一樣。

所以看到 diff 裡多出 `](<...>)` 不用改回去，渲染結果完全一樣。要確認的話，build 之後查輸出 HTML 裡的 `href` 就知道。

我在本機重現時還踩到一個小坑：這個專案的 `.prettierignore` 先忽略根目錄所有檔案，再把 `src/` 等目錄加回來。我把測試檔放在專案根目錄跑 `prettier`，輸出和輸入一模一樣，差點以為 Prettier 根本不會改。把測試檔移到 `src/` 底下才重現出來。

## 順帶一提：裸網址後面別直接接全形括號

同一篇文章裡還有另一個連結問題。參考資料寫成這樣：

```markdown
https://example.com/a.html（說明）
```

GFM 的[自動連結擴充](https://github.github.com/gfm/#autolinks-extension-)遇到空白或 `<` 才結束網址，全形括號不在其中，結果「（說明）」整段被當成網址的一部分，href 變成一串 percent-encoded 的中文。網址和括號之間補一個半形空格就解決了：

```markdown
https://example.com/a.html （說明）
```

寫中文時這個比較容易踩到，因為中文句子裡習慣不在括號前加空格。

## 參考資料

- [CommonMark Spec 0.31.2：Link destination](https://spec.commonmark.org/0.31.2/#link-destination)
- [GitHub Flavored Markdown Spec：Autolinks (extension)](https://github.github.com/gfm/#autolinks-extension-)
- [Prettier 原始碼：`printUrl`](https://github.com/prettier/prettier/blob/2ee9998fc3423eb62b29267011a51eee8dca8773/src/language-markdown/print/mdast.js#L464-L484)
- [Prettier 文件：Ignoring Code](https://prettier.io/docs/ignore)

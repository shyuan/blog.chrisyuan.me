---
pubDatetime: 2026-02-23T00:00:00+08:00
title: "用 .gitignore 追蹤空目錄，別再用 .gitkeep 了"
slug: "git-track-empty-directory-with-gitignore"
tags:
  - git
  - til
description: "Git 不追蹤空目錄，常見做法是放一個 .gitkeep 檔案。但 .gitkeep 不是 Git 規格的一部分，更好的方式是在目錄裡放一個特殊的 .gitignore，既能保留目錄又不需要額外的忽略規則。"
draft: false
---

## Table of contents

## 問題：Git 不追蹤空目錄

Git 只追蹤檔案，不追蹤目錄。如果專案中需要一個空目錄（例如 `build/`、`tmp/`、`uploads/`），clone 下來後這個目錄不會存在，可能導致應用程式出錯。

## 常見做法：`.gitkeep`

最常見的解決方式是在目錄裡放一個空的 `.gitkeep` 檔案：

```
build/
└── .gitkeep
```

然後在專案根目錄的 `.gitignore` 加上：

```gitignore
/build/*
!/build/.gitkeep
```

這樣做有幾個問題：

- **`.gitkeep` 不是 Git 規格的一部分**——它只是社群約定成俗的命名，Git 本身完全不認識這個檔案。新進成員看到可能會困惑
- **需要維護兩個地方**——目錄裡的 `.gitkeep` 和根目錄的 `.gitignore` 都要設定
- **目錄改名時容易忘記更新** `.gitignore` 中的路徑

## 更好的做法：目錄內的 `.gitignore`

在要追蹤的目錄裡放一個 `.gitignore`，內容只有兩行：

```gitignore
*
!.gitignore
```

就這樣。不需要修改專案根目錄的 `.gitignore`，不需要任何額外設定。

```
build/
└── .gitignore    # 內容：*\n!.gitignore
```

### 原理

- `*` 忽略這個目錄下的所有檔案
- `!.gitignore` 但排除 `.gitignore` 自己，讓它能被 Git 追蹤

因為 `.gitignore` 本身被追蹤，Git 就會保留這個目錄。同時目錄內的其他檔案都會被忽略，達到「追蹤空目錄」的效果。

### 建立方式

```bash
printf '*\n!.gitignore\n' > build/.gitignore
```

## 為什麼這個方式更好

- **只需一個檔案**——不用同時維護 `.gitkeep` 和根目錄的 `.gitignore`
- **目錄改名時自動跟著走**——規則寫在目錄內部，不受外部路徑影響
- **使用標準的 Git 機制**——`.gitignore` 是 Git 規格內的標準功能，不是自創的慣例

## 話說回來，`.gitkeep` 真的那麼差嗎？

這個技巧確實巧妙，但公平地說，`.gitkeep` 也沒那麼糟：

- `.gitkeep` 雖然不在 Git 規格內，但已經是廣泛被理解的慣例，GitHub 上大量專案都在用
- 如果目錄裡本來就不需要忽略任何東西（純粹是個空的 placeholder 目錄），`.gitkeep` 的意圖反而更直覺——一看就知道「這個檔案只是為了讓 Git 追蹤這個目錄」
- `.gitignore` 方式需要打開檔案才能理解它的用途，乍看會以為目錄裡有東西需要被忽略

另外，現代框架和工具大多會在啟動時自動建立需要的目錄（`mkdir -p`），CI/CD pipeline 通常也會在 build 前自己建目錄，很多時候根本不需要 Git 來保留空目錄。

### 什麼時候該用哪個？

| 場景 | 建議做法 |
| --- | --- |
| 需要保留目錄且忽略內容（`uploads/`、`tmp/`） | `.gitignore` 方式 |
| 目錄可能會改名 | `.gitignore` 方式 |
| 純粹保留一個空目錄當 placeholder | `.gitkeep` 也行 |
| 框架或工具會自動建立目錄 | 兩個都不需要 |

總結來說，`.gitignore` 方式在需要同時「追蹤目錄」又「忽略內容」的場景下明顯更優雅。但如果只是單純保留空目錄，`.gitkeep` 的可讀性其實更好。這個技巧值得知道，但不需要把專案裡所有的 `.gitkeep` 都換掉。

## 參考資料

- [Git: Don't use .gitkeep](https://adamj.eu/tech/2023/09/18/git-dont-create-gitkeep/) — Adam Johnson

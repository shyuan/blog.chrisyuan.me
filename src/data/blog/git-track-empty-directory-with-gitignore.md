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

## 參考資料

- [Git: Don't use .gitkeep](https://adamj.eu/tech/2023/09/18/git-dont-create-gitkeep/) — Adam Johnson

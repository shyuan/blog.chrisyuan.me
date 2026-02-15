---
title: "Global gitignore"
pubDatetime: 2020-10-22T05:03:56.000Z
slug: "global-gitignore"
description: "用 JetBrains 產品 IDE 開專案時，會在專案目錄下建一個 .idea 目錄，存放 JetBrains 專案相關的設定檔，由於不是所有開發的成員都會使用 JetBrains 進行開發，所以這個目錄下的內容不需要進 git version control，也不需要放進 .gitignore 裡，而是使用 JetBrains 開發的成員，設定 git global ignore exclud"
---

## Table of contents

用 JetBrains 產品 IDE 開專案時，會在專案目錄下建一個 `.idea` 目錄，存放 JetBrains 專案相關的設定檔，由於不是所有開發的成員都會使用 JetBrains 進行開發，所以這個目錄下的內容不需要進 git version control，也不需要放進 .gitignore 裡，而是使用 JetBrains 開發的成員，設定 git global ignore exclude 過濾掉 `.idea`，讓 git 忽略這邊產生的檔案

- [Global gitignores](https://augustl.com/blog/2009/global_gitignores/)
- [Configuring ignored files for all repositories on your computer](https://docs.github.com/en/free-pro-team@latest/github/using-git/ignoring-files#configuring-ignored-files-for-all-repositories-on-your-computer)
- [How to manage projects under Version Control Systems](https://intellij-support.jetbrains.com/hc/en-us/articles/206544839)
- [全域範圍 global .gitignore](https://clouding.city/git/global-gitignore/)
- [How to gitignore .idea files](https://intellij-support.jetbrains.com/hc/en-us/community/posts/115000154070-How-to-gitignore-idea-files)

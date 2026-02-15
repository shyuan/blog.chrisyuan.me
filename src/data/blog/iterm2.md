---
title: "iTerm2 的獨特雙平台開發模式"
pubDatetime: 2025-05-08T05:32:46.000Z
slug: "iterm2"
description: "在 macOS 平台上，如果要選擇終端機工具，iTerm2 絕對是首選。這款軟體採用了一種獨特的社群開發模式，同時運用 GitHub 和 GitLab 兩個平台進行協作。 維護者 George Nachman 對此做出了明確的分工安排：開發者若想為 iTerm2 貢獻程式碼，可以在 iTerm2 的 GitHub repository 發起 Pull Request；但如果要回報錯誤或查閱 Wik"
tags:
  - iTerm2
  - GitHub
  - GitLab
---

## Table of contents

在 macOS 平台上，如果要選擇終端機工具，[iTerm2](https://iterm2.com/) 絕對是首選。這款軟體採用了一種獨特的社群開發模式，同時運用 [GitHub](https://github.com/gnachman/iTerm2) 和 [GitLab](https://gitlab.com/gnachman/iterm2) 兩個平台進行協作。

維護者 [George Nachman](https://github.com/gnachman) 對此做出了明確的分工安排：開發者若想為 iTerm2 貢獻程式碼，可以在 iTerm2 的 GitHub repository 發起 Pull Request；但如果要回報錯誤或查閱 Wiki 文件，則需前往 iTerm2 的 GitLab project。Nachman 在專案的 Readme 文件中解釋了這樣做的原因——GitHub 對於附件檔案的支援較為薄弱（原本他說是完全不支援），推測這可能是出於對 GitLab 可靠性的疑慮，同時又認為 GitHub 的系統功能不夠完善，最終採取了這種雙平台並行的運作方式。

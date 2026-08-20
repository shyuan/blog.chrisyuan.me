---
pubDatetime: 2026-08-20T17:26:01+08:00
title: "git push --force-with-lease 用法：rebase 後 force push 不蓋掉同事的 commit"
slug: "git-push-force-with-lease"
tags:
  - git
  - cli
  - til
description: "git push -f 直接覆寫遠端，--force-with-lease 會先確認遠端還停在你上次看到的位置。兩者差異、Git 1.8.5 起支援、使用情境，以及背景 fetch 破壞租約時的解法。"
draft: false
---

rebase 完要把 feature branch 推上去時，手指總是很自然地打出 `git push -f`。分支只有自己在用時這樣沒事，但只要有第二個人碰過同一條分支，`-f` 就會把對方的 commit 從遠端刪掉，而且 push 成功時完全不會提醒你。`--force-with-lease` 是 Git 內建的替代品，多打幾個字元就能擋掉這類意外。

## Table of contents

## 一般的 `--force` 完全不檢查遠端狀態

平常的 `git push` 會拒絕非 fast-forward 的更新，也就是「遠端有你本地沒有的 commit」的時候。這是 Git 預設的保護。

改寫過歷史（rebase、`commit --amend`）之後，本地分支和遠端分支就會分岔，這個保護一定會擋下來：

```console
$ git push origin feature
error: failed to push some refs to '...'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. This is usually caused by another repository pushing to
hint: the same ref.
```

這時候多數人的反射動作是加 `-f`：

```console
$ git push --force origin feature
 + 1cb16f6...55846ff feature -> feature (forced update)
```

推上去了，但 `--force` 不會分辨遠端那些「你沒有的 commit」是什麼。它可能是你 rebase 前的舊版本，該覆蓋掉；也可能是同事十分鐘前推上來的新工作，不該覆蓋掉。`--force` 兩種一律照覆蓋，輸出只有一行 `forced update`，看不出剛剛壓掉了誰的東西。

## `--force-with-lease` 檢查什麼

`--force-with-lease` 一樣會繞過 fast-forward 檢查，但多做一件事：推之前先確認遠端分支還停在你上次看到的位置。

「你上次看到的位置」指的是本地的 remote-tracking ref，也就是 `refs/remotes/origin/feature`，它記錄了上一次 `git fetch`／`git pull`／`git push` 時的遠端狀態。如果遠端現在的值和它一致，代表從你上次同步到現在沒有人動過這條分支，覆蓋掉的就只有你自己的舊 commit。

官方文件把這個機制形容成租約（lease）：你沒有真的鎖住那個 ref，只是在更新的時候確認你當初的租約還有效。

同樣的情境，換成 `--force-with-lease`：

```console
$ git push --force-with-lease origin feature
 ! [rejected]        feature -> feature (stale info)
error: failed to push some refs to '...'
```

`stale info` 就是租約失效的意思，遠端的 `feature` 已經不在你以為的位置上了。這時候正確的處理是先 `git fetch`，看看多出來的是什麼，決定要 rebase 上去還是找對方談，而不是直接改用 `-f`。

### 三種寫法

| 寫法                                    | 保護範圍                   | 比對基準                       |
| --------------------------------------- | -------------------------- | ------------------------------ |
| `--force-with-lease`                    | 這次 push 會更新的所有 ref | 各自對應的 remote-tracking ref |
| `--force-with-lease=<refname>`          | 只保護指定的 ref           | 該 ref 的 remote-tracking ref  |
| `--force-with-lease=<refname>:<expect>` | 只保護指定的 ref           | 你手動指定的 commit SHA        |

第三種寫法不依賴 remote-tracking ref，可以明確寫死「遠端現在必須是這個 commit」：

```bash
git push --force-with-lease=feature:a1b2c3d origin feature
```

平常互動使用第一種就夠了。第三種主要用在腳本裡，或是下面會提到的背景 fetch 問題。

如果本地根本沒有對應的 remote-tracking ref，例如剛用 `git update-ref -d` 刪掉，或推去一個沒 fetch 過的 remote，`--force-with-lease` 不會因為「沒東西可比」就放行，一樣回 `stale info`。沒有比對基準時它選擇拒絕，這個預設方向是對的。

## 什麼版本開始支援

`--force-with-lease` 從 Git 1.8.5（2013-11-27）就有了，release notes 的原文是：

```text
"git push" learned a more fine grained control over a blunt "--force"
when requesting a non-fast-forward update with the
"--force-with-lease=<refname>:<expected object name>" option.
```

不帶 `<expect>` 的簡寫形式在 1.8.5 當時就一併支援，只是文件註明語意還可能調整。以現在的時間點來說，任何還在維護的環境都遠遠超過這個版本，包括各家 CI runner 的預設 image，不需要為了相容性猶豫。

後面會提到的 `--force-if-includes` 就新得多，是 Git 2.30（2020-12-27）才加入的。要在團隊裡推廣的話，這個才是需要確認版本的那一個。

## 什麼情境會用到

會用到的時機其實只有一種：你改寫了已經推上去的歷史。實務上常見這幾種：

- rebase 之後重推 feature branch。最常見的一種，`git pull --rebase` 或 `git rebase main` 之後 commit SHA 全部變了，一定要 force push
- `git commit --amend` 改 commit message 或補一個漏掉的檔案，然後要更新遠端的 PR
- PR review 之後用 `git rebase -i --autosquash` 把 `fixup!` 壓進去，讓 PR 的歷史保持乾淨
- 用 `git filter-repo` 之類的工具移除誤 commit 的密鑰或大檔。這種情況一定要同時輪替外洩的憑證，因為舊 commit 在別人的 clone 和 Git 託管服務的快取裡通常還撈得到
- 撤掉一次搞錯方向的 merge

反過來說，共用主幹（`main`、`develop`）上不該做這件事，不管加不加 `--with-lease`。force push 到主幹會讓所有已經 pull 過的人下次 pull 就分岔，而 `--force-with-lease` 只擋得住「遠端有你沒看過的 commit」，擋不住「別人早就把舊歷史 clone 走了」。主幹的保護應該做在伺服器端，用 GitHub／GitLab 的 protected branch 設定，或自架 Git 的 `receive.denyNonFastForwards`。

## 陷阱：背景 fetch 會偷偷幫你續約

這是 `--force-with-lease` 最容易被誤解的地方，官方文件甚至專門寫了一段警告。

租約的比對基準是 remote-tracking ref，而任何一次 `git fetch` 都會更新它。問題在於今天有太多東西會在背景自動 fetch：JetBrains IDE 的自動更新、VS Code 的 `git.autofetch`、shell prompt 外掛、`git fetch --all` 的 cronjob。

一旦背景的 fetch 先跑過，本地的 `origin/feature` 就已經指向同事的新 commit，租約被悄悄續約，這時候 `--force-with-lease` 和 `--force` 的行為完全一樣：

```console
$ git fetch origin          # IDE 在背景自己跑的，你不知道
$ git push --force-with-lease origin feature
 + 25516d4...2167cc4 feature -> feature (forced update)   # 同事的 commit 沒了
```

它並沒有壞掉，只是「你上次看到的位置」被機器代替你更新了，而你本人從來沒看過那個 commit。

### 解法：`--force-if-includes`

Git 2.30 加的 `--force-if-includes` 就是為了補這個洞。它換一個角度檢查：遠端 ref 現在指向的 commit，有沒有真的被整合進你本地的分支。做法是翻本地分支的 reflog，確認你在改寫歷史的時候，基準點確實包含了遠端當時的 tip。

同樣被背景 fetch 汙染過的情境，加上這個選項就會被擋下來：

```console
$ git push --force-with-lease --force-if-includes origin feature
 ! [rejected]        feature -> feature (remote ref updated since checkout)
error: failed to push some refs to '...'
hint: Updates were rejected because the tip of the remote-tracking branch has
hint: been updated since the last checkout. If you want to integrate the
hint: remote changes, use 'git pull' before pushing again.
```

`--force-if-includes` 必須和 `--force-with-lease` 一起用才有意義。單獨給，或是搭配 `--force-with-lease=:`，都是 no-op。

不想每次手動加的話，設成預設值：

```bash
git config --global push.useForceIfIncludes true
```

之後只要打 `--force-with-lease` 就會自動帶上，需要臨時關掉時用 `--no-force-if-includes`。

如果環境的 Git 還沒到 2.30，官方文件給的替代方案是另外開一個專門用來 push 的 remote，讓背景程序碰不到它：

```bash
git remote add origin-push $(git config remote.origin.url)
git fetch origin-push
git push --force-with-lease origin-push
```

背景的 `git fetch origin` 不會動到 `origin-push` 的 remote-tracking ref，租約就只會在你自己手動 `git fetch origin-push` 時更新。

## 其他值得知道的

`--force` 有 `-f` 這個短旗標，`--force-with-lease` 沒有對應的縮寫，這大概是它推廣不開的實際原因之一。設個 alias 比較實在：

```bash
git config --global alias.pushf 'push --force-with-lease --force-if-includes'
```

另外要記得，它保護的是遠端的 ref，不是別人的工作目錄。就算租約檢查通過，被你改寫掉的舊 commit 對於已經 pull 過的人來說還是會造成分岔。共用的分支要改寫歷史，技術上的檢查以外還是得先講一聲。

真的推錯了也還有救。被覆蓋掉的 commit 在對方的本地 repo 裡還在，`git reflog` 找得回來；GitHub 也可以從 PR 的 timeline 或 events API 撈到被 force push 掉的舊 SHA。前提是要在垃圾回收把它清掉之前處理。

## 小結

|                         | `--force` | `--force-with-lease` | `+ --force-if-includes` |
| ----------------------- | --------- | -------------------- | ----------------------- |
| 繞過 fast-forward 檢查  | 是        | 是                   | 是                      |
| 檢查遠端是否被別人推過  | 否        | 是                   | 是                      |
| 背景 fetch 之後仍有保護 | 否        | 否                   | 是                      |
| 最低 Git 版本           | 一直都有  | 1.8.5（2013）        | 2.30（2020）            |

日常要記的就兩件事：把 `git push -f` 的肌肉記憶換成 `git push --force-with-lease`，然後把 `push.useForceIfIncludes` 設成 `true`。

## 參考資料

- [git-push Documentation](https://git-scm.com/docs/git-push)：`--force-with-lease`、`--force-if-includes` 的官方說明與背景 fetch 警告
- [Git v1.8.5 Release Notes](https://github.com/git/git/blob/v1.8.5/Documentation/RelNotes/1.8.5.txt)
- [Git v2.30.0 Release Notes](https://github.com/git/git/blob/v2.30.0/Documentation/RelNotes/2.30.0.txt)
- [git-config Documentation: push.useForceIfIncludes](https://git-scm.com/docs/git-config#Documentation/git-config.txt-pushuseForceIfIncludes)
- [Git: Force push safely with `--force-with-lease` and `--force-if-includes`](https://adamj.eu/tech/2023/10/31/git-force-push-safely/)，Adam Johnson

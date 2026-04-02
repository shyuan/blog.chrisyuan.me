---
pubDatetime: 2026-04-02T00:00:00Z
title: "Καιρός：從古希臘神殿到 Claude Code 的背景守護程序"
slug: kairos-claude-code-background-daemon
tags:
  - ai
  - claude-code
  - software-engineering
description: "Anthropic 洩漏的 Claude Code 原始碼中，一個名為 KAIROS 的未發布功能反覆出現。這個取自古希臘「對的時機」的命名，揭示了 proactive AI agent 的核心挑戰：該不該現在做，比能不能做更難回答。"
draft: false
---

2026 年 3 月 31 日，[Anthropic](https://www.anthropic.com/) 在推送 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) v2.1.88 到 npm 時，[漏掉了一行 `.npmignore`](https://venturebeat.com/technology/claude-codes-source-code-appears-to-have-leaked-heres-what-we-know)。Bun 預設產生的 source map 檔跟著套件一起上了公開 registry，512,000 行 TypeScript 原始碼就這樣攤在陽光下。幾個小時內，程式碼被 mirror 到 GitHub，數千名開發者開始翻箱倒櫃。

在這堆程式碼裡，有個名字反覆出現超過 150 次：**KAIROS**。

## Table of contents

## 希臘人的兩種時間

古希臘人用兩個不同的詞來談論時間。

**[Chronos](https://en.wikipedia.org/wiki/Chronos)**（χρόνος）是鐘錶上的時間。它是線性的、等距的、可以被切割成秒和分鐘。你遲到了五分鐘，你的合約還有三個月到期——這些都是 Chronos。

**[Kairos](https://en.wikipedia.org/wiki/Kairos)**（καιρός）完全不一樣。它指的是「對的那個瞬間」，那個你必須出手、不出手就錯過的時間點。你沒辦法排程 kairos，沒辦法量化它，你只能在它出現的時候認出它。

這個區別在修辭學裡最清楚。[亞里斯多德](https://zh.wikipedia.org/wiki/%E4%BA%9E%E9%87%8C%E6%96%AF%E5%A4%9A%E5%BE%B7)談說服的技術，邏輯（logos）、情感（pathos）、人格（ethos）都重要，但你什麼時候說，比你說什麼更決定成敗。在法庭上、在議會裡，判斷 kairos 的能力把頂尖修辭者跟普通演說者分開。

在更早的用法裡，kairos 這個詞跟射箭有關。箭穿過一個狹窄的開口——那個開口不會一直在那裡。你必須在它出現的那一瞬間鬆手。太早或太晚，箭就撞上牆壁。

基督教神學後來借用了這個概念。《新約》裡 kairos 出現多次，用來描述上帝介入人間的時刻，那種歷史在屬靈意義上成熟到可以被改變的節點。[保羅](<https://zh.wikipedia.org/wiki/%E4%BF%9D%E7%BE%85_(%E4%BD%BF%E5%BE%92)>)在寫給哥林多人的信裡說的「[現在就是悅納的時候](https://www.bible.com/zh-TW/bible/40/2co.6.cnv)」，用的就是 kairos。

兩千多年來，這個詞一直帶著同樣的意思：時間的品質比數量重要。「什麼時候」比「多久」更關鍵。

## daemon 裡的希臘魂

Claude Code 的洩漏原始碼裡，KAIROS 是一個被 feature flag 封鎖的未發布功能，配對的 flag 名稱包括 `PROACTIVE` 和 `KAIROS`。它要做的事情，用一句話講：讓 Claude Code 從「你叫它做事，它才做事」變成「它自己判斷什麼時候該做事」。

目前的 Claude Code 是純粹的 request-response 模式。你在終端機打一段指令，它回應你。你不說話，它就是一片黑。這是 Chronos 式的互動，由外部的時鐘節拍驅動，每一次對話都有明確的起點和終點。

KAIROS 想做的是另一回事。根據洩漏的程式碼，它是一個持續運行的背景 daemon。每隔幾秒，它收到一個 heartbeat prompt，一個 `<tick>`，然後自己評估：現在有沒有什麼值得做的？有的話就動手，沒有就繼續等。

「現在是不是對的時機」，這個判斷本身就是 kairos 的原意。

架構上它有幾個特別的設計。它維護 append-only 的每日日誌，記錄它觀察到什麼、做了什麼決定、執行了哪些動作，而且不能刪除自己的歷史。它有三個專屬工具是一般 Claude Code 沒有的：push notification（終端機關了也能通知你）、file delivery（主動把產出交給你）、以及 GitHub PR subscription（監控你的 repo，看到變更自動回應）。

它還跨 session 持續存在。週五關上筆電，週一早上打開，KAIROS 在這段時間裡一直醒著。

## autoDream：機器的睡眠

KAIROS 裡面有個子功能叫 autoDream。名字取得很直覺，就是做夢。

當使用者閒置的時候，autoDream 會 fork 出一個獨立的 sub-agent，用 read-only 的 bash 權限去整理白天累積的觀察紀錄。它合併重複的資訊，移除互相矛盾的記錄，把模糊的觀察轉換成確定的事實陳述，然後把整理過的記憶寫回去。

如果你在認知科學的脈絡下讀這個設計，會覺得眼熟。人類睡眠中的[記憶鞏固](https://en.wikipedia.org/wiki/Memory_consolidation)（memory consolidation）做的事情很類似：白天大量輸入的短期記憶，在睡眠期間被[海馬迴](https://zh.wikipedia.org/wiki/%E6%B5%B7%E9%A9%AC%E4%BD%93)重新播放、篩選、整合到長期記憶裡。大腦丟掉不重要的細節，解決矛盾，從雜訊裡抽取模式。

autoDream 不是隱喻。它真的是一個在使用者「睡著」的時候運行的記憶整合流程。

## 時機的判斷比能力的執行更難

KAIROS 這個命名選擇透露了 Anthropic 工程師對這個問題的理解。

現有的 Claude Code 已經能讀檔案、寫程式、跑測試、操作 git。能力早就到位了。難的是判斷：什麼時候該主動介入，什麼時候該閉嘴等著。

這跟射箭的比喻完全吻合。工具都在手上，弓弦已經拉滿，但你得等那個開口出現。太早動手，你打斷了開發者的思路；太晚動手，bug 已經被 merge 進 main branch。

一個 reactive 的系統不需要做這個判斷，因為判斷權在使用者手上。使用者按下 Enter 的那一刻就是行動的時機，永遠不會錯。但一個 proactive 的系統得自己決定什麼時候該行動，這意味著「判斷品質」從一個不存在的問題，瞬間變成了整個系統最關鍵的問題。

這也許解釋了為什麼 KAIROS 還鎖在 feature flag 後面。能力已經蓋好了，44 個 hidden feature flags、20 多個未發布功能。但要放出一個 24 小時自主運行的背景 agent，Anthropic 需要先確信它的時機判斷夠好——好到不會在半夜三點幫你重構你不想被碰的程式碼。

用古希臘人的話說：他們還在訓練這支箭辨認開口。

## 名字裡的問題

軟體工程裡的命名從來不是隨便取的。你選什麼名字，暴露你怎麼想這個問題。

如果這個功能叫 AUTOPILOT，重點就會在自動化，讓機器代替人。如果叫 WATCHDOG，重點在監控，持續檢查有沒有出錯。如果叫 DAEMON，那只是一個技術描述。

他們選了 KAIROS。

這個選擇把重點放在時機的辨認上。一個永遠在運轉但大部分時間選擇沉默的 agent，跟一個接到指令就全力衝刺的 agent，思考方式完全不同。

但這裡有一個更深的問題。

兩千四百年來，kairos 一直是一種人類能力。修辭者判斷什麼時候開口，將領判斷什麼時候進攻。這個判斷之所以有價值，正是因為它沒辦法被化約成規則。它依賴對情境的整體感知，一種說不清楚但確實存在的直覺。

現在 Anthropic 試圖把這個能力寫進程式碼裡。他們要做的不是 cron job 那種按時執行的東西，是一個會自己判斷「現在是不是對的時機」的 agent。如果它成功了，我們面對的是一個哲學問題的工程實作：當機器開始判斷 kairos，它是在模擬人類的直覺，還是正在發展出某種我們還沒有名字的東西？

Anthropic 把箭搭上了弓弦。但真正的問題也許不是這支箭什麼時候射出來。而是：當一個不眠不休的程序比你更擅長判斷「對的時機」，你跟你的工具之間的關係，會變成什麼樣子？

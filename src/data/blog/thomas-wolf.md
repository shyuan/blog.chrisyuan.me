---
title: "Thomas Wolf 談自學人工智慧/機器學習/自然語言背後的數學基礎"
pubDatetime: 2023-09-18T17:05:37.000Z
slug: "thomas-wolf"
description: "我是在下面這則 X 看到在介紹 Thomas Wolf 分享他自學 NLP, AI, ML 的相關資源，覺得提到的內容很不錯，所以整理成一篇文章記錄一下： https://twitter.com/TheTuringPost/status/1698681263887093850 基本上 X thread 是整理自他記錄於個人網站的 My self-educational approach is"
tags:
  - huggingface
  - AI
  - probability
  - machine-learning
  - deep-learning
  - thomas-wolf
---

## Table of contents

我是在下面這則 X 看到在介紹 [Thomas Wolf](https://thomwolf.io/) 分享他自學 NLP, AI, ML 的相關資源，覺得提到的內容很不錯，所以整理成一篇文章記錄一下：

%[https://twitter.com/TheTuringPost/status/1698681263887093850]

基本上 X thread 是整理自他記錄於個人網站的 [My self-educational approach is usually to get a few rather exhaustive books and read them for cover to cover.](https://thomwolf.io/data/Thom_wolf_reading_list.txt) 這個檔案

## 書籍

1. 由人工智慧領域的知名教授 [Ian Goodfellow](https://twitter.com/goodfellow_ian), [Yoshua Bengio](https://en.wikipedia.org/wiki/Yoshua_Bengio) 和 [Aaron Courville](https://mila.quebec/en/person/aaron-courville/) 三人合著的 [Deep Learning](https://www.deeplearningbook.org/)，這本書對當代深度學習領域的技巧與工具給出很不錯的概述。
2. 由 [Stuart Russel](https://people.eecs.berkeley.edu/~russell/) 和 [Peter Norvig](https://www.norvig.com/) 合著的 [Artificial Intelligence: A Modern Approach](https://aima.cs.berkeley.edu/)(簡稱 [AIMA](https://en.wikipedia.org/wiki/Artificial_Intelligence:_A_Modern_Approach))，是 AI 專業領域的學院權威教科書已有將近三十年歷史，第一版出版於 1995 年，2009 年的第三版包含了神經網路問世之前，所有用來處理 AI 的工具與方法，2020 年的第四版補充近年神經網路發展相關知識進來。
3. 由 [Kevin Murphy](https://x.com/sirbayes) 撰寫的 [Probabilistic Machine Learning(PML)](https://probml.github.io/pml-book/) 系列，介紹機率方法及貝氏推論工具，該系列分成以下三冊：
   - [Book 0: “Machine Learning: A Probabilistic Perspective” (2012)](https://probml.github.io/pml-book/book0.html)
   - [Book 1: “Probabilistic Machine Learning: An Introduction” (2022)](https://probml.github.io/pml-book/book1.html)
   - [Book 2: “Probabilistic Machine Learning: Advanced Topics” (2023)](https://probml.github.io/pml-book/book2.html)
4. 由 David MacKay 撰寫 [Information Theory, Inference, and Learning Algorithms](https://www.inference.org.uk/mackay/itila/book.html) 以再淺顯易懂不過的方式介紹機率論及資訊理論。
5. 由 [Judea Pearl](https://x.com/yudapearl) 撰寫的 [The Book of Why: The New Science of Cause and Effect](http://bayes.cs.ucla.edu/WHY/) 清楚解說因果推斷的概念。
6. 由 [Richard S. Sutton](http://incompleteideas.net/index.html) 和 Andrew G. Barto 合著的 [Reinforcement Learning: An Introduction](http://incompleteideas.net/book/the-book.html) 是一本能幫助你初步了解「強化學習」概念的好書。
7. 由 [Kyunghyun Cho](https://x.com/kchonyc) 整理的 [Lecture notes on "Natural Language Processing with Representation Learning"](https://github.com/nyu-dl/NLP_DL_Lecture_Note/blob/master/lecture_note.pdf) 能幫助你學習「自然語言處理」概念。
8. 由 Yoav Goldberg 所寫的 [Neural Network Methods in Natural Language Processing](https://www.amazon.com/Language-Processing-Synthesis-Lectures-Technologies/dp/1627052984) 也是學習「自然語言處理」概念很不錯的一本書，[舊版本](https://arxiv.org/abs/1510.00726)是一篇論文，如果不想買書的話看論文就好。
9. [Jacob Eisenstein](https://jacobeisenstein.github.io/) 的 [Natural Language Processing](https://github.com/jacobeisenstein/gt-nlp-class/blob/master/notes/eisenstein-nlp-notes.pdf) 也是一本相當詳盡，值得一讀的教科書。

## 課程

如果想要更深入研究相關領域，補充以下兩門線上課程也會很有幫助：

1. 由 MIT 整理，放在 [edX](https://edx.org/) 上的 [Computational Probability and Inference](https://www.edx.org/learn/computer-programming/massachusetts-institute-of-technology-computational-probability-and-inference)
2. 由 Stanford 整理，放在 [Coursera](https://www.coursera.org/) 上的 [Probabilistic Graphical Models(PGM) Specialization](https://www.coursera.org/specializations/probabilistic-graphical-models)

## Thomas Wolf 介紹

他在個人網站自述其學經歷蠻有趣的，從很年輕時就有用 C/C++ 和組合語言寫過軟體和遊戲，但在求學和初入職場時都不是電腦資訊相關，而是物理領域。在巴黎高等師範學院畢業後先去勞倫斯柏克萊國家實驗室做雷射電漿交互作用研究。先被 MIT 錄取攻讀博士，最後選擇在巴黎索邦大學和 ESPCI 取得統計與量子物理博士學位，期間也替法國國防部及 Thales 做超導材料研究。

在取得博士學位後，因物理需要長時間實驗，他做出改變跑道的決定，加入了一間智財專利事務所並取得法學學位，擔任了五年專利師，協助許多新創公司及大企業建立和保護其智財資產。在 2015 年替許多深度學習/人工智慧/機器學習的新創公司提供顧問服務時認知到 AI 革命的數學基礎，其中大部分的方法其實只是將統計物理重新包裝而已，這引起他的興趣於是開始透過閱讀書籍和參加線上課程自學。又過了一年他的朋友就詢問他是否願意一同創辦 Hugging Face。

另外[Thomas Wolf 過去發表的論文](https://scholar.google.com/citations?user=D2H5EFEAAAAJ)也可以看一下。

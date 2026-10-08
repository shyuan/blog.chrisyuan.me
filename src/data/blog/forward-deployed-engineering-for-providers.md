---
pubDatetime: 2026-10-08T15:43:00Z
title: "FDE 和外包、顧問差在哪？給想提供 FDE 服務的團隊：誰需要、要先有什麼平台"
slug: "forward-deployed-engineering-for-providers"
featured: false
draft: false
tags:
  - AI
  - FDE
  - business
description: "想提供 FDE（Forward Deployed Engineer）服務的公司與工程師，先回答三個問題：客戶是否真的需要、自己有沒有平台撐得住客製，以及和 SaaS、外包、顧問的差別。"
---

2026 年 5 月 4 日，Anthropic 和 Blackstone、Hellman & Friedman、Goldman Sachs [宣布合資成立一家 AI 服務公司](https://am.gs.com/en-us/institutions/news/press-release/2026/anthropic-partners-with-blackstone-hf-and-goldman-sachs-ai-services)，把工程師派進中型企業；5 月 11 日，OpenAI 成立 [OpenAI Deployment Company](https://openai.com/index/openai-launches-the-deployment-company/)，取得超過 40 億美元的初始投資，同時宣布收購倫敦的 AI 顧問公司 Tomoro，約 150 名工程師併入。兩家公司要大量派出的，都是 FDE（Forward Deployed Engineer，前線部署工程師）。

這個職位源自 [Palantir](https://www.palantir.com/)，最近兩年突然熱起來。[The New Stack](https://thenewstack.io/forward-deployed-engineers-ai/) 引用的資料是：2025 年 1 月到 9 月，FDE 職缺數成長超過 800%。

職缺多了，想「不如也來做做看 FDE」的公司跟著變多：系統整合商、軟體外包、AI 新創，還有想接案的獨立工程師。這篇寫給這群人。整理了十一篇 FDE 相關文章，其中七篇的作者現職或曾任職 Palantir，用它們回答三個問題：什麼樣的客戶需要 FDE？提供 FDE 服務的一方自己要先有什麼？FDE 和 SaaS、外包、顧問差在哪裡？

主要框架取自 Kevin Bai 在 AI Engineer World's Fair 2026 的短講〈[Forward Deployed Engineering 101](https://ai.engineer/talks/KwhgfwOSToQ-forward-deployed-engineering-101)〉。Bai 現在在 [Anthropic](https://www.anthropic.com/) 的 applied AI 團隊，之前是 [Rippling](https://www.rippling.com/) FDE 團隊的第一號成員，更早在 Palantir。這場演講只有 17 分鐘，給的是判斷用的框架。其他文章用來補充與對照，完整清單列在文末。

## Table of contents

## FDE 從哪裡來

Palantir 的產品 Foundry 是資料平台：把組織散落各處的資料集中起來，建立 ontology（把「table1、table2」整理成「倉庫」「訂單」這類有業務意義的物件），再在上面開發應用。

Bai 說，問題出在向產業主管介紹它的時候。對方的反應是：「你把我的資料整理好了，然後呢？這對我的生意有什麼用？」平台能不能成功，取決於客戶會不會用。客戶除了付錢買平台，還要先訓練自己的員工，訓練完才開始做東西。Bai 的評語是：

> That is a terrible way to do business, and we soon realized that instead of selling just services or just products, you sell both.

所以 Palantir 把軟體和服務綁成一個產品，派工程師進駐客戶，弄懂對方的業務，在 Foundry 上做出解決方案。Bai 的說法是，客戶買的既不是軟體，也不是某個人的時間，而是結果。消費品公司在乎的是貨架上的位置和銷售量，資料怎麼組織只是實作細節。

這些駐點工程師在 Palantir 內部叫「Deltas」。根據 The New Stack，直到 2016 年，Palantir 的 Deltas 人數都比做核心產品的工程師多。

## 誰需要 FDE，誰不需要

### Bai 的 2×2：賣什麼 × 賣給誰

Bai 用兩個維度判斷要不要 FDE：你賣的東西技術上多複雜，以及買的人有沒有技術能力。

|                              | 技術買家                                            | 非技術買家                              |
| ---------------------------- | --------------------------------------------------- | --------------------------------------- |
| **技術平台**（要在上面開發） | GitHub、Datadog：使用者是工程師，自己吸收得了複雜度 | **需要 FDE**                            |
| **可配置工具**（設定即可用） | （不在討論範圍）                                    | Rippling、Jira、Slack：再複雜也只是設定 |

只有右上角那一格需要 FDE：產品必須在上面開發才有價值，買的人卻沒有能力開發。Bai 舉的例子是 Fortune 500 的油氣公司，「他們的管線裡流的不是資料」。Google、Meta、AI 實驗室有自己的工程師，買了平台會自己做應用，用不到 FDE。

站在客戶的角度，FDE 等於「借你一群好工程師，你不用自己招募、管理、留住他們」。

### 先問需不需要

Bai 對想建 FDE 部門的人，第一個建議是問自己「我需要嗎」，不是「我想要嗎」：

> It's easy to want things that are in vogue. It's easy to want to do, you know, AI because that's what everyone else is doing. But like do I need one?

如果你的產品是技術型、客戶是工程師，他建議做 DevRel；如果是傳統 SaaS，業務主導（sales-led）就夠。[PostHog 的 FDE 介紹文](https://posthog.com/blog/forward-deployed-engineer)講得更直接：

> If the usual product-market fit playbook is already working for you, the answer is that you shouldn't. The FDE strategy starts by solving one problem and earning the right to solve bigger ones, and that can take years for even a single customer.

### 哪些客戶值得派 FDE

PostHog 認為適合用 FDE 的情況，是產品需要大量實作、要和客戶既有的基礎設施深度整合，而且毛利高到撐得起這個成本。醫療、金融、政府、國防這些高度管制的產業也常用 FDE。另一種是公司要切入新的客群。Ramp 的 FDE 團隊在〈[Forward Deployed Engineering](https://builders.ramp.com/post/forward-deployed-engineering)〉寫過自己的經過：Ramp 原本做小企業的費用管理，往大企業擴張時，碰到客戶用了幾十年的舊系統和要被取代的流程，才在 2023 年秋天從兩個人開始組 FDE 團隊。這篇也寫明了不適用的情況：消費性產品，以及只靠產品導向成長（PLG）的公司。

Bai 後來在他的 Substack〈[What It Means to Be a Forward Deployed Engineer](https://fdepod.substack.com/p/what-it-means-to-be-a-forward-deployed)〉把判斷再往下推一層：就算公司確定需要 FDE，也不是每個問題都派 FDE。

> Point them at the messy, ambiguous, high-value problems where the answer is a build, not a config. Use them as a fancy support queue and you've spent your highest-leverage asset on commodity work.

答案是「要開發」的問題才派 FDE，「改設定就好」的問題交給一般的客戶成功或支援。

PostHog 也提到 AI 讓買方更需要 FDE 的幾個原因：企業不願把資料交給廠商；AI 合約金額動輒六到八位數美元，撐得起駐點成本；傳統企業的高層對 AI 存疑，要看到自己的真實資料跑出結果才會相信。

前 Palantir 員工 Sarah Constantin 在〈[The Great Data Integration Schlep](https://sarahconstantin.substack.com/p/the-great-data-integration-schlep)〉描述了這類客戶的實際狀態。製造業有大量關鍵資料是紙本、掃描的 PDF，或鎖在單一機台裡：

> You cannot, in general, assume it is possible to go into a factory and find a single dataset that is "all the process logs from all the machines, end to end".

所以對很多客戶來說，「導入 AI」的第一步是先把資料放上電腦、集中到同一個地方。她也提到 Palantir 早年挑客戶的原則：只賣給面臨「存亡威脅」的公司，也就是出了大問題、可能撐不下去的公司。

The New Stack 引用了 MIT NANDA 計畫的研究：在 300 個公開的企業 AI 專案裡，95% 對損益沒有可量測的影響（[Fortune 的報導](https://fortune.com/2025/08/18/mit-report-95-percent-generative-ai-pilots-at-companies-failing-cfo/)）。研究作者認為問題出在導入方式，模型本身沒什麼問題。這些客戶大多已經看過 demo、做過 PoC，卡住的是後面上線、接進日常營運的那一段，FDE 的工作主要就在這裡。

## 提供 FDE 服務的一方要先有什麼

### 平台：沒有平台就是 dev shop

這是 Bai 的第二道關卡，也是這場演講最重要的論點：

> If you were to implement an FDE function where each FDE is building entirely from scratch, my friends, you do not have an FDE function, you have a dev shop. Um, nothing wrong with that, of course. Those are really profitable businesses. But the thing that makes an FDE program different is that they are building on top of a platform.

每個客戶都從零寫，最後會有 55 個沒人想維護的 repo，維護成本會吃掉損益表，或者工程師先跑光。所以他要你問自己：我有平台嗎？或者，我願意投資去建一個嗎？

平台的基本元件（primitive）要做到多細？Bai 的答案是看客群。客群窄的產業，應用可以預先做好 60%，客戶只客製剩下的 40%；客群廣就像 AWS，只給 DynamoDB 這類通用積木。做資料平台的話，至少別讓 FDE 每次從零定義資料模型。

至於什麼該放進平台、什麼留在客戶端，原則是：只屬於某個客戶的東西留在那個客戶，可以通用的東西長期要收回平台。剛開始平台上沒幾個 primitive 也沒關係，FDE 本來就是在前線探路，找出還能做成產品的東西。

### FDE 與產品工程師兩條線並行

Nabeel Qureshi 2015 到 2023 年在 Palantir，他在〈[Reflections on Palantir](https://nabeelqu.substack.com/p/reflections-on-palantir)〉描述了平台怎麼長出來。Palantir 的工程師分兩種：FDE 每週有三四天在客戶那裡，PD（product development）工程師把 FDE 做出來的東西產品化，並且做工具讓 FDE 更快：

> FDEs tend to write code that gets the job done fast, which usually means – politely – technical debt and hacky workarounds. PD engineers write software that scales cleanly, works for multiple use cases, and doesn't break. One of the key 'secrets' of the company is that generating deep, sustaining enterprise value requires both.

他自己的第一個客戶是 Airbus。他搬到土魯斯住了一年，每週四天在工廠裡和製造部門的人一起工作。Airbus 的 CEO 說他最大的問題是 A350 擴產，團隊就直接針對這件事做軟體。Qureshi 形容那是「造飛機版的 Asana」：把工單、缺料、品質異常整合到同一個介面，現場可以勾選完成的工作，看到其他團隊的進度、零件在哪裡、排程怎麼排，也能搜尋過去的品質問題當時怎麼處理。他說這些都是很基本的軟體功能，但企業軟體平常做得太差，光是把像樣的介面放進工廠就很有用。根據他的說法，這套系統幫 A350 的生產速度提高到原來的 4 倍，品質標準沒有降低。

這套系統很難用一句話說清楚它是什麼，因為它是針對這一個問題做的完整解法，完全不考慮能不能通用化。Qureshi 這樣描述兩邊的分工：

> Your job was to solve the problem, and not worry about overfitting; PD's job was to take whatever you'd built and generalize it, with the goal of selling it elsewhere.

Foundry 大部分的功能就是這樣來的：FDE 在客戶現場手動做了一堆重複的苦工，PD 工程師再做工具把它自動化。Qureshi 拿這套做法解釋 Palantir 怎麼從服務公司轉成產品公司，他引的數字是 2023 年 Palantir 毛利率 80%，Accenture 是 32%。

Palantir 官方部落格的〈[Dev versus Delta](https://blog.palantir.com/dev-versus-delta-demystifying-engineering-roles-at-palantir-ad44c2a6e87)〉（2019）講了組織上怎麼切。Delta 隸屬 Business Development，不在 Product Development，成功與否看對客戶目標的影響。兩種職位的分工是：

> You can think of a Dev's focus as 'one capability, many customers,' while a Delta's focus is 'one customer, many capabilities.'

Delta 碰到平台缺功能時可以自己補，但要和產品團隊協調，大一點的需求得排進產品路線圖。現場累積的東西也不一定都要進核心產品。另一篇〈[A Day in the Life of a Palantir Forward Deployed Software Engineer](https://blog.palantir.com/a-day-in-the-life-of-a-palantir-forward-deployed-software-engineer-45ef2de257b1)〉（2020）裡，受訪的 FDSE 把資安專案做出來的設定分享給其他 FDSE，之後新開的資安專案就能從一個比較貼近需求、也比較強化過的基準版本開始。

Palantir 早期高管 Bob McGrew 的比喻（引自 PostHog）講的是同一件事：FDE 先鋪出通往產品方向的碎石路，核心產品團隊再把它鋪成高速公路，讓接下來十個客戶也能跟著開上去。

反過來看，如果只派人駐點，沒有人負責把現場做出來的東西產品化，公司就會一直只是服務公司，毛利率也停在 Accenture 那一級。

Palantir 全球商業負責人 Ted Mabrey 寫〈[Sorry, that isn't an FDE](https://tedmabrey.substack.com/p/sorry-that-isnt-an-fde)〉，是因為看到太多公司只學到 FDE 的表面。他認為 FDE 必須綁著整套商業模式才成立：產品要瞄準那些難到幾乎解決不了、但有一點進展就能展現出價值的問題；要挑對的客戶，而不是所有客戶；還要在客戶端接住所有複雜度的同時，把軟體槓桿做進公司：

> The financial success of a company pursuing the FDE model hinges on whether or not you can embrace this complexity at the edge, but actually build software leverage into the business at the same time.

「對的客戶」有多集中？Mabrey 引用 Palantir 公開揭露的數字：前 20 大客戶貢獻了超過 11 億美元的年營收。

他也承認這套模式的代價。決定「哪些客製值得通用化」高度依賴少數人的判斷；FDE 和核心產品團隊之間經常有矛盾；有些產品要累積 10 到 20 個客製實作，才提煉得出共用的技術。

照這個說法，團隊裡得有人專門判斷哪些東西該收進平台，也要先想好累積下來的東西放在哪：通用的平台，還是某個產業專用的模組。

### 人：會寫程式，也放心讓他面對客戶

Bai 對理想 FDE 的定義是「customer-facing software engineer」：你會錄用他當團隊的軟體工程師，同時信得過他站在客戶面前。他也建議同一個案子派多個 FDE，避免只有一個人掌握所有資訊、他一休假案子就停擺。

PostHog 整理了 OpenAI、Anthropic、Databricks 等公司的職缺，FDE 的共同要求大致是：五年以上面對客戶的工程經驗、對客戶的同理心、能和高管溝通、自我不要太強、有產品感、具備領域知識。Qureshi 提到 Palantir 的新人書單裡有即興劇場的書《Impro》，因為 FDE 要讀得懂會議室裡的權力關係和結構。Constantin 的說法更直白：

> The Palantir Way is labor-intensive and virtually impossible to systematize, let alone automate away. This is why there aren't a hundred Palantirs. You have to throw humans at the persuasion problem — well-paid, cognitively flexible, emotionally intelligent humans, who can cope with corporate dysfunction.

她描述的打法是先取得高層支持，再靠駐點贏得第一線，上下夾擊中間反對的中階主管。資料清理也需要現場知識：兩個欄位數值相同，是同一個感測器重複輸出，還是兩個感測器剛好讀到一樣的數字？這只有在現場問人才知道。

Ramp 對「會寫程式」這一項的要求比 Bai 寬。它的招募看四件事：幹勁、工程基本功、客戶同理心、溝通，其中幹勁被認為最能預測實際表現。工程能力過門檻就好，不再往上挑：

> we see technical performance as a bar to pass but avoid optimizing it further… AI tooling makes it easier than ever to learn and execute on technical problems…

他們發現程式面試表現普通的人，進來後反而成了很好的 FDE。客戶同理心也不一定要有面對客戶的經歷，當過講師、助教，或待過內部平台團隊、習慣服務內部使用者的人，常常做得來。Ramp 的 16 位 FDE 裡有 7 位當過創辦人。

### 編組：從銷售跟到長期支援

Ramp 的 FDE 在客戶還在銷售漏斗裡時就開始參與，一路跟到導入、上線和長期支援。這樣做的好處是客戶的脈絡不會在交接中流失，銷售階段就能開始界定範圍，把不合理的需求先推掉。Ramp 說 FDE 的口頭禪是「always be scoping」，對應業務的「always be closing」。

FDE 出現之前，Ramp 的流程是業務或客戶成功經理收需求、交給產品工程，產品工程排出一個要做好幾個月的大專案，結果延誤、需求變了，所有人都不滿意。有 FDE 之後，有一次新客戶卡在一個估計要三天工程的功能缺口，FDE 和客戶開個會，當場就找到替代做法。

人手不夠時，Ramp 的優先順序是先服務好既有客戶，再提高新客戶的導入效率，最後才是擴大產品能力。他們的理由是導入是企業市場最複雜的部分，也常是成長的瓶頸。

### 合約與計價

Bai 在 Substack 上說，很多公司把 FDE 當成本中心，看成薪水比較高的進階支援，他認為這是最昂貴的錯誤之一。他的主張是 FDE 本身就是成長部門，營收從三個地方來。第一是縮短客戶看到價值的時間：聽到問題的人就是交付的人，業務、服務、工程之間的交接全部省掉。第二是擴售：人在現場做事，自然看得到接下來值得解決的問題，下一個案子會自己找上門。第三是續約：

> Realized value is the only thing that actually renews a contract… That switching cost never shows up in a contract.

他也說要挑「最有價值、又最能在平台上做到」的問題，因為派 FDE 做低價值的開發，等於浪費最稀缺的人力。Ramp 的團隊指標也盡量綁在客戶和營運成果上，不看工時或交付物。

計價方式也要跟著改。Mabrey 寫道：

> At odds with traditional waterfall or agile software development strategies, the FDE yearns for scope creep because the customer's mission demands it.

傳統專案怕範圍擴張，FDE 則把它當成客戶目標的一部分。要這樣做，合約得撐得住；按工時或交付物計價的一次性專案，碰到範圍擴張只會一直虧。The New Stack 指出 AI 系統是機率性的，測試時表現好，碰到正式資料和真實使用者後可能變差，所以合約要涵蓋上線後的監控、評估（evals）與調整，也要定義交棒給客戶團隊的條件。

## FDE 和 SaaS、外包、顧問差在哪

用 Bai 那句「客戶買的是結果，不是軟體，也不是某個人的時間」，可以把幾種模式放在一起比：

|                      | 客戶買的是   | 誰負責把它用出價值 | 怎麼計價         | 做完的東西                         |
| -------------------- | ------------ | ------------------ | ---------------- | ---------------------------------- |
| SaaS                 | 軟體的能力   | 客戶自己           | 訂閱             | 標準產品                           |
| 外包（dev shop）／SI | 工時與交付物 | 依合約範圍         | 工時或專案       | 每案從零寫，留在客戶端             |
| 顧問                 | 建議與時間   | 客戶自己執行       | 人天或專案       | 報告與建議                         |
| FDE                  | 業務結果     | 提供方             | 依結果與長期合約 | 平台上的應用，可通用的部分收回平台 |

### 和 SaaS：把落差吸收過來

SaaS 賣的是能力，能不能用出價值是客戶的事，客戶還得先繳一筆「訓練員工」的稅。FDE 把這段落差吸收到提供方。

Mabrey 用法式餐廳比喻：外場服務生是廚房的一部分，你點的酒配不上魚，服務生會直接告訴你不行。他要說的是交付方式也算在產品裡，FDE 要有自己的判斷，並對結果負責。一般面向客戶的工程師會縮小範圍，把客戶的野心壓成產品現有的功能；FDE 則把客戶可能失敗的每一個原因都當成產品缺陷：

> ...organizational alignment, technical aptitude, user adoption, reimagining technology enabled business processes. These are all problems technology companies externalize. The FDE internalizes them and uses code to solve them.

### 和外包、SI：差在平台與槓桿

外包每個案子從零寫，按工時收費；FDE 建在平台上，客製的部分留在客戶端，可以通用的收回平台。Mabrey 看那些模仿 Palantir 的公司，認為它們做的正是外界誤以為 Palantir 在做的事：

> My point of view as an outsider is these companies are literally doing what people thought we were; internalizing systems integration cost with FDE's but gaining none of the long term leverage.

他稱這些模仿者是「致敬樂團」：重新劃分角色與責任、把原本外包給 SI 的成本收進來、換個方式收集產品回饋，但都只做了一半。如果你的 FDE 只是讓既有產品導入得更順，本質上還是 SI，賺的是人力錢。

### 和顧問：對上線後負責

The New Stack 對兩者的區分是：

> Consultants usually work for a set time and are judged by what they deliver. Forward deployed engineers, on the other hand, are measured by whether the system continues to run well and continues to add value after it goes live.

顧問給建議，FDE 自己寫出能上線的系統，而且要對系統上線後的表現負責。文中一位 FDE 說，模型通常是整個系統裡最乾淨的部分，難的是找出沒人寫下來的流程、大家真正信任的資料來源，以及知道流程為什麼長這樣的那個人。

Palantir 官方也回答過「Delta 是不是顧問」。〈Dev versus Delta〉裡的 Delta 說，顧問通常交出一次性的分析或建議，而 Delta 和客戶一起建立能長期用下去的系統：

> In my mind, the critical difference is that we are actually deploying existing software products to achieve the customer's outcomes.

FDSE 那篇的說法類似：大部分元件拿現成的就能組起來，不用每個客戶重造輪子、花好幾年拼湊。這和 Bai 說的「不從零寫，否則就是 dev shop」是同一個論點，顧問和外包都靠手上有沒有現成的平台跟 FDE 分開。

兩者也有相似的地方。Constantin 就說，大規模的資料整合本質上有點像管理顧問。Bai 的定義乾脆把顧問算進去：FDE 是一個人同時當顧問、PM 和工程師，從找出問題到交付都由同一個人負責，中間沒有交接。

### 和支援、客服：不是處理工單

前面提過 Bai 反對把 FDE 當成進階支援。Ramp 的 FDE 確實會跟到長期支援，但他們的定位是對客戶長期的成果負責，不是處理工單。Bai 的說法是：

> It means you're not a deliverable factory, and you're not a safety net. You're the bridge between what the platform could do and what the business actually needs.

### 名不副實的 FDE

The Pragmatic Engineer 的 Gergely Orosz 在 2026 年 5 月〈[Forward deployed engineering heats up again](https://blog.pragmaticengineer.com/the-pulse-forward-deployed-engineering-heats-up-again/)〉提出警告：新一波 FDE 職缺多半在模型公司另外成立的公司裡，和開發 AI 產品的團隊是不同組織，這個職位快要和解決方案架構師、顧問分不出來了：

> You are a contractor who codes at a customer's office. The actual job is around ~25% coding-related, 50% integration/plumbing, 25% meetings and customer hand-holding.

他也把職缺上的術語翻成白話：「創辦人心態」是沒人給你規格；「白手套服務」是客戶要什麼都不能說不；「把現場洞見轉成產品路線圖的回饋迴路」是你會開 ticket，也許有幾個 PM 會看。

Ramp 的要求和「白手套」相反：合理的需求要熱情地說好，不合理的要頂回去。對照 Mabrey 的法式餐廳，FDE 需要說「不」的專業權威，這要從合約和客戶關係一開始就建立。回饋迴路也不能只是開了 ticket 沒人看，否則就是 Mabrey 說的致敬樂團。

## 為什麼是現在

Palantir 從 2000 年代中期就這樣做生意了，為什麼 2026 年大家才一窩蜂跟進？Bai 的個人假說是：

> But the thing that's changed is not that the world has suddenly realized Palantir's FDE motion is a really good idea and they should do that. My personal hypothesis is that the thing which has changed is that the nature of doing business in the software industry itself is what's changed.

現在幾乎每個平台都是 agentic，也就幾乎都能客製；能客製就代表客戶搞不清楚你的產品到底能做什麼。如果把產品成敗交給客戶自己的導入能力，要往大企業市場走、往其他產業擴張都會很難。用前面 2×2 的話說，越來越多產品從「可配置工具」那一格移到了「技術平台」那一格，原本只屬於 Palantir 的錯配，變成很多公司都會碰到的問題。

Bai 還有一個說法：新創早期會和 design partner 密切合作找出產品方向，FDE 就是把這種合作規模化到企業端。Palantir 的主張是，誰說 design partnership 只屬於公司草創期？

需求變多，Bai 的兩道關卡並沒有因此變低。想提供 FDE 服務，還是要先確定客戶真的需要，再確認自己有沒有平台，讓這次駐點做出來的東西能帶到下一個客戶。第二題答不出來的話，做的其實是外包。Bai 自己也說 dev shop 是很賺錢的生意，只是和 FDE 不同。

## 參考資料

| 作者／機構                                 | 標題                                                                                                                                                                            | 日期       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Kevin Bai（AI Engineer World's Fair 2026） | [Forward Deployed Engineering 101](https://ai.engineer/talks/KwhgfwOSToQ-forward-deployed-engineering-101)                                                                      | 2026-07-28 |
| Ted Mabrey（Palantir）                     | [Sorry, that isn't an FDE](https://tedmabrey.substack.com/p/sorry-that-isnt-an-fde)                                                                                             | 2024-09-20 |
| Nabeel Qureshi                             | [Reflections on Palantir](https://nabeelqu.substack.com/p/reflections-on-palantir)                                                                                              | 2024-10-15 |
| Sarah Constantin                           | [The Great Data Integration Schlep](https://sarahconstantin.substack.com/p/the-great-data-integration-schlep)                                                                   | 2024-09-13 |
| PostHog                                    | [WTF is a forward deployed engineer?](https://posthog.com/blog/forward-deployed-engineer)                                                                                       | 2026-02-11 |
| Gergely Orosz（The Pragmatic Engineer）    | [The Pulse: Forward deployed engineering heats up again](https://blog.pragmaticengineer.com/the-pulse-forward-deployed-engineering-heats-up-again/)                             | 2026-05-24 |
| The New Stack                              | [Why OpenAI and Anthropic are hiring forward deployed engineer teams](https://thenewstack.io/forward-deployed-engineers-ai/)                                                    | 2026-05-28 |
| Leo Mehr（Ramp）                           | [Forward Deployed Engineering](https://builders.ramp.com/post/forward-deployed-engineering)                                                                                     | 2025-08-05 |
| Kevin Bai                                  | [What It Means to Be a Forward Deployed Engineer](https://fdepod.substack.com/p/what-it-means-to-be-a-forward-deployed)                                                         | 2026-06-09 |
| Palantir                                   | [Dev versus Delta: Demystifying engineering roles at Palantir](https://blog.palantir.com/dev-versus-delta-demystifying-engineering-roles-at-palantir-ad44c2a6e87)               | 2019-04-08 |
| Palantir                                   | [A Day in the Life of a Palantir Forward Deployed Software Engineer](https://blog.palantir.com/a-day-in-the-life-of-a-palantir-forward-deployed-software-engineer-45ef2de257b1) | 2020-11-02 |

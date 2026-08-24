---
pubDatetime: 2026-08-24T06:23:37Z
title: "Claude Code skill 瘦身靠猜還是靠量？skill-jedi 經驗法則對上 skill-optimizer 量測管線"
slug: "skill-jedi-vs-skill-optimizer"
tags:
  - AI
  - claude-code
  - skills
description: "skill-jedi 是設計期的 pattern 目錄，skill-optimizer 是維護期的量測管線，像 linter 之於 profiler。對照兩套方法論的概念對映與五個張力點，找出互補的切入點。"
draft: false
---

我維護 [skill-jedi](https://github.com/shyuan/skill-jedi)：一套教你怎麼寫 Claude Code skill 的 pattern 目錄，收了六個 design patterns 和 22 條 anti-patterns。最近讀了 [Tobias Oetiker](https://tobi.oetiker.ch/hp/)（寫 [MRTG](https://en.wikipedia.org/wiki/Multi_Router_Traffic_Grapher) 和 [RRDtool](https://en.wikipedia.org/wiki/RRDtool) 的那位）的 [skill-optimizer](https://github.com/oetiker/skill-optimizer)，它管的是 skill 寫好之後的事：把內容切成一條條 claim，逐條用探針驗證「刪掉會不會出事」，瘦身後再跑回歸，確認行為沒變。

兩者的關係像 linter 之於 profiler：一個用靜態規則抓已知的壞味道，一個用動態量測看「在你的模型上、你的 skill 裡」實際發生什麼。把兩套方法論攤開對照，最有意思的是正面衝突的地方。skill-jedi 有幾條經驗法則，用 skill-optimizer 的標準看站不住腳；而 skill-optimizer 整條管線裡唯一不經量測就下的刀，正好砍在 skill-jedi 認為承重的位置。

## Table of contents

## 兩種世界觀：pattern 目錄與量測管線

### skill-jedi：設計期的經驗法則

skill-jedi 的知識形態是社群蒸餾出來的 pattern catalog：六個 design patterns（Iron Law、Rationalization Table、Red Flags、Phase-Gate、Hub-and-Spoke、Concrete Verification），22 條寫成 Symptom → Problem → Fix 三段式的 anti-patterns，加上 RED/GREEN/REFACTOR 的 TDD 工作流。素材來自 [obra/superpowers](https://github.com/obra/superpowers) 生態的研究、Anthropic 官方文件與社群實踐。

核心哲學一句話講完：MCP 提供 capability，skill 提供 judgment。skill 的價值在改變模型的判斷與行為。

它的認識論是「通常如此」。目錄裡引用的數據，像 soft language 改成指令式減少約 50% 違規、naive description 約 20% 觸發率 vs 優化後約 90%、Snyk ToxicSkills 研究中含 script 的 skill 有 2.12 倍風險，都是社群經驗的轉述，沒有一個是對你的 skill、你的模型做的量測。這點後面會回來談。

### skill-optimizer：維護期的量測儀器

skill-optimizer 的知識形態是一條管線：把 SKILL.md 切成 claim，分五類，對可疑的 claim 做密封探測，依結果裁決 CUT/COMPRESS/DEMOTE/KEEP，接著動手術（span surgery，只動內容不動結構），最後新舊兩版各跑 3 次以上，比行為達成率。

它的核心洞察是：知道 ≠ 會做。recall probe 測模型「知不知道」這條 claim 講的事；behaviour probe 測模型在沒有 skill 提示時「會不會照做」。兩者的分歧才是訊號：模型知道也會做，代表 skill 在教它已經會的事，通常是浪費；模型知道但不會做，代表 skill 在轉向它的預設行為，這通常正是 skill 存在的理由。

它的認識論是每一刀都要追溯到證據，而且證據只對產生它的模型有效，輸出會標上 `optimized-for:` frontmatter，換模型世代就該重跑。宣稱與證據不符時，改宣稱、不改證據。它自己就因為量測結果推翻過兩條自己的規則。

probe 的設計規則值得單獨一看，六條全是在防「量測工具汙染量測結果」：答案不能出現在問題裡；禁用 yes/no 問法，那測到的是模型的討好度；probe 要去識別化，不能讓密封模型猜到在測哪個 skill；behaviour probe 不能聞起來像測驗，要讀模型做出來的產物，不讀它的自我評論；以 claim 原文為 ground truth，防 knowledge-cutoff 陷阱，模型講得流暢不代表它知道；三次全過才算過。

### 在 skill 生命週期上各就各位

兩套方法論不搶位置，它們排在同一條流程的不同段：

```
skill-creator(建出來)
  → skill-jedi(設計:選型、patterns、token budget)
  → skill-review(靜態審查:22 條 anti-patterns checklist)
  → skill-optimizer(動態量測:probe + 回歸,砍掉被證明多餘的)
  → 量測發現的 load-bearing surprises 回饋成 Gotchas
  → 換模型世代時重跑
```

順序有意義。skill-review（skill-jedi 附帶的審查 skill）抓的是結構性問題：God Skill、orphan reference、nested reference、over-permission。skill-optimizer 因為 span surgery 刻意保留結構，永遠不會去修這些。先靜態修結構，再動態量內容，兩邊都省事。

## 概念對映：同一件事的兩種精度

skill-jedi 的好幾個概念，在 skill-optimizer 裡都有對應機制，而且幾乎每一組都是 optimizer 那邊更精確：

| skill-jedi 概念                         | skill-optimizer 機制                                 | 差異                                           |
| --------------------------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| Over-Teaching（刪掉模型已知的基礎解釋） | general-knowledge 類 → 先 probe 再刪                 | jedi 的天真刪法正是 optimizer 要防的 over-cut  |
| Hub-and-Spoke（細節放 references/）     | DEMOTE 裁決（移 references/ 留指標）                 | 哪些內容該降級，由 probe 決定而非直覺          |
| Kitchen Sink（SKILL.md 超過 500 行）    | token_report.py 分 always-loaded 與 on-demand 兩本帳 | 行數是假指標，改寬換行就能達標；token 才是真的 |
| TDD（RED/GREEN/REFACTOR，單次跑）       | 兩版本各跑 3+ 次，比比率不比單次                     | 單次 run 分不出回歸與隨機變異                  |
| Iron Law、指令式語氣                    | direction / corrective 類 → KEEP 或 probe            | jedi 教你怎麼寫，optimizer 測它是否必要        |
| Concrete Verification（對錯範例並排）   | 長範例常落入 DEMOTE                                  | jedi 說要有，optimizer 說放哪裡                |
| Gotchas section（最高價值內容）         | 量測副產品 load-bearing surprises                    | 同一種東西的兩個來源                           |

第一組值得展開。skill-jedi 的 Over-Teaching 條目說「刪掉所有模型已知的基礎解釋」，聽起來理所當然。但 skill-optimizer 的 evidence 裡有個反例：一段看似在教基礎的 pnpm 說明，probe 之後發現模型的預設行為跟這段說明相反。它不是 over-teaching，是 corrective，刪掉行為就退化。憑品味判斷「這模型一定知道」的刪法，正是量測要防的東西。

另一個反例更狠：一個六字短句被 baseline 流程判「完全冗餘」刪掉，行為 probe 實測 0/3，模型沒有這句時完全不會照做，產出的筆記長度直接變成三倍。

## 五個張力點

對映表收的是能對上的部分。下面五處，兩套方法論給出的答案不一樣，前三處是真衝突。

### 重複是武器還是廢話

最尖銳的一條。skill-jedi 的 Training-Data Override 條目說：模型會被訓練資料裡的深層習慣拉回去，解法是在決策點重複關鍵規則，不能只放開頭。Naked Rule 條目說：Iron Law 沒搭配 Rationalization Table，session 中段就會開始被跳過。兩條都把重複當成對抗指令衰減的武器。

skill-optimizer 的 ceremony 類卻是：已下過的指令上再疊一句 you MUST，直接 CUT，連 probe 都不花。理由是「不必花一次 run 證明重複是重複」。

如果 skill-jedi 是對的，重複在決策點有強化效果，那 skill-optimizer 會盲砍掉承重的重複，因為 ceremony 類不經量測。它唯一的安全網是最後的回歸驗證，但單回合、跑 3 次的短任務回歸，未必觸發「session 中段開始跳過規則」的情境。

這個衝突該用 optimizer 自己的方法解決：把「決策點的重複」從 ceremony 類移出來，當 corrective 看待，帶重複與不帶重複兩個版本，比行為達成率。經驗法則生成假設，量測裁決假設，誰都不用憑信仰吵。

### 強語氣值多少 token

skill-jedi 的 Soft Language Trap 條目主張用 Always、Never、YOU MUST 這類強語氣，引用社群數據說能減少約 50% 違規。skill-optimizer 量的是「這條 claim 該不該存在」，沒有量「同一條 claim 換個語氣，行為差多少」。COMPRESS 裁決決定長度，不決定強度。

這是個現成的擴充點：phrasing probe。同一條 claim 寫成建議式、指令式、YOU MUST 加 code block 三種強度，各跑行為機率。這能把 jedi 那個 50% 從 folklore 變成對特定模型的量測值，也可能發現新一代模型上強語氣根本不需要。模型演進會讓 anti-pattern 目錄過期，這正是量測存在的理由。

### 單回合 probe 看不見長 session 的衰減

skill-optimizer 的 behaviour probe 明訂任務要小到一回合內完成，回歸也是短任務。但 skill-jedi 有三條 anti-patterns（Context Bleed、Correction Loop、Naked Rule 的中段衰減）全部發生在長 session。

所以 optimizer 能證明「slim 版在乾淨 context 下行為不變」，證明不了「在塞了 80K token 雜訊的 context 下行為不變」。被判冗餘砍掉的重複，可能正是長 session 裡對抗指令稀釋的錨點。這是它方法論上真正的量測盲區，而以它自己的誠實標準，它應該會承認。

### 連「什麼不用量測」都要量測

skill-jedi 的哲學說 judgment 是 skill 的核心價值；skill-optimizer 也把 direction 類（優先序與取捨這類方向指令）豁免於量測，理由是「這是 skill 存在的理由」。兩者在這裡完全同調。

但 optimizer 對自己更狠。它的 direction-audit 發現這條豁免只有一句斷言撐著，卻覆蓋了自己 30% 的 token，於是設計實驗去測豁免本身。其中一個探針為了防洩題，給密封模型八條混合指令、只准保留三條，看它會不會自發地豁免 direction 類。初步訊號：六條被豁免的 direction claim 裡，有一條被判完全冗餘。

這個態度值得 pattern catalog 學：連「什麼不用量測」本身都是可以量測的宣稱。skill-jedi 的 22 條 anti-patterns 裡，有幾條自己就通不過這個標準？

### description 是 optimizer 明確不管的地盤

skill-optimizer 把 frontmatter description 列為 out of scope：它是觸發機制，縮短的代價是 skill 不觸發，跟內文瘦身是兩回事。skill-jedi 恰好最強在這裡，有四條 trigger anti-patterns（Phantom Trigger、Silent Misfire、Cross-Fire、Third-Person Mismatch）和 5+ 提示詞的觸發測試法。

這組是互補，但 jedi 的觸發測試也是單次手測。optimizer 的「3 次一致、比率化」方法可以直接移植過來，做成 description probe：一組應觸發與不應觸發的 prompt，各跑 N 次，量觸發率。這大概是兩套方法合體最順手的一個新工具。

## 給 skill-optimizer 的六個切入點

從 skill-jedi 的視角看，依價值排序：

1. Ceremony 類不該全免測。把「決策點的重複」與純客套分開，前者當 corrective 探測。目前的盲砍是整條管線裡唯一沒有證據的刀。
2. 加長 session 衰減探測。回歸驗證加一種汙染 context 變體：長前置雜訊加任務，測 slim 版在指令稀釋下是否仍達標。
3. 加語氣強度維度。COMPRESS 之外加 phrasing probe，量強語氣的邊際效果；`optimized-for:` 的意義順勢擴充成「這個語氣是為這個模型調的」。
4. 做 description probe。把密封探測方法移植到觸發率量測，補上自己劃為 out of scope 的地盤。
5. 建 Gotchas 回饋迴圈。量測發現的 load-bearing surprises 目前只進報告，應該寫回目標 skill 的 Gotchas section，讓 optimizer 從一次性 pass 變成維護迴圈的一環。
6. 文件化與靜態審查的順序：先 skill-review 修結構，後 skill-optimizer 量內容。span surgery 保結構是 feature，但也代表結構性 anti-patterns 它永遠看不見。

## 反過來：量測方法能為 pattern 目錄做什麼

這個方向對 skill-jedi 的意義可能更大。

目錄裡的量化宣稱，50% 違規下降、20% 到 90% 的觸發率、2.12 倍風險，全是引用而非量測。用 probe 方法對每條 anti-pattern 建立「在當前模型上還成立嗎」的複測，目錄就從靜態 lore 變成帶版本的量測結果，等於給 anti-patterns 目錄加上 `optimized-for:`。

這順便解決過期問題。Over-Teaching 的門檻隨模型變強而移動，昨天需要教的，今天是 general knowledge。jedi 目錄沒有失效機制；optimizer 的世界觀是結果綁定模型，正好補上。

最後，skill-jedi 自己就是量測對象。它的 SKILL.md 寫得密集又自律，但按 optimizer 的標準，每條 pattern 宣稱都該被問一句：measured or measurable？對它實際跑一次 skill-optimizer，會是檢驗這篇文章論點最直接的實驗。

skill-optimizer 對自己做過這件事。自我優化砍掉 12.7% 的 token，同時保住了品味編輯最先會砍的區塊：三個密封模型看了該區塊的 probe 結果，全都開出它明文禁止的過度刪減處方。它的 benchmark 也誠實。三個真實 skill 各 13 條 assertion，有 plugin 39/39，沒 plugin 20/39，而差異幾乎全集中在 evidence 類 assertion，量出來的差距在可驗證性，不在刪減品質。這個工具沒把自己包裝成比人會砍；它給的保證是每一刀都留得下證據。

## 結語

linter 和 profiler 沒有誰取代誰：靜態規則抓已知模式，動態量測抓真實行為，成熟的工程兩者都要。skill 生態正在重演軟體工程走過的路，從 90 年代 [patterns 運動](https://zh.wikipedia.org/wiki/%E8%AE%BE%E8%AE%A1%E8%8C%83%E4%BE%8B)的 best practices 手冊，走向做實驗的 [empirical software engineering](https://en.wikipedia.org/wiki/Empirical_software_engineering)。skill-jedi 是 GoF，skill-optimizer 是做實驗的人。

經驗法則便宜，量測貴，但 skill 的成本是每次調用都在付的。哪幾條法則在你的模型上還成立，這個答案值得花幾十個 subagent 去買。

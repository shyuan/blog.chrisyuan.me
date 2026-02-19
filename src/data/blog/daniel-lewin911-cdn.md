---
title: "Daniel Lewin：911 事件的第一位犧牲者與 CDN 技術革命先驅"
pubDatetime: 2025-05-08T06:36:57.000Z
slug: "daniel-lewin911-cdn"
description: "從丹佛到耶路撒冷：塑造英雄的成長歷程 1970 年 5 月 14 日，Daniel Mark Lewin 出生於美國科羅拉多州丹佛市的一個知識份子家庭。父親 Charles 是精神科醫師，母親 Peggy 是小兒科醫師。在這個重視教育的猶太家庭中，Daniel 從小就展現出非凡的活力和智慧。家裡的早餐麥片盒常被父親貼上《科學美國人》的文章剪報，餐桌上的話題不是卡通，而是無限概念和賽局理論。 14"
tags:
  - "911"
  - CDN
  - akamai
  - consistent-hashing
---

## Table of contents

## 從丹佛到耶路撒冷：塑造英雄的成長歷程

1970 年 5 月 14 日，[Daniel Mark Lewin](https://en.wikipedia.org/wiki/Daniel_Lewin) 出生於美國科羅拉多州丹佛市的一個知識份子家庭。父親 Charles 是精神科醫師，母親 Peggy 是小兒科醫師。在這個重視教育的猶太家庭中，Daniel 從小就展現出非凡的活力和智慧。家裡的早餐麥片盒常被父親貼上[《科學美國人》](https://www.scientificamerican.com/)的文章剪報，餐桌上的話題不是卡通，而是無限概念和[賽局理論](https://en.wikipedia.org/wiki/Game_theory)。

14 歲那年，父親 Charles 出於猶太復國主義理想，決定舉家遷往以色列。這個決定徹底改變了 Daniel 的人生軌跡。剛開始，他對這次搬遷充滿抵觸，但隨著時間推移，以色列成為了塑造他性格的熔爐。正如傳記作家 Molly Knight Raskin 所說：「搬到以色列就像在他的內心點燃了一把火，讓他想要榨取生命中每一分每一秒的價值。」

## 軍事生涯：從普通士兵到特種部隊軍官

18 歲生日那天，Daniel 收到了[以色列國防軍](https://en.wikipedia.org/wiki/Israel_Defense_Forces)的徵召令。憑藉驚人的決心和毅力，他不僅通過了嚴苛的訓練，還成功進入了以色列最精銳的特種部隊——[總參謀部偵察部隊(Sayeret Matkal)](https://en.wikipedia.org/wiki/Sayeret_Matkal)。這支部隊被《名利場》雜誌譽為「世界上最有效的反恐部隊」，以 [1976 年恩德培機場人質營救行動](https://en.wikipedia.org/wiki/Entebbe_raid)而聞名於世。

要進入這支只有 200 名全職突擊隊員的部隊極其困難。在每一輪選拔中，數千名申請者經過兩輪嚴酷的測試營，最終只有 20 到 40 人能夠入選。對於像 Daniel 這樣的非以色列本土出生者來說，被錄取幾乎是不可能的事情。然而，他不僅成功入選，還在三年後晉升為上尉。

在部隊期間，Daniel 學習了阿拉伯語，深入研究恐怖主義。他的戰友描述他身材魁梧如橄欖球後衛，力量驚人，曾經能臥推超過 300 磅。一位軍中好友回憶說，Daniel 可以僅憑一張信用卡、一支筆，甚至赤手空拳就能制服武裝恐怖分子。

%[https://www.youtube.com/watch?v=QjSvSI-d78I]

## 學術成就：從 Technion 到 MIT 的輝煌歷程

服役期間，Daniel 展現了驚人的多工處理能力。他一邊在 IBM 海法研究實驗室擔任全職研究員和項目負責人，一邊在[以色列理工學院(Technion)](https://en.wikipedia.org/wiki/Technion_%E2%80%93_Israel_Institute_of_Technology)攻讀計算機科學和數學雙學位。在 IBM 期間，他領導開發了 Genesys 系統——一個在 IBM 和 AMD 等公司廣泛使用的處理器驗證工具。

1995 年，Daniel 以最優等成績（summa cum laude）從 Technion 畢業，並被評為當年計算機工程系的傑出學生。同年，他前往[美國麻省理工學院(MIT）](https://en.wikipedia.org/wiki/Massachusetts_Institute_of_Technology)攻讀博士學位，進入了美國頂尖的計算機科學項目之一。

## 革命性創新：Consistent Hashing 演算法的誕生

在 MIT 期間，Daniel 與指導教授 [F. Thomson Leighton](https://www.invent.org/inductees/tom-leighton) 及 [David Karger](https://en.wikipedia.org/wiki/David_Karger) 合作，發表了具有革命性意義的論文[《Consistent hashing and random trees: distributed caching protocols for relieving hot spots on the World Wide Web》](https://dl.acm.org/doi/10.1145/258533.258660)。這篇論文提出的 Consistent Hashing 演算法，解決了 [CDN(Content delivery network)](https://en.wikipedia.org/wiki/Content_delivery_network) 的根本問題。

[Consistent Hashing](https://en.wikipedia.org/wiki/Consistent_hashing) 是一種特殊的 Hash 函數，當函數的範圍發生變化時，它能將影響降到最低。在分佈式快取系統中，當增加或移除節點時，這種演算法能確保只有極少數的快取對象需要重新映射，從而大大提高了系統的擴展性和穩定性。這項創新成為了 CDN（內容分發網路）技術的核心基礎。

## Akamai：從學術論文到商業帝國

1998 年，基於 Consistent Hashing 演算法的突破性發現，28 歲的 Daniel 與 [Thomson Leighton](https://en.wikipedia.org/wiki/F._Thomson_Leighton) 教授共同創立了 [Akamai Technologies](https://en.wikipedia.org/wiki/Akamai_Technologies)。公司名稱來自夏威夷語，意為「聰明」或「酷」，是 Daniel 在一位同事的建議下從夏威夷語詞典中找到的。

Akamai 的使命是讓 Internet 變得快速、可靠且安全。公司開發的 CDN 技術能夠有效地將網站內容分發到全球各地的邊緣伺服器，讓用戶能從最近的位置獲取所需內容，大幅提升訪問速度並減少網絡擁塞。

作為 CTO，Daniel 將他的軍事紀律和學術嚴謹完美結合。他以「雷龍」（Brontosaurus）的綽號聞名，象徵著他強大的力量和不懈的工作熱情。在他的領導下，Akamai 迅速成長，並於 1999 年成功上市，市值一度超過 200 億美元。

%[https://www.youtube.com/watch?v=1RQE8z_vQu0]

## 最後的航程：911 恐怖攻擊的第一位犧牲者

2001 年 9 月 11 日清晨，Daniel 搭上了從波士頓飛往洛杉磯的[美國航空 11 號班機](https://en.wikipedia.org/wiki/American_Airlines_Flight_11)，準備前往參加一個商務會議。根據 911 調查委員會的報告，Daniel 可能是第一個發現劫機犯異常行為的乘客。基於他的反恐經驗，他很可能試圖制服坐在前排的劫機犯 Mohamed Atta 或 Abdulaziz al-Omari，但卻被坐在他身後的另一名劫機犯 Satam al-Suqami 從背後刺殺。

空乘人員在通話中報告 Daniel 的喉嚨被歹徒割斷，使他成為 [911 恐怖攻擊](https://en.wikipedia.org/wiki/September_11_attacks)的第一位犧牲者。隨後，這架飛機撞入了世貿中心北塔。Daniel 身後留下了妻子 Anne 和兩個年幼的兒子——8 歲的 Itamar 和 5 歲的 Eitan。

## 持續的影響：Danny 的遺產

儘管 Daniel 英年早逝，但他的貢獻和精神繼續影響著世界。諷刺的是，正是他創建的 Akamai 技術，確保了在 911 事件當天，大多數主要新聞網站能夠在巨大的流量壓力下保持正常運作，讓全世界能夠及時獲取這場悲劇的資訊。

2017 年，Daniel Lewin 和 Thomson Leighton 因其在CDN技術上的開創性貢獻，[被列入美國國家發明家名人堂](https://news.mit.edu/2017/leighton-lewin-named-national-inventors-hall-of-fame-0202)。如今，Akamai 已成為全球 CDN 和雲端安全服務的領導者，擁有超過 6,100 名員工，為包括 Airbnb、Apple、BMW、eBay在內的世界頂級品牌提供服務。

%[https://www.youtube.com/watch?v=5wOGj2kVMuY]

Akamai 現任 CEO Tom Leighton 在談到與 Uniqlo 合作推出「Peace for All」慈善T恤時，特別提到了對和平理念的深刻理解。這件T恤上印著Akamai 網路安全解決方案的部分程式碼，象徵著科技力量對和平的貢獻。對於 Leighton 來說，這份對和平的追求顯然與他失去摯友和合作夥伴 Daniel 的經歷密不可分。

%[https://www.youtube.com/watch?v=jfKEm5_0BNo]

## 未竟的夢想：如果...

Daniel 的朋友們常常思考著那些「假如」：假如他活著，可能會完成困擾他的博士學位；假如他活著，可能會進入以色列政壇；假如他活著，可能會成為像 Bill Gates 或 Steve Jobs 一樣的科技界家喻戶曉的名字。

%[https://twitter.com/TomLeightonAKAM/status/1304393537971261441]

儘管 Daniel 的生命只有短短 31 年，但他留下的遺產卻是永恆的。他不僅是網路革命的先驅，更是一個將智慧、勇氣和奉獻精神完美結合的典範。正如他的好友所說

> 那些認識他的人都覺得，世界失去了一個真正的天才。

Daniel Lewin 的一生，是天才與英雄的完美結合。從以色列特種部隊的精英戰士，到 MIT 的傑出學者，再到改變網路發展的科技企業家，他的每一個身份都體現了追求卓越的精神。而在生命的最後時刻，他再次展現了軍人的本色，成為第一個試圖阻止 911 恐怖攻擊的英雄。

今天，當我們享受著快速穩定的網路服務時，不妨記住這位非凡的人物—— Daniel Lewin，一個用短暫生命改變了世界的傳奇。

## 參考文章

- [The Genius Who Perished on Flight 11](https://www.psychologytoday.com/us/articles/201309/the-genius-who-perished-flight-11)
- [Professor Tom Leighton and Danny Lewin SM ’98 named to National Inventors Hall of Fame](https://news.mit.edu/2017/leighton-lewin-named-national-inventors-hall-of-fame-0202)
- [No Better Time: The Brief, Remarkable Life of Danny Lewin, the Genius Who Transformed the Internet](https://world.hey.com/davidsenra/no-better-time-the-brief-remarkable-life-of-danny-lewin-the-genius-who-transformed-the-internet-8bfdd0af)
- [The legacy of Danny Lewin, the first man to die on 9/11](https://edition.cnn.com/2013/09/09/tech/innovation/danny-lewin-9-11-akamai/)

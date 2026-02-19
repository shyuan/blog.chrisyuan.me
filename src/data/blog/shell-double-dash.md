---
title: "在 Shell 下 Double Dash (--) 的功用"
pubDatetime: 2025-05-08T05:00:06.000Z
slug: "shell-double-dash"
description: "由於某些原因，系統中產生了一批以 - 開頭的檔案。在 shell 環境下使用各種指令處理這些檔案相當麻煩，因為檔名開頭的 - 會與指令工具的參數選項解析機制產生衝突。同事提供了一個解決方案：在指令和檔名之間加入雙短橫線（--）。 原來在 shell 中，-- 具有特殊意義，代表「選項結束」的標記，告訴指令後面不再有任何選項參數，因此可以正確處理以 - 開頭的檔名。 另外一個簡單的解決方法是在檔名前"
tags:
  - shell
  - cli
  - command-line
---

## Table of contents

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1746680197940/35d3414f-afe5-43ef-b35a-06851ac75199.png align="center")

由於某些原因，系統中產生了一批以 `-` 開頭的檔案。在 shell 環境下使用各種指令處理這些檔案相當麻煩，因為檔名開頭的 `-` 會與指令工具的參數選項解析機制產生衝突。同事提供了一個解決方案：在指令和檔名之間加入雙[短橫線](https://en.wikipedia.org/wiki/Dash)（`--`）。

原來在 shell 中，`--` 具有特殊意義，代表「選項結束」的標記，告訴指令後面不再有任何選項參數，因此可以正確處理以 `-` 開頭的檔名。

另外一個簡單的解決方法是在檔名前加上相對路徑 `./`，這樣也能避免檔名被誤認為選項。

## 參考連結

[What does double-dash do when following a command?](https://stackoverflow.com/questions/26282344/what-does-double-dash-do-when-following-a-command)

[What does "--" (double dash / double hyphen) mean?](https://unix.stackexchange.com/questions/11376/what-does-double-dash-double-hyphen-mean)

[What Does ‐‐ (double dash) Mean In SSH Shell Command?](https://www.cyberciti.biz/faq/what-does-double-dash-mean-in-ssh-command/)

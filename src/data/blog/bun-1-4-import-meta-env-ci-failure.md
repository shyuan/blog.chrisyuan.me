---
pubDatetime: 2026-08-21T12:28:52+08:00
title: 'Expected: true, Received: "true"：bun 1.4 改了 process.env 賦值語意，CI 該釘版了'
slug: "bun-1-4-import-meta-env-ci-failure"
tags:
  - bun
  - ci
  - github-actions
  - postmortem
description: "CI 沒改程式碼卻連續失敗 13 次：setup-bun 抓 latest 拿到剛釋出的 bun 1.4，而 import.meta.env 就是 process.env，1.4 起賦值一律轉字串。附時間線與三處修正。"
draft: false
---

這個部落格的 deploy workflow 每小時跑一次，負責把到點的排程文章 rebuild 上線。2026-08-20 下午開始，它連續失敗 13 次，直到隔天早上我才發現。那段時間我一行程式都沒改，變的是 CI 裡的 bun 版本。

## Table of contents

## 症狀：沒有人改程式碼，CI 卻從某個整點開始全紅

`gh run list` 的畫面很單純，某個時間點之後全是 failure：

```
completed  failure  Deploy to Cloudflare Pages  main  schedule  2026-08-20T14:32:18Z
completed  success  Deploy to Cloudflare Pages  main  schedule  2026-08-20T13:42:26Z
completed  success  Deploy to Cloudflare Pages  main  schedule  2026-08-20T12:40:26Z
```

失敗的是 lint job 的 `bun test`，只掛一個測試：

```
94 |       expect(env.DEV).toBe(true); // guard: the override is actually in effect
                           ^
error: expect(received).toBe(expected)

Expected: true
Received: "true"
```

期望 boolean `true`，拿到字串 `"true"`。而同一份程式碼在我筆電上跑是綠的。

## 時間線指向 bun 的自動升級

把 CI 的失敗時間跟 bun 的 release 時間放在一起看：

| 時間（UTC）      | 事件                                                                      |
| ---------------- | ------------------------------------------------------------------------- |
| 2026-08-20 13:42 | 最後一次成功的 schedule run                                               |
| 2026-08-20 14:07 | [bun v1.4.0](https://github.com/oven-sh/bun/releases/tag/bun-v1.4.0) 釋出 |
| 2026-08-20 14:32 | 第一次失敗的 schedule run                                                 |

中間差 25 分鐘。原因在 workflow 裡：

```yaml
- name: "📦 Setup bun"
  uses: oven-sh/setup-bun@v2
```

[`oven-sh/setup-bun`](https://github.com/oven-sh/setup-bun) 沒帶 `bun-version` 時預設抓 latest，所以 14:07 之後開的 runner 拿到的就是剛出爐的 1.4.0。翻 run log 可以看到那一行：

```
Downloading a new version of Bun: .../bun-v1.4.0/bun-linux-x64.zip
```

我的筆電當時還是 5 月裝的 1.3.14，本機和 CI 的差別就只有這一項。

## bun 1.4 讓 process.env 的賦值一律轉成字串

出問題的測試在驗證 `postFilter` 的 dev 分支。排程發文在開發模式要跳過時間檢查，這樣未來日期的草稿在本機才看得到。測試的做法是直接改 `import.meta.env.DEV`：

```ts
env.DEV = true;
expect(env.DEV).toBe(true); // guard: the override is actually in effect
```

關鍵是 [bun 文件](https://bun.com/docs/runtime/environment-variables)寫的這句：`Bun.env` 和 `import.meta.env` 都是 `process.env` 的 alias。也就是說，這行寫進去的地方就是 `process.env`，而 Node 的規格是 `process.env` 的賦值一律轉成字串。bun 過去只在部分路徑這樣做，1.4 把剩下的也補上了，但這件事的官方紀錄有點微妙：專做這項修正的 [PR #34728](https://github.com/oven-sh/bun/pull/34728) 至今是 open、從未合併，而且在 [1.4 的 breaking changes 清單](https://github.com/oven-sh/bun/issues/28792)裡被列在「did not ship in 1.4」區段。行為的改變來自隨 1.4 合併的 [PR #31831](https://github.com/oven-sh/bun/pull/31831)，它 port 了 Node v26.3.0 的 process 相容測試，說明的第一項就是「`process.env` 現在是符合 Node 語意的 exotic object，每個賦值都會轉成字串」。清單裡確實有 #31831，但列的是 warnings 與 `execve` 那幾項，沒提到 env 賦值這件事。

用一支小程式在兩個版本上對照：

```ts
const env = import.meta.env as unknown as Record<string, unknown>;
console.log(
  "import.meta.env === process.env :",
  (import.meta.env as unknown) === (process.env as unknown)
);
env.PROBE = true;
console.log(
  "after env.PROBE = true →",
  typeof env.PROBE,
  JSON.stringify(env.PROBE)
);
```

|                                   | bun 1.3.14     | bun 1.4.0       | Node            |
| --------------------------------- | -------------- | --------------- | --------------- |
| `import.meta.env === process.env` | `true`         | `true`          | —               |
| 寫入 `true` 之後讀回              | `boolean true` | `string "true"` | `string "true"` |

換句話說，bun 是往 Node 的行為靠，我的測試則寫死在它的舊行為上。

## 線上網站其實一直是好的

這個字串化不會影響已經部署的站台。Astro 在 build 時由 Vite 把 `import.meta.env.DEV` 靜態替換成 `false`，production bundle 裡根本沒有這個查詢；`bun test` 則是直接跑 TypeScript 原始碼，沒有 Vite 的替換，`import.meta.env` 就真的是 bun 的 `process.env`，測試也因此得手動塞值。

實作本身也有個小瑕疵，是改完 guard 之後跳出第二個失敗才讓我注意到的：

```ts
return !data.draft && (import.meta.env.DEV || isPublishTimePassed);
```

`||` 會把左側的真值原封不動回傳。bun 1.4 下 `import.meta.env.DEV` 是字串 `"true"`，所以 `postFilter()` 回傳的是 `"true"` 而不是 `true`。函式簽章寫著回傳 boolean，實際上不保證。

## 三個地方各改一點

測試那行 guard 只是要確認覆寫生效，而 `postFilter` 對這個值只做真值判斷，所以斷言 truthy 就夠了：

```diff
-      expect(env.DEV).toBe(true);
+      expect(env.DEV).toBeTruthy();
```

實作端把值收斂成 boolean，回傳型別就不再受 env 內容影響：

```diff
-  return !data.draft && (import.meta.env.DEV || isPublishTimePassed);
+  return !data.draft && (Boolean(import.meta.env.DEV) || isPublishTimePassed);
```

最後是 CI，四處 `setup-bun` 都釘上版本，本機也用 `brew upgrade bun` 升到同一版：

```diff
       - name: "📦 Setup bun"
         uses: oven-sh/setup-bun@v2
+        with:
+          bun-version: 1.4.0
```

改完之後 1.3.14 和 1.4.0 兩個版本的 `bun test` 都是 32 pass、0 fail，`bun run build` 也在 1.4.0 下跑完。

## 驗證新版 bun 不用先動本機環境

修之前我需要先在本機重現 CI 的失敗。裝一份指定版本到暫存目錄就行，不必動系統上的 bun：

```bash
export BUN_INSTALL=/tmp/bun140
curl -fsSL https://bun.sh/install | bash -s "bun-v1.4.0"
/tmp/bun140/bin/bun test
```

有件事要提醒：install script 只會把檔案寫進 `BUN_INSTALL` 指定的目錄，不會動到系統裡原本的 bun。但也因此，PATH 上的 `bun` 還是舊的那支，記得像上面一樣用絕對路徑呼叫，不然跑到的還是舊版，白裝一場。

## 真正該檢討的是 CI 設定，不是 bun

這次故障的成本不是那一個測試，而是 lint job 擋在 deploy 前面，連帶讓網站十四個小時沒有 rebuild。這個站的排程發文靠 `pubDatetime` 加上每小時的 cron rebuild，內容不更新等於排程文章不會上線。

CI 的 runtime 不釘版，等於把上游的每一次 release 都當成自己的部署事件，而且它會挑在你沒看螢幕的時候發生。釘版之後升級就變成一次明確的改動，測試在 PR 裡先跑過。同樣要緊的是本機跟 CI 用同一版：我的筆電停在三個月前的 1.3.14，CI 早就跑在新版上，本機測試綠燈其實沒保證任何事。

`Boolean()` 那一行則是意外的收穫，那個型別瑕疵放著也不會壞事，但既然被翻出來就順手補掉。

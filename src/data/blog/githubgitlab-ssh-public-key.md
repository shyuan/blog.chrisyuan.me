---
title: "用 GitHub/GitLab 公開端點取得 SSH Public Key：一行指令幫同事開 Server 權限"
pubDatetime: 2020-01-06T07:09:42.000Z
modDatetime: 2026-10-30T00:00:00.000Z
slug: "githubgitlab-ssh-public-key"
tags:
  - ssh
  - github
  - gitlab
description: "幫同事開 Server 權限不用再透過 Slack 貼 SSH public key。利用 GitHub 與 GitLab 的 .keys 公開端點、API 或 ssh-import-id，一行 curl 就能匯入 authorized_keys。"
draft: false
---

幫同事開機器權限時，最常見的對話大概是：「欸，傳一下你的 SSH public key 給我。」接著對方把 key 貼進 Slack 或 Email，結果換行被吃掉、前後多了空白，貼進 `authorized_keys` 還是登不進去，又得來回確認半天。

其實只要對方有 GitHub 或 GitLab 帳號，一行 `curl` 就能直接從公開端點拉下他的 public key。

## Table of contents

## 為什麼 SSH Public Key 可以公開？

SSH 金鑰是一組非對稱加密的 key pair：

- **Private key（私鑰）**：留在自己的電腦裡，絕對不能外洩
- **Public key（公鑰）**：顧名思義，就是設計來公開的

Public key 的用途是讓遠端伺服器驗證「你確實持有對應的 private key」，從數學上無法由 public key 反推出 private key。因此把 public key 放在網路上公開查詢，本來就是它被設計出來的使用方式。

## 各平台公開端點與 API 查詢方式

### `.keys` 純文字端點（最快）

GitHub 和 GitLab 都提供免認證的公開端點，把網址中的 `{username}` 換成對方的帳號即可：

- **GitHub**：`https://github.com/{username}.keys`
- **GitLab**：`https://gitlab.com/{username}.keys`

以 Linux 大神 Linus Torvalds 的 GitHub 帳號為例，用 `curl` 一行搞定：

```bash
curl https://github.com/torvalds.keys
```

### 用 REST API 取得建立時間等 Metadata

`.keys` 端點只會回傳純文字的公鑰內容。如果你想進一步查看每把 key 的 ID、建立時間（`created_at`）或最後使用時間（`last_used`），可以改打 [GitHub REST API](https://docs.github.com/en/rest/users/keys#list-public-keys-for-a-user)：

```bash
curl https://api.github.com/users/torvalds/keys
```

回傳的 JSON 會包含完整欄位：

```json
[
  {
    "id": 1306333,
    "key": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCoQ9S7...",
    "created_at": "2014-03-04T00:00:00Z",
    "last_used": "2026-10-28T18:09:13Z"
  }
]
```

[GitLab Users API](https://docs.gitlab.com/api/user_keys/#list-all-ssh-keys-for-a-user) 也有對應端點，直接填入 `username` 或數值 `user_id` 都能查詢，還會額外回傳這把 key 的名稱（`title`）與到期日（`expires_at`）：

```bash
curl https://gitlab.com/api/v4/users/{username}/keys
```

### 其他程式碼託管平台支援度

除了 GitHub 與 GitLab，自架的 Git 平台多半也沿用了相同的慣例：

| 平台      | 公開端點           | 備註                                                                             |
| --------- | ------------------ | -------------------------------------------------------------------------------- |
| GitHub    | `/{username}.keys` | 支援                                                                             |
| GitLab    | `/{username}.keys` | 支援（含自架 GitLab instance）                                                   |
| Gitea     | `/{username}.keys` | 支援（含自架 Gitea instance）                                                    |
| Codeberg  | `/{username}.keys` | 支援（基於 Forgejo / Gitea）                                                     |
| Bitbucket | 無                 | 無 `.keys` 路徑；雖有公開 API `/2.0/users/{account_id}/ssh-keys`，但無法用帳號查 |

自架的 GitLab 與 Gitea 只要把 domain 換成公司內部的 instance 網址，路徑格式完全相同。

## 實戰場景：幫同事開 Server 權限

知道公開端點後，幫同事開伺服器權限就不用再手動複製貼上了。

### 用 `curl` 直接寫入 `authorized_keys`

最直接的做法是用 `curl` 把對方的 key 附加到 `~/.ssh/authorized_keys`：

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
curl -fsSL https://github.com/{username}.keys >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

加上 `chmod 700` 與 `chmod 600` 是因為 OpenSSH 對目錄與檔案權限非常嚴格——如果是全新建立的系統帳號，權限過寬會導致 SSH 拒絕讀取 `authorized_keys`。

在寫 Ansible playbook 或 cloud-init 初始化腳本時，這個端點也特別好用，機器開起來就能直接從 GitHub 拉取團隊成員的公鑰。

### Ubuntu 內建神器：`ssh-import-id`

如果你用的是 Ubuntu，系統預設已經內建 [`ssh-import-id`](https://launchpad.net/ssh-import-id) 這個工具，背後做的事情一模一樣，但連建立目錄、設定權限與去除重複 key 都幫你處理好了：

```bash
# 從 GitHub 匯入
ssh-import-id gh:torvalds

# 從 Launchpad 匯入
ssh-import-id lp:kirkland
```

AWS EC2 等雲端主機開機時執行的 `cloud-init`，底層就是呼叫 `ssh-import-id` 來匯入使用者金鑰。

> **維運小提醒**：一個人的 GitHub 帳號可能綁定了好幾台電腦（包含多年前淘汰的舊筆電）的公鑰。直接整包匯入雖然方便，但當人員異動或需要撤銷權限時，別忘了清理對應的紀錄。

## 從 Key 前綴看出對方的加密演算法

拉下來的公鑰字串開頭會標示演算法類型，順便也能看出對方這把 key 的年代與安全性：

| 前綴                         | 演算法         | 備註                                                                                                                                                                                           |
| ---------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ssh-ed25519`                | Ed25519        | **目前首選**，金鑰短、運算快、安全性高                                                                                                                                                         |
| `sk-ssh-ed25519@openssh.com` | Ed25519 + FIDO | 搭配硬體安全金鑰（如 YubiKey），需實體觸碰才能驗證                                                                                                                                             |
| `ssh-rsa`                    | RSA            | 老牌演算法，建議至少 3072 bits。[GitHub 自 2022 年起](https://github.blog/security/application-security/improving-git-protocol-security-github/)已停用舊版 SHA-1 簽章，改走 `rsa-sha2-256/512` |
| `ecdsa-sha2-nistp256`        | ECDSA          | 基於 NIST 曲線，密碼學界對其常數生成方式存疑（見 [SafeCurves](https://safecurves.cr.yp.to/)），通常建議改用 Ed25519                                                                            |

如果看到同事還在用早期的短位數 `ssh-rsa`，可以順手推坑他換成 `ed25519`：

```bash
ssh-keygen -t ed25519 -C "your@email.com"
```

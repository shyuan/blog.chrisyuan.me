---
title: "列出 GitHub/GitLab 上某位使用者的 SSH Public Key"
pubDatetime: 2020-01-06T07:09:42.000Z
slug: "githubgitlab-ssh-public-key"
tags:
  - ssh
  - github
  - gitlab
description: "SSH public key 本來就是設計給別人看的。透過 GitHub/GitLab 的公開端點，一行 curl 就能拿到同事的 public key，省去「欸你傳一下你的 key」的來回。"
draft: false
---

## Table of contents

## 為什麼可以公開？

SSH 金鑰是一組非對稱加密的 key pair：

- **Private key**：留在自己的電腦裡，絕對不能外洩
- **Public key**：顧名思義，就是設計來公開的

Public key 的用途是讓對方驗證「你確實持有對應的 private key」，它本身不能反推出 private key。所以把 public key 放在網路上完全沒有安全疑慮——這正是它被設計出來的使用方式。

## 取得方式

GitHub 和 GitLab 都提供公開端點，把 `{username}` 換成對方的帳號就好：

- GitHub: `https://github.com/{username}.keys`
- GitLab: `https://gitlab.com/{username}.keys`

用 `curl` 一行搞定：

```bash
curl https://github.com/torvalds.keys
```

## 什麼時候會用到？

最常見的場景是 **幫同事開 server 權限**。

傳統做法是請對方把 public key 貼到 Slack 或 email 給你，但格式常常跑掉（換行被吃掉、多了空白），貼錯了還要來回確認。

如果對方有 GitHub 帳號，直接 curl 下來寫進 `authorized_keys` 就好：

```bash
curl https://github.com/{username}.keys >> ~/.ssh/authorized_keys
```

自動化部署工具（Ansible、cloud-init 等）也常用這招，在機器初始化時直接從 GitHub 拉 key，不用手動搬檔案。

## Ubuntu 內建的 ssh-import-id

Ubuntu 預裝了 `ssh-import-id` 這個工具，背後做的事情一樣，但包裝得更方便：

```bash
# 從 GitHub 匯入
ssh-import-id gh:torvalds

# 從 Launchpad 匯入
ssh-import-id lp:username
```

它會自動把 key 寫進 `~/.ssh/authorized_keys`，還會幫你設好檔案權限。AWS EC2 開機時跑的 cloud-init，預設就是用這個工具來匯入金鑰的。

## 用 GitHub API 取得更多資訊

`.keys` 端點只會回傳純文字的 key 內容。如果你想知道每把 key 的建立時間、ID 等 metadata，可以用 GitHub API：

```bash
curl https://api.github.com/users/torvalds/keys
```

回傳的 JSON 長這樣：

```json
[
  {
    "id": 123456,
    "key": "ssh-ed25519 AAAA..."
  }
]
```

GitLab 也有對應的 API：

```bash
curl https://gitlab.com/api/v4/users/{user_id}/keys
```

## 從 key 可以看出什麼？

拉下來的 key 開頭會標示演算法類型，常見的有：

| 前綴                         | 演算法         | 備註                               |
| ---------------------------- | -------------- | ---------------------------------- |
| `ssh-rsa`                    | RSA            | 老牌演算法，建議至少 3072 bits     |
| `ssh-ed25519`                | Ed25519        | 目前推薦，key 短、速度快、安全性高 |
| `ecdsa-sha2-nistp256`        | ECDSA          | 不建議，NIST 曲線有爭議            |
| `sk-ssh-ed25519@openssh.com` | Ed25519 + FIDO | 硬體安全金鑰（YubiKey 等）         |

如果你看到某人還在用 `ssh-rsa`，可以友善提醒一下換成 `ed25519`：

```bash
ssh-keygen -t ed25519 -C "your@email.com"
```

## 其他平台支援

不是每個平台都有這麼方便的端點：

| 平台      | 公開端點           | 備註                     |
| --------- | ------------------ | ------------------------ |
| GitHub    | `/{username}.keys` | 有                       |
| GitLab    | `/{username}.keys` | 有（含自架 GitLab）      |
| Bitbucket | 無                 | 只能透過 API，且需要認證 |
| Gitea     | `/{username}.keys` | 有，跟 GitHub 一樣       |
| Codeberg  | `/{username}.keys` | 有（基於 Gitea）         |

自架的 GitLab 和 Gitea 也支援一樣的路徑格式，把 domain 換成你的 instance 就好。

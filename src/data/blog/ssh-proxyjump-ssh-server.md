---
title: "利用 ssh ProxyJump 直接連上內部 ssh server"
pubDatetime: 2021-01-28T02:09:08.000Z
slug: "ssh-proxyjump-ssh-server"
description: "可以在 ssh 使用 -J 參數指定 bastion server 和 internal server 就可以直接連上內部 ssh server % ssh -J bastion-server-hostname internal-server-hostname 如果是用 public key 認證，而且 key 有設定 passphrase 的話，可以先執行 ssh-add ~/.ssh/priv"
tags:
  - ssh
---

可以在 ssh 使用 `-J` 參數指定 bastion server 和 internal server 就可以直接連上內部 ssh server

```
% ssh -J bastion-server-hostname internal-server-hostname
```

如果是用 public key 認證，而且 key 有設定 passphrase 的話，可以先執行 `ssh-add ~/.ssh/private_key` 把 agent 掛起來，就不需要一直輸入 passphrase 了。

也可以在 `~/.ssh/config` 設定 ssh 連線 profile：

```
Host my-bastion
    Hostname bastion.mydomain.com
    IdentityFile ~/.ssh/id_ed25519
    User my_username

Host my-internal
    Hostname internal.mydomain.com
    IdentityFile ~/.ssh/id_ed25519
    User my_username
    ProxyJump my-bastion
```

這樣就可以直接用 `ssh my-internal` 連進去 internal server。

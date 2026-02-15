---
title: "使用 ssh-copy-id 將 ssh public key 存到遠端 ssh server 上"
pubDatetime: 2020-01-06T14:07:00.000Z
slug: "ssh-copy-id-ssh-public-key-ssh-server"
description: "如果 ssh key 不是預設的 RSA 演算法產生，例如 ed25519 或是儲存位置不是在預設的 ~/.ssh/ 下，可以用 -i 參數另外指定。 如果遠端 SSH server 的 port 不是預設的 22 port，可以用 -p 參數指定。 範例如下： % ssh-copy-id -i .ssh/id_ed25519.pub -p 22222 remote_user_name@192."
---

- 如果 ssh key 不是預設的 RSA 演算法產生，例如 ed25519 或是儲存位置不是在預設的 ~/.ssh/ 下，可以用 `-i` 參數另外指定。
- 如果遠端 SSH server 的 port 不是預設的 22 port，可以用 `-p` 參數指定。

範例如下：

```
% ssh-copy-id -i .ssh/id_ed25519.pub -p 22222 remote_user_name@192.168.1.1
```

參考資料：

- [Simple method to copy the public key to the remote server](https://wiki.archlinux.org/index.php/SSH_keys#Simple_method)

---
title: "透過 oh-my-zsh 使用 ssh-agent"
pubDatetime: 2020-01-06T07:06:36.000Z
slug: "oh-my-zsh-ssh-agent"
description: "如果你的 ssh key 有設定 passphrase，要用 git 拉資料會很麻煩，每次都要重新輸入一次 key 的 passphrase 證明你是該把 key 的擁有者。 可以參考 Arch Linux Wiki 的 SSH Keys 條目設定 ssh-agent ，讓 agent 幫你把 passphrase 記住一段時間。 如果 shell 是用 zsh ，而且也有用 oh-m"
---

## Table of contents

如果你的 ssh key 有設定 passphrase，要用 git 拉資料會很麻煩，每次都要重新輸入一次 key 的 passphrase 證明你是該把 key 的擁有者。

可以參考 Arch Linux Wiki 的 [SSH Keys](https://wiki.archlinux.org/index.php/SSH_keys#SSH_agents) 條目設定 [ssh-agent](https://www.ssh.com/ssh/agent) ，讓 agent 幫你把 passphrase 記住一段時間。

如果 shell 是用 [zsh](https://www.zsh.org/) ，而且也有用 [oh-my-zsh](https://ohmyz.sh/) 的話，其實 oh-my-zsh 裡就有 [ssh-agent plugin](https://github.com/robbyrussell/oh-my-zsh/tree/master/plugins/ssh-agent) 可以幫你設定管理 ssh-agent，只要在 .zshrc 加上以下設定：

1. plugins 列表多增加 ssh-agent。
2. 在 `source $ZSH/oh-my-zsh.sh` 之前加上兩行變數設定，一行設定 identities 指定要用哪一把 key，另一行設定 lifetime 指定 passphrase 要記多久，超過這個時間就要重新輸入一次。如果想要安全性高一點可以給比較短的時間例如 30 分鐘，如果單純覺得方便就好，可以給個 24h 一天輸一次。

```
...
plugins=(... ssh-agent ...)zstyle :omz:plugins:ssh-agent identities id_ed25519
zstyle :omz:plugins:ssh-agent lifetime 24hsource $ZSH/oh-my-zsh.sh
...
```

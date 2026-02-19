---
title: "選擇 SSH key 的加密演算法"
pubDatetime: 2020-01-06T08:08:25.000Z
slug: "ssh-key"
description: "在 ssh-keygen 的 man page 說明中有一個 -t 參數，可以設定要產生的 ssh key type。有以下五種不同 key type 可以選擇： dsa 已被認為是一個不安全的演算法，不再建議使用，由於存在安全性缺陷，OpenSSH 7.0 已停止支援 DSA 演算法。 ecdsa 在 OpenSSH 5.7 開始支援 ECDSA key type，有 256"
---

## Table of contents

## 前言

在 [ssh-keygen](https://www.ssh.com/ssh/keygen/) 的 [man page](https://linux.die.net/man/1/ssh-keygen) 說明中有一個 `-t` 參數，可以設定要產生的 ssh key type。有以下五種不同 key type 可以選擇：

- [dsa](https://en.wikipedia.org/wiki/Digital_Signature_Algorithm)

  已被認為是一個不安全的演算法，不再建議使用，由於存在安全性缺陷，OpenSSH 7.0 已停止支援 DSA 演算法。

- [ecdsa](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm)

  在 OpenSSH 5.7 開始支援 ECDSA key type，有 256, 384, 521 bits 三種 key 長度可以選擇，如果指定不是這三種長度，會發生錯誤。從政治上考量，ecdsa 所使用的橢圓曲線是由 NIST 所選擇的，有被 [NSA](https://www.nsa.gov/) 植入後門的疑慮。另外由於規格複雜，技術上不容易被正確完整的實作。該兩點疑慮在 [libssh curve25519 introduction](https://git.libssh.org/projects/libssh.git/tree/doc/curve25519-sha256@libssh.org.txt#n4) 有說明。

- [ed25519](https://ed25519.cr.yp.to/)

  以使用 [SHA-512/256](https://en.wikipedia.org/w/index.php?title=SHA-512/256&redirect=no) 的 [EdDSA](https://en.wikipedia.org/wiki/EdDSA) 簽章算法方案，並選用 [Curve25519](https://en.wikipedia.org/wiki/Curve25519) 這組橢圓曲線的演算法。基於 [bcrypt](https://en.wikipedia.org/wiki/Bcrypt) 的新 key 格式，長度固定為 256 bits，不需要調整長度。是最新的演算法，在 OpenSSH 6.5 後才支援，在稍微舊版的 ssh client/server 上可能會遇到無法支援的狀況，相容性最低。安全性和效能最佳，沒有可能造成安全性漏洞而寫死在程式中的常數，而且能抵抗 side channel attack。

- [rsa](https://en.wikipedia.org/wiki/RSA_%28cryptosystem%29)

  SSH 協定 version 2 使用的 RSA 算法，為目前 ssh-keygen 預設使用的 key type，是目前各家 SSH server/client 實作中相容性最佳的演算法。安全性強度取決於 key 長度，可以用 `-b` 參數指定長度，預設長度是 2,048 bits，可設定長度範圍從 1,024 ~ 16,384 bits。key 長度 1,024 bits 已被證明安全性強度不足。一般來說預設的 2,048 bits 強度已足夠安全，但還是建議使用長度更長的 key 如 3,072 或 4,096 bits。

- rsa1

  SSH 協定 version 1 使用的 RSA 算法，在版本比較老舊的作業系統上只能使用 ssh protocol version 1。除非是為了在極有歷史的系統上使用，否則現在不會使用到這個 key type。

## 分類

- DSA 和 RSA 都是基於對兩個極大質數乘積作質因數分解的困難度，細節可見 [practical difficulty](https://en.wikipedia.org/wiki/Integer_factorization#Difficulty_and_complexity) 。
- ECDSA, ED25519 則是基於橢圓曲線的離散對數問題。

## 如何選擇

如果有要和較舊的作業系統互動的需求，建議選用 RSA key type，
並指定至少 3,072 bits 長度的 key。

如果要連線的 server 都是比較新的系統，建議 key type 直接選用 ED25519 。[GitHub](https://github.com/) 和 [GitLab](https://gitlab.com/) 都能支援設定 ED25519 key type public key。

## 參考資源

- [Arch Linux](https://www.archlinux.org/) 的 Wiki 上有一條 SSH keys 對於各種 key type 的選擇和比較，介紹的非常詳細。
- Mozilla 工程師 Brian Warner 有寫一篇 [Ed25519 keys](https://blog.mozilla.org/warner/2011/11/29/ed25519-keys/) 介紹 ED25519 的運作原理。
- [Upgrade Your SSH Key to Ed25519](https://medium.com/risan/upgrade-your-ssh-key-to-ed25519-c6e8d60d3c54)

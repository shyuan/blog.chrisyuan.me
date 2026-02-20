---
title: "選擇 SSH key 的加密演算法"
pubDatetime: 2020-01-06T08:08:25.000Z
modDatetime: 2026-02-20T00:00:00Z
slug: "ssh-key"
tags:
  - ssh
  - cli
description: "比較 SSH key 的五種加密演算法（DSA、ECDSA、Ed25519、RSA、RSA1），涵蓋 OpenSSH 8.8 棄用 ssh-rsa、FIDO/U2F 硬體金鑰支援，以及後量子密碼學的最新發展。"
---

## Table of contents

## 前言

在 [ssh-keygen](https://www.ssh.com/ssh/keygen/) 的 [man page](https://linux.die.net/man/1/ssh-keygen) 說明中有一個 `-t` 參數，可以設定要產生的 SSH key type。本文比較各種演算法的安全性與適用情境，並整理近年的重要變化。

## 演算法比較

### DSA

已被認為是不安全的演算法，不再建議使用。由於存在安全性缺陷，**OpenSSH 7.0（2015）已停止支援 DSA 演算法**。

參考：[Digital Signature Algorithm](https://en.wikipedia.org/wiki/Digital_Signature_Algorithm)

### ECDSA

在 OpenSSH 5.7 開始支援，有 256、384、521 bits 三種 key 長度可以選擇，指定其他長度會報錯。

**安全疑慮：**

- ECDSA 使用的橢圓曲線由 [NIST](https://www.nist.gov/) 選定，有被 [NSA](https://www.nsa.gov/) 植入後門的疑慮
- 規格複雜，技術上不容易被正確完整實作
- 上述疑慮在 [libssh curve25519 introduction](https://git.libssh.org/projects/libssh.git/tree/doc/curve25519-sha256@libssh.org.txt#n4) 中有詳細說明

參考：[Elliptic Curve Digital Signature Algorithm](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm)

### Ed25519（推薦）

使用 [SHA-512/256](https://en.wikipedia.org/w/index.php?title=SHA-512/256&redirect=no) 的 [EdDSA](https://en.wikipedia.org/wiki/EdDSA) 簽章方案，選用 [Curve25519](https://en.wikipedia.org/wiki/Curve25519) 橢圓曲線。在 OpenSSH 6.5（2014）後支援。

**優勢：**

- 長度固定 256 bits，不需要調整
- 安全性和效能最佳
- 沒有可能造成安全漏洞而寫死在程式碼中的常數
- 能抵抗 [side channel attack](https://en.wikipedia.org/wiki/Side-channel_attack)
- 基於 [bcrypt](https://en.wikipedia.org/wiki/Bcrypt) 的新 key 格式

**唯一限制**是在極舊的 SSH client/server 上可能不支援。但截至目前，主流平台（GitHub、GitLab、各大雲端服務）皆已全面支援。

參考：[Ed25519: high-speed high-security signatures](https://ed25519.cr.yp.to/)

### RSA

SSH 協定 version 2 使用的 RSA 算法，曾長期是 ssh-keygen 預設的 key type，相容性最佳。

安全性取決於 key 長度，可用 `-b` 參數指定，範圍 1,024 ~ 16,384 bits：

- **1,024 bits**：已被證明安全性不足
- **2,048 bits**：預設值，目前仍安全但建議升級
- **3,072 bits**：NIST 建議的最低安全長度
- **4,096 bits**：推薦用於高安全需求場景

參考：[RSA cryptosystem](https://en.wikipedia.org/wiki/RSA_%28cryptosystem%29)

### RSA1

SSH 協定 version 1 專用，僅在極老舊的系統上才會使用。**OpenSSH 7.6（2017）已完全移除 SSH v1 支援**，現在已無使用場景。

## 分類

以底層數學問題區分：

- **DSA、RSA**：基於大整數質因數分解的困難度，詳見 [practical difficulty](https://en.wikipedia.org/wiki/Integer_factorization#Difficulty_and_complexity)
- **ECDSA、Ed25519**：基於橢圓曲線的離散對數問題

## 近年重要變化

### OpenSSH 8.2 — FIDO/U2F 硬體金鑰支援（2020）

新增兩種 key type，支援 FIDO/U2F 硬體安全金鑰（如 YubiKey）：

- `sk-ecdsa-sha2-nistp256`：ECDSA + 硬體金鑰
- `sk-ssh-ed25519`：Ed25519 + 硬體金鑰

產生方式：

```bash
ssh-keygen -t ed25519-sk
```

使用時必須插入實體金鑰並觸碰確認，即使私鑰被竊取，攻擊者沒有實體金鑰也無法使用。適合高安全需求的伺服器管理場景。

### OpenSSH 8.8 — 棄用 ssh-rsa 簽章（2021）

**這是影響最大的變更。** OpenSSH 8.8 預設停用使用 SHA-1 的 `ssh-rsa` 簽章演算法，因為 SHA-1 已被證實可被碰撞攻擊破解。

**影響範圍：**

- 使用舊版 OpenSSH（< 7.2）的伺服器可能無法連線
- 錯誤訊息通常是 `no matching host key type found`

**解法：**

- 最佳方案：升級伺服器端 OpenSSH 並改用 Ed25519
- 暫時方案：在 `~/.ssh/config` 中允許舊演算法

```ssh-config
Host old-server
    HostkeyAlgorithms +ssh-rsa
    PubkeyAcceptedAlgorithms +ssh-rsa
```

注意：RSA key 本身沒有被棄用，只是簽章從 SHA-1（`ssh-rsa`）改為 SHA-256/512（`rsa-sha2-256`、`rsa-sha2-512`）。如果伺服器端支援 OpenSSH 7.2+，現有的 RSA key 仍可正常使用。

### OpenSSH 9.5 — 後量子密碼學的前哨（2023）

OpenSSH 9.0 起，預設的金鑰交換方法改用混合式方案，結合傳統的 X25519 與後量子的 [Streamlined NTRU Prime](https://ntruprime.cr.yp.to/)，以防禦未來量子電腦的威脅。

OpenSSH 9.5 進一步引入 `mlkem768x25519-sha256` 金鑰交換方法（基於 NIST 標準化的 [ML-KEM](https://csrc.nist.gov/pubs/fips/203/final)），作為後量子過渡的準備。

這僅影響連線時的金鑰交換過程，**不影響使用者的 SSH key 選擇**。但預示著未來可能出現後量子的 SSH key type。

## 如何選擇

### 一般用途（推薦）

直接選用 **Ed25519**，安全、快速、key 短：

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

[GitHub](https://github.com/)、[GitLab](https://gitlab.com/) 及所有主流雲端服務皆已支援。

### 需要相容舊系統

選用 **RSA 4096 bits**：

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

### 高安全需求（搭配硬體金鑰）

選用 **Ed25519-SK**，需搭配 FIDO2 硬體金鑰：

```bash
ssh-keygen -t ed25519-sk -C "your_email@example.com"
```

### 速查表

| 演算法     | 推薦程度 | Key 長度           | 支援版本     | 備註               |
| ---------- | -------- | ------------------ | ------------ | ------------------ |
| Ed25519    | 最推薦   | 256 bits（固定）   | OpenSSH 6.5+ | 安全、快速、key 短 |
| RSA        | 次選     | 3,072-4,096 bits   | 全版本       | 相容性最佳         |
| ECDSA      | 不建議   | 256/384/521 bits   | OpenSSH 5.7+ | NIST 曲線有疑慮    |
| Ed25519-SK | 高安全   | 256 bits（固定）   | OpenSSH 8.2+ | 需硬體金鑰         |
| DSA        | 禁用     | 1,024 bits（固定） | 已停止支援   | OpenSSH 7.0 移除   |
| RSA1       | 禁用     | —                  | 已停止支援   | SSH v1 已淘汰      |

## 參考資源

- [Arch Linux Wiki - SSH keys](https://wiki.archlinux.org/title/SSH_keys)：各種 key type 的選擇和比較，介紹非常詳細
- [Ed25519 keys](https://blog.mozilla.org/warner/2011/11/29/ed25519-keys/)：Mozilla 工程師 Brian Warner 介紹 Ed25519 的運作原理
- [Upgrade Your SSH Key to Ed25519](https://medium.com/risan/upgrade-your-ssh-key-to-ed25519-c6e8d60d3c54)
- [OpenSSH 8.2 Release Notes](https://www.openssh.com/txt/release-8.2)：FIDO/U2F 支援
- [OpenSSH 8.8 Release Notes](https://www.openssh.com/txt/release-8.8)：棄用 ssh-rsa 簽章
- [OpenSSH 9.5 Release Notes](https://www.openssh.com/txt/release-9.5)：後量子金鑰交換

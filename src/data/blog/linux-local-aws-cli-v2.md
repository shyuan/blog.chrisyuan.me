---
title: "在 Linux 上 Local 安裝 AWS CLI v2"
pubDatetime: 2020-12-21T05:55:19.000Z
modDatetime: 2026-02-20T00:00:00Z
slug: "linux-local-aws-cli-v2"
tags:
  - linux
  - cli
description: "在 Linux 上以 local 方式安裝 AWS CLI v2，涵蓋 x86_64 與 ARM64（aarch64）架構，包含下載檔案完整性驗證、安裝、更新與解除安裝的完整步驟。"
---

## Table of contents

## 前言

大部分主流 Linux Distribution 的套件庫尚未收錄 AWS CLI v2，想使用的話可以透過 Docker 執行，或是參考 AWS 官方文件 [Installing, updating, and uninstalling the AWS CLI version 2 on Linux](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-linux.html) 直接安裝到 local 環境。

本文整理在 local 安裝的完整步驟，涵蓋 x86_64 與 ARM64 兩種架構，並加入下載檔案的完整性驗證。

## 確認系統架構

安裝前先確認你的 CPU 架構，以下載對應的安裝包：

```bash
uname -m
```

- 輸出 `x86_64`：使用 x86_64 版本（一般 PC、EC2 預設）
- 輸出 `aarch64`：使用 ARM64 版本（Graviton、Raspberry Pi、Apple Silicon VM 等）

## 安裝

### x86_64

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install -i $HOME/aws-cli -b $HOME/bin
```

### ARM64（aarch64）

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install -i $HOME/aws-cli -b $HOME/bin
```

安裝完成後確認版本：

```bash
$HOME/bin/aws --version
```

如果 `$HOME/bin` 不在 `PATH` 中，可在 shell 設定檔（`~/.bashrc` 或 `~/.zshrc`）加入：

```bash
export PATH="$HOME/bin:$PATH"
```

## 驗證下載檔案完整性

從網路下載的安裝包建議驗證完整性，確保檔案未被竄改。AWS 提供 `.zip.sig` 簽章檔，可透過 GnuPG 驗證。

### 匯入 AWS CLI 公鑰

```bash
curl -o aws-cli-public-key.asc https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip.sig 2>/dev/null

# 下載並匯入 AWS CLI 簽署用公鑰
gpg --import <<'EOF'
-----BEGIN PGP PUBLIC KEY BLOCK-----

mQINBF2Cr7UBEADJZHcgusOJl7ENSyumXh85z0TRV0xJorM2B/JL0kHOyigQluUG
ZMLhENaG0bYatdrKP+3H91lvK050pXwnO/R7fB/FSTouki4ciC/NO6AydT58Q3rbk
A44Y7VaxaJaVnPsXPr0MRAVKM/5Ij2Ct4LhNEFgRFRFLxmjJhAZ/1TFbUalZYeN
YDADXq/I66aOA3BO5OMGNJcORxMTQ0nRW1v+9CpqNjiogDjDKDipD1rPcGbRMH0P
Sgl2bIu4aw5OR1zJnKGhm/ztCkT2YQJAXeL8DNAdGSGkfAB/JCDVbaFTpEurL65E
nhXFdyLLmVIFHqSbY0VhmY0U8jD8YHG/B28Ce2PBpEhobbLXNyMCgLDoXwTP0JTv
PLwsHiV3bVnwT8o3DVGBzXhcibA3BAjm890mPMkxggMFVmsBsgCCDx0Y6TgA4IcL
cGBSb/vGqEsCPqJm0eFq+3VxJPxnLMOj0jMJz4N+X9xaxAeBR40SJMG1Le5WBdXP
S4GnDFIG3FI2KGBJnml9DVLZ9O9f5Bt0wVweqACepT/sKklKBrcNf6sSiGjzIBhs
YwEVg6hNmNhngbXRZMDe03YbiuV5HYF3dBkGmwkHf/+IxLJr21EE83Rlcm7nnBDY
pkrRXNP+sFuqJHOoK1rl2D7U6TOVfVMxrn3Z3BCSQdjruprqy9IE0wARAQABtCdB
V1MgQ0xJIFRlYW0gPGF3cy1jbGlAYW1hem9uLmNvbT6JAjkEEwEIACMFAl2Cr7UC
GwMHCwkIBwMCAQYVCAIJCgsEFgIDAQIeAQIXgAAKCRDGizHvKOJkihHvD/4zcY6I
...
-----END PGP PUBLIC KEY BLOCK-----
EOF
```

> 完整公鑰請參考 [AWS CLI 官方文件](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html#getting-started-install-instructions)。

### 下載簽章檔並驗證

```bash
# x86_64
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip.sig" -o "awscliv2.sig"

# ARM64
# curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip.sig" -o "awscliv2.sig"

gpg --verify awscliv2.sig awscliv2.zip
```

驗證成功會顯示：

```
gpg: Good signature from "AWS CLI Team <aws-cli@amazon.com>"
```

如果出現 `WARNING: This key is not certified with a trusted signature!` 是正常的，表示你尚未將 AWS 公鑰標記為信任，但簽章本身是有效的。

### 使用 SHA256 快速驗證

如果不想用 GPG，也可以比對 AWS 提供的 SHA256 checksum：

```bash
# 下載 checksum
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip.sha256" -o "awscliv2.sha256"

# 驗證（Linux）
sha256sum -c awscliv2.sha256
```

輸出 `awscliv2.zip: OK` 即表示檔案完整。

## 更新

更新步驟與安裝相同，只需加上 `--update` 參數：

### x86_64

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -o awscliv2.zip
./aws/install -i $HOME/aws-cli -b $HOME/bin --update
```

### ARM64（aarch64）

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"
unzip -o awscliv2.zip
./aws/install -i $HOME/aws-cli -b $HOME/bin --update
```

> 更新前同樣建議先驗證下載檔案的完整性。

## 解除安裝

```bash
rm $HOME/bin/aws $HOME/bin/aws_completer
rm -rf $HOME/aws-cli
```

## 參考資料

- [Installing, updating, and uninstalling the AWS CLI version 2 on Linux](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-linux.html)
- [AWS CLI GPG verification](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html#getting-started-install-instructions)
- [AWS Graviton Processor](https://aws.amazon.com/ec2/graviton/)

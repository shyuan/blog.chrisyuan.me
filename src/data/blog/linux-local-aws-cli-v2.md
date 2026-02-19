---
title: "在 Linux 上 Local 安裝 AWS CLI v2"
pubDatetime: 2020-12-21T05:55:19.000Z
slug: "linux-local-aws-cli-v2"
description: "目前大部分主流 Linux Distribution 都還沒有把 AWS CLI v2 包成可以直接安裝的 package，如果要用 AWS CLI v2 可以用 Docker 來執行，或是參考 Installing, updating, and uninstalling the AWS CLI version 2 on Linux 把 AWS CLI v2 安裝到 local 環境 安裝 $ c"
---

## Table of contents

## 前言

目前大部分主流 Linux Distribution 都還沒有把 AWS CLI v2 包成可以直接安裝的 package，如果要用 AWS CLI v2 可以用 Docker 來執行，或是參考 [Installing, updating, and uninstalling the AWS CLI version 2 on Linux](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-linux.html) 把 AWS CLI v2 安裝到 local 環境

## 安裝

```
$ curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
$ unzip awscliv2.zip
$ ./aws/install -i $HOME/aws-cli -b $HOME/bin
```

## 更新

```
$ curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
$ unzip awscliv2.zip
$ ./aws/install -i $HOME/aws-cli -b $HOME/bin --update
```

## 解除安裝

```
$ rm $HOME/bin/aws $HOME/bin/aws_completer
$ rm -rf $HOME/aws-cli
```

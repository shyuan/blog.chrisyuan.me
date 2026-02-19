---
title: "EKS 每個 instance node 上所能運行的 pod 數量上限"
pubDatetime: 2020-12-16T07:55:50.000Z
slug: "eks-instance-node-pod"
description: "由於每個 pod 上都會被 assign 一個 VPC subnet IP，所以每個 instance node 上的 pod 數量上限，取決於該 instance type 最多能接上的 network interface 張數及每張 network interface 上能 bind 的 IP 數量，可參考 IP addresses per network interface per inst"
---

## Table of contents

## 說明

由於每個 pod 上都會被 assign 一個 VPC subnet IP，所以每個 instance node 上的 pod 數量上限，取決於該 instance type 最多能接上的 network interface 張數及每張 network interface 上能 bind 的 IP 數量，可參考 [IP addresses per network interface per instance type](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html#AvailableIpPerENI) 上的列表。

實際上還需要扣除 instance 本身運作要用到的 IP，實際上能用的數量是 (ENI 張數) x (每張 ENI 最多的 IPv4 數量 - 1) + 2，AWS 有一份每種 instance type 在 EKS 中最多能使用 pod 數的文件，可參考
[eni-max-pods.txt](https://github.com/awslabs/amazon-eks-ami/blob/master/files/eni-max-pods.txt)。

例如 t3.medium 最多能掛 3 張網卡，每張網卡能配 6 個 IP，所以最多可以跑 3 x (6-1)+2=17 個 pod，c5.4xlarge 最多能掛 8 張網卡，每張網卡能配 30 個 IP，所以最多可以跑 8x(30-1)+2=234 個 pod。

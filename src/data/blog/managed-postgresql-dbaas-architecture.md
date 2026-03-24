---
pubDatetime: 2026-03-13T00:00:00Z
title: "一個月 $5 的 Managed PostgreSQL 到底怎麼做到的？從 PlanetScale 的定價策略看 DBaaS 的底層架構"
slug: managed-postgresql-dbaas-architecture
tags:
  - postgresql
  - database
  - cloud
  - kubernetes
description: "從 PlanetScale $5/月的 PostgreSQL 方案出發，拆解 DBaaS 廠商如何用 Kubernetes 多租戶架構、RI 批發折扣和超賣策略壓低成本，以及這套模式的 trade-off。"
draft: false
---

## Table of contents

## 前言

最近花了一些時間研究市面上提供 PostgreSQL Database as a Service 的各家廠商和方案。原本只是想比較一下價格，結果越挖越深，從定價模型一路挖到底層的基礎架構設計。

## PostgreSQL DBaaS 市場現況

2025 年的 PostgreSQL DBaaS 市場很熱鬧。Andy Pavlo 在他的年度資料庫回顧裡提到，Databricks 花了 10 億美元買下 Neon，Snowflake 用 2.5 億買了 Crunchy Data，Microsoft 推出 HorizonDB——幾乎所有大廠都在搶 PostgreSQL 的生意。

粗略歸類一下，目前的 PostgreSQL DBaaS 大致分成幾個層級：

**有永久免費方案的：**

- **Neon** — 每個 project 0.5 GB storage，100 CU-hours/月，可建最多 100 個 project。被 Databricks 收購後大幅降價，storage 價格砍了 80%
- **Supabase** — 500 MB DB、50K MAU，但閒置一週會被暫停。定位是 Firebase 的開源替代品，DB 只是整個 BaaS 套餐的一部分
- **Aiven** — 1 GB storage 的免費 PostgreSQL，2025 年底新推 \$5/月的 Developer tier

**低價入門的（\$5-15/月）：**

- **PlanetScale** — \$5/月 single node，10 GB storage。2025 年才從 MySQL 跨足 PostgreSQL
- **Railway** — Hobby plan \$5/月含 \$5 usage credit，DB 用量算在裡面，實測輕量使用每月不到 \$1
- **Heroku** — Mini plan \$5/月，1 GB storage
- **Crunchy Bridge** — Hobby plan \$10/月起
- **DigitalOcean** — Managed PostgreSQL \$15/月起，1 GB RAM

**三大雲的 Managed PostgreSQL：**

- **AWS RDS** — 最小 db.t4g.micro（2 vCPU, 1 GB RAM），Tokyo region 約 \$16-17/月起
- **GCP Cloud SQL** — 最小 db-f1-micro，約 \$10/月起（shared CPU，不受 SLA 保障）
- **Azure Flexible Server** — 最小 B1ms（1 vCPU, 2 GB RAM），約 \$12.41/月起

## 我為什麼選了 PlanetScale

我目前用的是 PlanetScale 的 \$5 single node 方案。選擇的理由很簡單：CP 值。

查了一下 PlanetScale 在 AWS 上這個 \$5 tier 的實際規格：512 MB RAM、1/16 vCPU、10 GB gp3 disk。對應到 AWS 的 EC2 instance type 大概是 t4g.nano 等級。

但 AWS RDS 最小的 instance type 是 db.t4g.micro（1 GB RAM），根本沒有 nano 這個選項。如果自己在 Tokyo region 開一台 t4g.nano 跑 PostgreSQL，光 EC2 一個月大約 \$4，然後還要自己處理 OS 更新、PG 安裝設定、備份排程、監控告警、安全性修補這一堆事。

多花 \$1 就能拿到全託管服務，附帶 Query Insights、自動備份、branching，怎麼算都划算。

## \$5 的背後：Kubernetes 多租戶架構

但這就帶出一個問題——PlanetScale 怎麼可能用 \$5 提供一個 managed PostgreSQL 還有利潤？

答案在底層架構。根據一些公開的技術資料，PlanetScale 的 PostgreSQL node 是用 Kubernetes pod 實作的，而不是為每位客戶啟動一個獨立的 EC2 instance。

PlanetScale 買入大台的 EC2 instance，比如 m7g.8xlarge（32 vCPU / 128 GB RAM），透過 3 年 All Upfront Reserved Instance 拿到 50-60% 的折扣。然後用 Kubernetes 把這些大機器切成大量的小 pod，一個 1/16 vCPU + 512 MB RAM 的 pod 在一台大機器上可以塞出很多個。

成本結構大概是這樣：

```
批發端（PlanetScale 付給 AWS 的）：
  大型 RI instance 均攤到每個 pod 的 compute 成本 → 可能 $1-2/月
  10 GB gp3 storage                                → ~$0.96/月
  Backup storage                                   → ~$0.5/月
  網路、管理層開銷                                    → ~$0.5/月

零售端（客戶付的）：
  $5/月
```

即使毛利不高，這個模型靠的是量。幾萬個 \$5 的 pod 跑在幾百台大機器上，加上客戶升級到 HA（\$30/月）或 Metal（\$50/月）後利潤率就上來了。

## 為什麼 RDS 做不到 nano 級規格

回頭看 AWS RDS 為什麼最小只到 db.t4g.micro（1 GB RAM），不往下開 nano（512 MB）。原因出在 RDS 的架構——每一個 RDS instance 就是一台完整的 EC2 VM。

這台 VM 上面跑了不少東西：

- Amazon Linux 作業系統本身
- RDS management agent（處理備份排程、failover、patching）
- CloudWatch monitoring agent
- Enhanced Monitoring 的 OS-level collector
- Performance Insights agent
- SSM agent（讓 AWS 遠端管理）

這些加起來大概要吃掉 200-300 MB RAM 和一些 baseline CPU。在 t4g.micro 的 1 GB RAM 上，扣完剩大約 700 MB 給 PostgreSQL 用，堪用但已經是底線了。如果壓到 nano 的 512 MB，OS 加 agent 就佔掉一半以上，留給 PG 的 shared_buffers 可能只能設到 100 MB 出頭。加上 work_mem、maintenance_work_mem 和每個 connection 的 per-backend memory，根本跑不了什麼正經的 workload。

所以 AWS 有很強的動機不開 nano 級 RDS——客戶體驗差，support ticket 會爆量。

## Kubernetes pod 的 overhead 優勢

K8s pod 的情況完全不同。

Pod 裡面跑的就是一個 postgres process，可能再加一個 metrics exporter 的 sidecar，沒有獨立的 OS kernel、沒有 init system、沒有 SSH daemon、沒有那些管理 agent。

K8s node 層級當然有 kubelet、kube-proxy、container runtime 這些開銷，但那是所有 pod 共攤的成本，分攤到單一 pod 上幾乎可以忽略不計。

所以同樣是 512 MB 的資源配額：

|                 | RDS (假設有 db.t4g.nano) | K8s Pod                     |
| --------------- | ------------------------ | --------------------------- |
| 總 RAM          | 512 MB                   | 512 MB (resource limit)     |
| OS + Agent 開銷 | ~250-300 MB              | ~0 (共攤到 node 層級)       |
| 實際可用給 PG   | ~200 MB                  | ~400 MB+                    |
| 隔離等級        | Hypervisor (硬隔離)      | cgroup + namespace (軟隔離) |

PG 實際可用記憶體差了一倍。這就是為什麼 512 MB 的 K8s pod 可以跑出還不錯的 PostgreSQL，但同規格的 VM 就很勉強。

## 這套模式的 trade-off

用 K8s 多租戶跑 managed DB 不是沒有代價。

首先是 noisy neighbor。你的 pod 跟其他人的 pod 跑在同一台物理機上。K8s 有 resource limit 和 cgroup 控制沒錯，但 I/O 和 network bandwidth 的隔離不如 hypervisor 那麼乾淨，偶爾的 latency spike 是可能的。

再來是安全邊界。VM 有 hypervisor 層級的硬隔離，container 靠的是 Linux kernel 的 namespace 和 cgroup。PlanetScale 可能有額外加上 gVisor、Firecracker 或類似的 container sandbox 技術，但隔離強度在理論上還是比不上 hypervisor。

這也是 Metal 方案存在的原因——PlanetScale Metal 用的是真正的 dedicated server 搭配本地 NVMe SSD，沒有 noisy neighbor、沒有 network-attached storage 的延遲。\$5 tier 和 \$50 Metal tier 之間的效能差距，某種程度上就是「共享 K8s pod」和「dedicated hardware」之間的差距。

## 所有 DBaaS 廠商都在做同一件事

其實不只 PlanetScale。Neon、Supabase、Aiven、Crunchy Bridge，本質上都在做同一件事：批發雲端資源，加上自家的管理層和附加功能，然後零售給終端用戶。

各家的切入角度不同。Neon 靠 compute-storage 分離架構做到 scale-to-zero，閒置時完全不消耗 compute 資源，所以敢提供免費方案。Supabase 把 PostgreSQL 打包進一整套 BaaS（Auth、Storage、Edge Functions），DB 只是套餐的一部分。PlanetScale 從 Vitess/MySQL sharding 的經驗出發，強調效能和 Query Insights 工具。Aiven 走 multi-cloud 路線，讓你選 AWS/GCP/Azure 任意部署。

但底層都一樣：跟雲廠商拿 RI/Savings Plan 的批發價，用多租戶架構超賣（overcommit），靠規模經濟賺差價。

## 結語

\$5/月的 managed PostgreSQL 聽起來便宜到不真實，但拆開來看成本結構其實是合理的。K8s 多租戶架構把 per-tenant 的 overhead 壓到很低，長約折扣再把底層雲端成本砍一半，加上多租戶超賣拉高資源利用率，算下來就是這個價格。

對我這種跑 side project 的使用情境來說，\$5 single node 完全夠用。512 MB RAM 在 K8s pod 裡面給 PG 的可用記憶體其實比想像中多，輕量的 CRUD workload 處理起來綽綽有餘。

真要上正式環境的話，該升級到 HA 或 Metal 就升級，這些廠商就是靠這個升級路徑賺錢的。但至少搞清楚底層架構之後，選方案的時候比較知道自己在 trade 什麼。

---
title: "利用 kubectl port-forward 和 socat 轉導 local 流量至 Kubernetes 內部"
pubDatetime: 2020-12-22T01:43:49.000Z
slug: "kubectl-port-forward-socat-local-kubernetes"
description: "利用 alpine/socat 配合 kubectl port-forward 就可以把 local 機器的 port 和遠端 Kubernetes 內部的 port 串起來，可以開一個 pod 向只開放內部 VPC 存取的 Database 或 API server 連線。 可以參考這個 GitHub issue 的兩個 comment： Specify remote host for kub"
---

利用 [alpine/socat](https://hub.docker.com/r/alpine/socat/) 配合 [kubectl port-forward](https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#port-forward) 就可以把 local 機器的 port 和遠端 Kubernetes 內部的 port 串起來，可以開一個 pod 向只開放內部 VPC 存取的 Database 或 API server 連線。

可以參考這個 GitHub issue 的兩個 comment：

- [Specify remote host for kubectl port-forward #72597 - 518617501](https://github.com/kubernetes/kubernetes/issues/72597#issuecomment-518617501)
- [Specify remote host for kubectl port-forward #72597 - 693149447](https://github.com/kubernetes/kubernetes/issues/72597#issuecomment-693149447)

# 參考

- [Use Port Forwarding to Access Applications in a Cluster](https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/)
- [Kubectl port-forward socat
  ](https://www.xspdf.com/resolution/57337266.html)
- [txn2/kubefwd](https://github.com/txn2/kubefwd)

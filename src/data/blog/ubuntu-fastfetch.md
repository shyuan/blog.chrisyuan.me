---
title: "登入 Ubuntu 後自動執行 fastfetch"
pubDatetime: 2025-02-11T03:03:00.000Z
slug: "ubuntu-fastfetch"
description: "讓 Ubuntu 每次登入時自動顯示 fastfetch 的系統資訊概覽（OS、核心、CPU、記憶體等）：於 /etc/profile.d/ 建立啟動腳本的設定步驟，一開終端機就掌握主機狀態。"
tags:
  - Ubuntu
  - fastfetch
---

## Table of contents

## 設定方式

在 `/etc/profile.d/` 下建立 `fastfetch.sh` ，填入以下內容：

```bash
#!/bin/bash

fastfetch
printf "\n\n"
```

將 `/etc/profile.d/fastfetch.sh` 檔案權限設定為可被執行：

```bash
chmod +x /etc/profile.d/fastfetch.sh
```

下次登入 Ubuntu 就會出現如下畫面：

![ubuntu fastfetch](../../assets/images/ubuntu-fastfetch.png)

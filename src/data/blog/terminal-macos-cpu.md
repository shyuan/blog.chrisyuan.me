---
title: "在 Terminal 下查詢 macOS 的 CPU 資訊的指令"
pubDatetime: 2025-02-14T09:11:46.000Z
slug: "terminal-macos-cpu"
description: "% sysctl -n machdep.cpu.brand_string Apple M1 Pro % system_profiler SPHardwareDataType Hardware: Hardware Overview: Model Name: MacBook Pro Model Identifier: MacBookPro18,3"
tags:
  - macOS
  - cpu
  - cli
---

## Table of contents

```bash
% sysctl -n machdep.cpu.brand_string

Apple M1 Pro
```

```bash
% system_profiler SPHardwareDataType

Hardware:

    Hardware Overview:

      Model Name: MacBook Pro
      Model Identifier: MacBookPro18,3
      Model Number: Z15J003V3TA/A
      Chip: Apple M1 Pro
      Total Number of Cores: 8 (6 performance and 2 efficiency)
      Memory: 16 GB
      System Firmware Version: 11881.81.4
      OS Loader Version: 11881.81.4
      Serial Number (system): *****************
      Hardware UUID: ****************************
      Provisioning UDID: ************************
      Activation Lock Status: Enabled
```

```bash
% sysctl -a | grep cpu

kern.sched_rt_avoid_cpu0: 0
kern.cpu_checkin_interval: 5000
hw.ncpu: 8
hw.activecpu: 8
hw.perflevel0.physicalcpu: 6
hw.perflevel0.physicalcpu_max: 6
hw.perflevel0.logicalcpu: 6
hw.perflevel0.logicalcpu_max: 6
hw.perflevel0.cpusperl2: 3
hw.perflevel1.physicalcpu: 2
hw.perflevel1.physicalcpu_max: 2
hw.perflevel1.logicalcpu: 2
hw.perflevel1.logicalcpu_max: 2
hw.perflevel1.cpusperl2: 2
hw.physicalcpu: 8
hw.physicalcpu_max: 8
hw.logicalcpu: 8
hw.logicalcpu_max: 8
hw.cputype: 16777228
hw.cpusubtype: 2
hw.cpu64bit_capable: 1
hw.cpufamily: 458787763
hw.cpusubfamily: 4
machdep.cpu.cores_per_package: 8
machdep.cpu.core_count: 8
machdep.cpu.logical_per_package: 8
machdep.cpu.thread_count: 8
machdep.cpu.brand_string: Apple M1 Pro
```

參考 [How do I identify which CPU a MacBook uses?](https://apple.stackexchange.com/questions/238777/how-do-i-identify-which-cpu-a-macbook-uses)

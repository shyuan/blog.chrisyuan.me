---
title: "MySQL 在 Y2K38 問題上的修正"
pubDatetime: 2023-02-10T05:09:50.000Z
slug: "mysql-y2k38"
description: "MySQL 在 Y2K38 問題上的修正 前言 最近瀏覽 Year 2038 problem 維基百科條目時，發現其中列出了各種作業系統和軟體的解決方案。特別注意到 MySQL 8.0.28（2022年1月釋出）終於修正了 FROM_UNIXTIME()、UNIX_TIMESTAMP()、CONVERT_TZ() 三個函式處理 64 位元數值的問題。 什麼是 Y2K38 問題？ 背景說明 在 32"
tags:
  - MySQL
  - unix
  - timestamp
---

## Table of contents

# MySQL 在 Y2K38 問題上的修正

## 前言

最近瀏覽 [Year 2038 problem 維基百科條目](https://en.wikipedia.org/wiki/Year_2038_problem)時，發現其中列出了各種作業系統和軟體的解決方案。特別注意到 [MySQL 8.0.28](https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-28.html)（2022年1月釋出）終於修正了 [`FROM_UNIXTIME()`](https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_from-unixtime)、[`UNIX_TIMESTAMP()`](https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_unix-timestamp)、[`CONVERT_TZ()`](https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_convert-tz) 三個函式處理 64 位元數值的問題。

## 什麼是 Y2K38 問題？

### 背景說明

在 32 位元架構的時代，系統普遍使用 32 位元的 [time_t](https://en.wikipedia.org/wiki/C_date_and_time_functions#time_t) 來儲存 [UNIX Timestamp](https://en.wikipedia.org/wiki/Unix_time)。UNIX 時間以 `1970-01-01 00:00:00 UTC` 為起點，用整數記錄經過的秒數：

- `86,400` = `1970-01-02 00:00:00 UTC`（經過一天）
- `1,700,000,000` = `2023-11-14 22:13:20 UTC`

### 問題核心

有號 32 位元整數的範圍是 -(2³¹) = -2,147,483,648 到 2³¹-1 = 2,147,483,647。當超過最大值時會發生[整數溢位](https://en.wikipedia.org/wiki/Integer_overflow)：

![Year 2038 problem demonstration](https://upload.wikimedia.org/wikipedia/commons/e/e9/Year_2038_problem.gif)

時間會從 `2038-01-19 03:14:07 UTC` 瞬間跳回 `1901-12-13 20:45:52 UTC`。

### 解決方案

改用 64 位元儲存時間戳。若繼續以秒為單位，2⁶³-1 = 9,223,372,036,854,775,807 秒約可使用 2,920 億年——遠超過宇宙年齡。因此許多系統選擇提高時間精度（毫秒、微秒或奈秒）來善用空間。

## MySQL 的處理歷程

### 問題發現（2005年）

早在 MySQL 4.1 時代，就有使用者回報 [Bug #12654](https://bugs.mysql.com/bug.php?id=12654)：

- `UNIX_TIMESTAMP()` 輸入大於 `'2038-01-01'` 的日期會回傳 `0`
- `FROM_UNIXTIME()` 輸入大於 `2,147,483,647` 的整數會回傳 `NULL`

### 實務影響

由於 MySQL 的 DATETIME 型態設計限制，許多開發者選擇直接用整數欄位儲存 UNIX Timestamp。原本期望只要將欄位從 4 Byte 的 `INT` 改為 8 Byte 的 `BIGINT` 就能解決，但關鍵的轉換函式仍有 32 位元限制。

### 修正時程

- **2005年**：問題首次回報
- **2022年1月**：MySQL 8.0.28 終於修正相關函式
- **總計耗時**：超過 16 年

## 結語

從現在（2023年）到 Y2K38 問題爆發只剩不到 15 年。對比 MySQL 花了 16 年才修正這個問題，提醒我們必須及早準備系統升級和資料遷移計畫。

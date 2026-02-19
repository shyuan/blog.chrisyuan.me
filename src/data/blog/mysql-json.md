---
title: "MySQL 查詢結果以 JSON 格式輸出"
pubDatetime: 2020-01-06T07:08:01.000Z
slug: "mysql-json"
description: "有時候會需要把 MySQL 的查詢結果輸出成 JSON 格式，如果不想寫程式做這件事，可以利用 mysql 指令，配合 MySQL 內建的 json_object() 功能，再加上 jq 完成。 有一個 table Person 結構如下： mysql> DESC Person; +-------+---------------------+------+-----+--------+------"
---

## Table of contents

## 操作方式

有時候會需要把 MySQL 的查詢結果輸出成 JSON 格式，如果不想寫程式做這件事，可以利用 mysql 指令，配合 MySQL 內建的 json_object() 功能，再加上 jq 完成。

有一個 table Person 結構如下：

```
mysql> DESC Person;
+-------+---------------------+------+-----+--------+--------------+
| Field | Type                | Null | Key | Default| Extra        |
+-------+---------------------+------+-----+--------+--------------+
| id    | bigint(20) unsigned | NO   | PRI | NULL   |auto_increment|
| name  | varchar(32)         | NO   |     | NULL   |              |
| email | varchar(128)        | YES  |     | NULL   |              |
+-------+---------------------+------+-----+--------+--------------+
3 rows in set (0.00 sec)
```

該 table 內有兩筆資料：

```
mysql> SELECT * FROM Person;
+----+-------+---------------+
| id | name  | email         |
+----+-------+---------------+
|  1 | Alice | alice@xxx.com |
|  2 | Bob   | bob@xxx.com   |
+----+-------+---------------+
2 rows in set (0.00 sec)
```

可以用 MySQL 的 json_object() 把結果直接 output 成 JSON 格式：

```
mysql> SELECT json_object('n', name, 'e', email) FROM Person;
+--------------------------------------+
| json_object('n', name, 'e', email)   |
+--------------------------------------+
| {"e": "alice@xxx.com", "n": "Alice"} |
| {"e": "bob@xxx.com", "n": "Bob"}     |
+--------------------------------------+
2 rows in set (0.00 sec)
```

用以下 script 就可以很簡單的把查詢結果輸出成一行一個 JSON object 的壓縮檔：

```
mysql -h mysql_server_ip -D testdb --execute "SELECT json_object('n', name, 'e', email) FROM Person;" | grep -v json_object | jq -cM '.' | gzip > Person.gz
```

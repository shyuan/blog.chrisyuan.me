---
title: "定時發送 database table 總筆數至 Slack 上"
pubDatetime: 2020-01-06T07:59:52.000Z
slug: "database-table-slack"
description: "首先，寫隻 xxx.sql 計算資料筆數，假定 table name 是 xxx： SELECT COUNT(1) FROM xxx; 再寫個 xxx.sh 去執行剛寫好的 sql，假定資料庫是用 MySQL： #!/bin/shmysql -D xxx_database < xxx.sql | grep -v \"COUNT(1)\" | awk -v date=\"$(date +\"%Y-%m-%d"
---

首先，寫隻 `xxx.sql` 計算資料筆數，假定 table name 是 `xxx`：
```
SELECT COUNT(1) FROM xxx;
```
再寫個 `xxx.sh` 去執行剛寫好的 sql，假定資料庫是用 MySQL：
```
#!/bin/shmysql -D xxx_database < xxx.sql | grep -v "COUNT(1)" | awk -v date="$(date +"%Y-%m-%d %H:%M")" '{print date" xxx table count: "$1}' >> xxx_count
```
讓 `xxx.sh` 自動定時運作，假定要每小時執行一次：
```
％ while true; do ./xxx.sh;sleep 3600; done;
```
再利用  [slackcat](https://github.com/bcicen/slackcat)  定時發送到 Slack 上的 `xxx_channel`，slackcat 的安裝設定請參考 GitHub 上的說明：
```
tail -F -n1 xxx_count | slackcat --stream --channel xxx_channel
```
這樣 Slack 上的 xxx_channel 就會定時收到一則訊息了。

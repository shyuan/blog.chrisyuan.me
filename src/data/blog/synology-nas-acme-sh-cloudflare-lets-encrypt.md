---
pubDatetime: 2026-10-01T05:00:00Z
title: "Synology NAS 內網也能用 Let's Encrypt：acme.sh + Cloudflare DNS 自動更新憑證"
slug: "synology-nas-acme-sh-cloudflare-lets-encrypt"
featured: false
draft: false
tags:
  - cli
  - cloudflare
  - synology
  - homelab
description: "內網 IP 的 Synology NAS 也能拿到公開信任的 Let's Encrypt 憑證：acme.sh 走 Cloudflare DNS challenge 簽發、部署到 DSM，再用 synowebapi 建立每日更新排程。"
---

家裡的 Synology NAS 只在內網使用，網域的 A record 指向 `192.168.x.x`，外面連不進來。過去一直用 DSM 的自簽憑證，每次開管理介面都要按掉瀏覽器警告。這次換成 Let's Encrypt 憑證，用 [acme.sh](https://github.com/acmesh-official/acme.sh) 走 Cloudflare 的 DNS challenge 簽發，部署到 DSM，再交給 DSM 工作排程器每天檢查更新。

做法主要參考 cocallaw 的 [Automating Let's Encrypt SSL Certificates on Synology DSM with acme.sh and Cloudflare DNS](https://cocallaw.com/posts/Automating-Lets-Encrypt-SSL-Certificates-on-Synology/)，但有幾個地方改了：不另建管理員帳號、不保存 DSM 密碼、更新指令改用 `--cron`、排程任務用指令建立。環境是 DSM 7.4.1、acme.sh v3.1.6。文中的網域、IP 都換成範例值。

## Table of contents

## 為什麼內網 IP 也能拿到公開憑證

Let's Encrypt 簽發前要確認你控制這個網域。常見的 HTTP-01 驗證會連到你的主機 80 port 讀檔案，內網主機做不到。DNS-01 驗證則是請你在 DNS 加一筆 `_acme-challenge.<網域>` 的 TXT 紀錄，CA 只查 DNS，不連你的主機。

所以只要網域的 DNS 託管在有 API 的服務上，A record 指向哪裡都沒關係。本文的設定是：

| 項目     | 值                                                       |
| -------- | -------------------------------------------------------- |
| NAS 網域 | `nas.example.com`                                        |
| A record | `192.168.1.10`（內網 IP，Cloudflare 灰雲 DNS only）      |
| DNS 託管 | Cloudflare，zone 為 `example.com`                        |
| CA       | Let's Encrypt                                            |
| 工具     | acme.sh 的 `dns_cf` DNS API + `synology_dsm` deploy hook |

整個過程不需要對外開任何 port。代價是 Cloudflare API token 要放在 NAS 上，所以 token 權限要盡量縮小。

## 與參考文章的差異

| 項目         | 參考文章                                     | 本文做法                | 理由                                                               |
| ------------ | -------------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| 執行身分     | 另建 `certadmin` 帳號                        | root                    | 搭配臨時管理員，不需要固定帳號                                     |
| DSM 登入     | `SYNO_Username` / `SYNO_Password` 寫入設定檔 | `SYNO_USE_TEMP_ADMIN=1` | deploy 時自動建臨時管理員、部署完刪除；不保存密碼，也不受 2FA 影響 |
| 自動更新指令 | `--renew -d <domain>`                        | `--cron`                | 一次處理所有憑證，renew 後自動跑已保存的 deploy hook               |
| 設定資料位置 | 和程式放在一起                               | `--config-home` 分開    | 程式和憑證、機密分離                                               |
| 排程建立     | DSM 網頁 GUI                                 | `synowebapi` CLI        | 在 ssh 內完成，建好的任務 GUI 一樣看得到、也能編輯                 |

`SYNO_USE_TEMP_ADMIN` 是 acme.sh [Synology NAS Guide](https://github.com/acmesh-official/acme.sh/wiki/Synology-NAS-Guide) 目前推薦的方式，限定 acme.sh 裝在 DSM 本機時使用，遠端或 Docker 內不能用。它需要 root 才能建帳號，所以執行身分順勢改成 root。

## 安裝與簽發

### 準備 Cloudflare API Token

Cloudflare → My Profile → API Tokens → Create Token，選「Edit zone DNS」範本：

- Permissions：`Zone` / `DNS` / `Edit`
- Zone Resources：`Include` / `Specific zone` / `example.com`

另外到 zone 的 Overview 頁右下角記下 Zone ID。有 Zone ID 就不需要 Zone:Read 權限，也不用填 Account ID。

### 下載與安裝 acme.sh

下載用一般使用者即可：

```sh
curl -fsSL -o /tmp/acme.sh.tar.gz https://github.com/acmesh-official/acme.sh/archive/refs/heads/master.tar.gz
```

接著切到 root，設定 Cloudflare 環境變數，順便驗證 token 能用：

```sh
sudo -i
export CF_Token="<token>"
export CF_Zone_ID="<zone id>"
curl -s -H "Authorization: Bearer $CF_Token" "https://api.cloudflare.com/client/v4/zones/$CF_Zone_ID"
```

解壓並安裝：

```sh
mkdir -p /tmp/acme-src && tar xzf /tmp/acme.sh.tar.gz -C /tmp/acme-src
cd /tmp/acme-src/acme.sh-master
sh ./acme.sh --install \
  --home /usr/local/share/acme.sh \
  --config-home /usr/local/share/acme.sh/data \
  --nocron --no-profile
```

DSM 的 `/tmp` 掛載成 noexec，直接 `./acme.sh` 會得到 `Permission denied`，所以要寫成 `sh ./acme.sh`。`--nocron` 則是不讓 acme.sh 自己寫 crontab：DSM 會重新產生 `/etc/crontab`，手改的內容可能被覆蓋，排程交給 DSM 工作排程器比較穩。

後面的指令都要帶 `--home` 和 `--config-home`，先用變數縮短：

```sh
A="/usr/local/share/acme.sh/acme.sh --home /usr/local/share/acme.sh --config-home /usr/local/share/acme.sh/data"
```

### 簽發憑證

acme.sh 預設 CA 是 ZeroSSL，先切成 Let's Encrypt 再簽：

```sh
$A --set-default-ca --server letsencrypt
$A --issue -d nas.example.com --dns dns_cf
```

acme.sh 會在 Cloudflare 新增 `_acme-challenge` TXT 紀錄，等 Let's Encrypt 驗證通過後刪掉，再取回憑證。預設金鑰是 ECC P-256，檔案放在 `data/nas.example.com_ecc/`。輸出最後會顯示 ARI 建議的更新時段，後面「自動更新」一節再說明。

### 部署到 DSM

```sh
export SYNO_USE_TEMP_ADMIN=1
export SYNO_Certificate="nas.example.com"   # DSM 上的憑證描述，用來辨識同一張憑證
export SYNO_Create=1                         # 不存在時新建
$A --deploy -d nas.example.com --deploy-hook synology_dsm
```

這些 `SYNO_*` 設定會以 `SAVED_SYNO_*` 存進網域設定檔，之後 renew 自動沿用。

第一次部署的 log 會顯示 `Restart HTTP services not necessary.`。原因是這張是新建的憑證，DSM 不會自動把它設成預設，DSM 本身還在用舊憑證，自然不需要重啟。

### 在 DSM 設定預設憑證（GUI，只做一次）

控制台 → 安全性 → 憑證：

1. 選 `nas.example.com` →「設為預設憑證」
2. 按「設定」，把系統預設（DSM Desktop Service）、FTPS、Synology Drive Server 等服務都改成這張

QuickConnect 的憑證由 Synology 管理，無法調整。KMIP 要另外考慮：如果這台 NAS 是別台 NAS 的遠端金鑰伺服器，對端可能綁定了憑證，而 Let's Encrypt 憑證大約 60 天就換一次，這種情況 KMIP 留在長效自簽憑證比較省事。

設好之後，後續 renew 會依 `SYNO_Certificate` 的描述原地更新同一張憑證，預設與服務綁定都會保留，相關服務也會自動重啟。

## 用 synowebapi 建立排程任務

DSM 的工作排程器一般在網頁上設定，不過 DSM 內建的 `synowebapi` 可以在 ssh 裡直接呼叫 DSM 的 Web API。參數格式沒有公開文件，我先列出現有任務，挑一個 script 類型的任務用 `method=get` 讀出完整定義，再照著格式改：

```sh
synowebapi --exec api=SYNO.Core.TaskScheduler method=list version=3
synowebapi --exec api=SYNO.Core.TaskScheduler method=get version=4 id=<既有任務 id>
```

依讀到的結構，建立每天 03:17 以 root 執行的任務：

```sh
synowebapi --exec api=SYNO.Core.TaskScheduler method=create version=4 \
  name='"acme.sh renew"' owner='"root"' enable=true type='"script"' \
  extra='{"notify_enable":false,"notify_if_error":false,"notify_mail":"","script":"/usr/local/share/acme.sh/acme.sh --cron --home /usr/local/share/acme.sh --config-home /usr/local/share/acme.sh/data"}' \
  schedule='{"date_type":0,"date":"2026/10/1","week_day":"0,1,2,3,4,5,6","repeat_date":1001,"hour":3,"minute":17,"repeat_hour":0,"repeat_min":0,"last_work_hour":3,"monthly_week":[],"version":4}'
```

字串參數要包兩層引號，shell 單引號裡再放 JSON 雙引號，例如 `name='"acme.sh renew"'`。`repeat_date` 是重複頻率代碼，`1001` 是每日，從既有任務觀察到 `1002` 是每週。

建好後 DSM 會在 `/etc/crontab` 自動產生對應的一行，任務定義存在 `/usr/syno/etc/synoschedule.d/root/<id>.task`：

```
17 3 * * * root /usr/syno/bin/synoschedtask --run id=7
```

到 GUI 的工作排程器也看得到這個任務，之後要改時間或停用都可以直接在網頁上操作。

## 每天執行 --cron 不等於每天更新

排程每天跑一次，但 `--cron` 不會每天重簽。它的判斷流程是：

1. 向 Let's Encrypt 查詢這張憑證的 ARI 建議時段（ARI 是 [RFC 9773](https://www.rfc-editor.org/rfc/rfc9773.html) 定義的 ACME Renewal Information 擴充）。如果設定檔記錄的下次更新時間 `Le_NextRenewTime` 落在時段之外，就在時段內重新挑一個時間寫回設定檔
2. 現在時間還沒到 `Le_NextRenewTime`，印出 `Skipping. Next renewal time is: ...` 後結束
3. 時間到了，重新簽發（走 DNS challenge），接著自動執行保存的 `synology_dsm` deploy，重啟相關服務

ARI 的用意是讓 CA 能調整客戶端的更新時間。例如 CA 需要大量撤銷憑證時，可以把建議時段提前，客戶端隔天的例行檢查就會提早更新。不想用的話可以設 `NO_ARI=1` 關掉。

這張憑證效期 90 天，預定在第 59 天左右更新，一年大約更新 6 次。某天更新失敗，隔天的排程會再試，到期前大約有 30 天緩衝。

目前狀態可以用 `$A --list` 查看。

## 驗證：強制更新

排程任務還沒到第一次自動觸發的時間，所以我手動執行和任務相同的指令，加上 `--force` 強制更新：

```sh
/usr/local/share/acme.sh/acme.sh --cron --force \
  --home /usr/local/share/acme.sh \
  --config-home /usr/local/share/acme.sh/data
```

結果：

- 重新簽發成功，序號更新，新憑證效期 2026-10-01 到 2026-12-30
- deploy 顯示 `Restart HTTP services succeeded.`，臨時管理員帳號部署完已自動刪除
- 從另一台機器用 `openssl s_client -connect nas.example.com:5001` 檢查，issuer 是 Let's Encrypt（YE1），`Verify return code: 0 (ok)`；瀏覽器開 `https://nas.example.com:5001/` 沒有警告

不過 log 裡有一行 `already verified, skipping dns-01`。Let's Encrypt 會沿用短時間內已通過的網域驗證（authorization reuse），這次距離第一次簽發只有幾分鐘，所以直接跳過了 DNS challenge。所以這次強制更新測到的是簽發、部署、重啟服務這段，DNS challenge 沒有再測一次。真正到期更新時舊的驗證早已過期，會重新走 DNS challenge；第一次簽發時那段已經成功過，只是要等到 11 月底第一次自動更新才算完整走過一輪。

## 選用：失敗時寄信通知

排程任務失敗時可以讓 DSM 寄信通知。任務端的設定是用 `method=set`（要帶完整參數）把任務的 `extra` 改成：

```json
{
  "notify_enable": true,
  "notify_if_error": true,
  "notify_mail": "<收件信箱>",
  "script": "..."
}
```

但前提是 DSM「控制台 → 通知設定 → 電子郵件」要先啟用並設定寄件方式。可以先查目前設定：

```sh
synowebapi --exec api=SYNO.Core.Notification.Mail.Conf method=get version=1
```

我的 NAS 原本是 `enable_mail: false`。信箱是 Google Workspace，所以在 GUI 選 Gmail 用 OAuth 授權，不必保存密碼；另一個選擇是 `smtp.gmail.com:587` 加應用程式密碼。我另外把主旨前綴設成 `[nas]`，方便在信箱裡篩選。設好後按「傳送測試郵件」，有收到信。再用 API 查一次，`enable_mail` 和 `enable_oauth` 都是 `true`，寄件伺服器是 `smtp.gmail.com:465`，任務的 `notify_enable` 和 `notify_if_error` 也都是 `true`。

不過我只驗證到測試郵件能寄出，沒有刻意讓任務失敗來看它會不會真的寄信。

## 檔案位置與收尾

| 內容                                     | 路徑                                                 |
| ---------------------------------------- | ---------------------------------------------------- |
| acme.sh 程式                             | `/usr/local/share/acme.sh/acme.sh`                   |
| 帳號設定                                 | `/usr/local/share/acme.sh/data/account.conf`         |
| 憑證、金鑰、網域設定                     | `/usr/local/share/acme.sh/data/nas.example.com_ecc/` |
| `CF_Token`、`CF_Zone_ID`、`SAVED_SYNO_*` | `.../nas.example.com_ecc/nas.example.com.conf`       |
| DSM 憑證存放                             | `/usr/syno/etc/certificate/_archive/<id>/`           |

- acme.sh v3.x 把 DNS API 的 token 存在各網域的 conf，不是全域的 `account.conf`。之後要簽別的網域，第一次簽發仍要重新 export `CF_Token` 和 `CF_Zone_ID`
- `data/` 目錄是 root 700、檔案 600，一般使用者讀不到 token
- `_archive/DEFAULT` 記錄預設憑證的 id，`INFO` 記錄服務綁定，兩個都要 root 才能讀
- 全部完成後 `exit` 離開 root shell，`CF_Token` 就不會留在 shell 環境變數裡

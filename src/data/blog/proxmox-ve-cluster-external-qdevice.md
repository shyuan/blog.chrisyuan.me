---
pubDatetime: 2026-10-01T10:00:00Z
title: "Proxmox VE QDevice 實戰：偶數台叢集用 Raspberry Pi 補第三方票，增減節點何時該拔"
slug: "proxmox-ve-cluster-external-qdevice"
featured: false
draft: false
tags:
  - proxmox-ve
  - homelab
  - cli
description: "偶數台 Proxmox VE 叢集可用 Raspberry Pi 跑 corosync-qnetd 補一票：從 quorum 原理、ffsplit 與 lms 差異、初次設定，到增減節點時要不要加回 QDevice。"
---

家裡的 Proxmox VE（PVE）叢集原本是 4 台節點。4 台的 quorum 是 3 票，只能容忍掉 1 台，容錯和 3 台一樣，遇到 2:2 分裂時兩邊都會失去 quorum。我的解法是拿一台 Raspberry Pi 跑 `corosync-qnetd`，當作叢集外的 QDevice 補第 5 票。今天（2026-10-01）叢集加入第 5 台節點，節點數變奇數，我又把 QDevice 移掉了，過程中 `pvecm qdevice remove` 還只做了一半。

環境是 PVE 9.2。`pvecm qdevice` 的部分行為我是讀 `/usr/share/perl5/PVE/CLI/pvecm.pm` 原始碼確認的，文中會註明。

| 主機              | 角色                              | IP                             |
| ----------------- | --------------------------------- | ------------------------------ |
| pve-1-1 ~ pve-1-4 | PVE 9.2 節點                      | 192.168.67.241–244             |
| pve-1-5           | 2026-10-01 新加入的節點           | 192.168.67.245                 |
| pi-2              | Raspberry Pi，跑 `corosync-qnetd` | 192.168.67.239（eth0 靜態 IP） |

QDevice 走 TCP 5403，走家中內網，不繞 Tailscale 或其他 VPN。文中的 IP 和主機名沿用我的 homelab，網域換成範例值。

## Table of contents

## Quorum 怎麼計票

### 為什麼要過半

PVE 用 Corosync 的 votequorum 計票。每個節點預設 1 票，quorum 是 `floor(總票數 / 2) + 1`，也就是嚴格過半。這是為了防止 split-brain：網路斷成兩半時，只有票數過半的那一邊能繼續寫入叢集狀態。

節點失去 quorum 時，`/etc/pve`（pmxcfs）會變成唯讀，不能改設定、不能啟動或建立 VM/CT、也不能遷移。沒有啟用 HA 的話，已經在跑的 VM 不受影響。有啟用 HA 就麻煩了，失去 quorum 的節點會被 watchdog 自我 fencing，也就是直接重開。

### QDevice 的架構

[QDevice](https://pve.proxmox.com/wiki/Cluster_Manager#_corosync_external_vote_support) 有兩個元件。`corosync-qnetd` 跑在叢集外的主機上負責仲裁，Raspberry Pi、NAS 上的 VM、VPS 都可以；它不用裝 PVE，也不是叢集成員，沒有 `/etc/pve`。`corosync-qdevice` 則跑在每一台 PVE 節點上，連到 qnetd，替叢集多拿一票。兩者都屬於 [corosync-qdevice](https://github.com/corosync/corosync-qdevice) 專案。

兩邊用 TLS 和 NSS 憑證庫互相認證。節點端的憑證庫在 `/etc/corosync/qdevice/net/nssdb`，qnetd 端在 `/etc/corosync/qnetd/nssdb`，後者要讓 `coroqnetd` 使用者讀得到。一台 qnetd 可以同時服務多個叢集，用 cluster name 區分，所以叢集名稱不能重複。

### ffsplit 與 lms

`pvecm qdevice setup` 會依節點數決定演算法。pvecm.pm 裡的這段：

```perl
my $algorithm = 'ffsplit';
if (scalar(%{$members}) & 1) {          # 奇數節點
    if ($param->{force}) {
        $algorithm = 'lms';
    } else {
        die "Clusters with an odd node count are not officially supported!\n";
    }
}
...
$qdev_section->{votes} = 1 if $algorithm eq 'ffsplit';
```

偶數節點用 ffsplit（fifty-fifty split），QDevice 給 1 票。發生 50:50 分裂時，qnetd 只把票投給其中一邊，讓那邊過半；兩邊條件相同時看 tie-breaker，預設是 node ID 最小的那邊。

奇數節點要加 `--force` 才設定得下去，而且演算法會換成 lms（last man standing），QDevice 拿 N−1 票。理論上只剩 1 台節點加上 qnetd 也能維持 quorum，代價是 qnetd 變成單點故障：qnetd 掛掉時，叢集一台節點都不能再掉。Proxmox 官方因此不建議奇數叢集用 QDevice。

所以 `--force` 在偶數叢集只是「覆蓋既有的 nssdb」，在奇數叢集卻會順便把演算法切成 lms。增減節點時要記得這個差別。

### 票數試算

| 情境                    | 節點票 | QDevice | 總票 | Quorum | 可容忍掉幾票       |
| ----------------------- | ------ | ------- | ---- | ------ | ------------------ |
| 2 node，無 QDevice      | 2      | —       | 2    | 2      | 0                  |
| 2 node + QDevice        | 2      | 1       | 3    | 2      | 1                  |
| 3 node                  | 3      | —       | 3    | 2      | 1                  |
| 4 node，無 QDevice      | 4      | —       | 4    | 3      | 1                  |
| 4 node + QDevice        | 4      | 1       | 5    | 3      | 2                  |
| 5 node，無 QDevice      | 5      | —       | 5    | 3      | 2                  |
| 5 node + QDevice（lms） | 5      | 4       | 9    | 5      | qnetd 成為單點故障 |

4 node 加 QDevice 的容錯和 5 node 一樣。我原本是第 5 列，加入新節點後變成第 6 列。

## 偶數台叢集的問題

2 node 最脆弱。quorum 是 2，任何一台掉線或重開，剩下那台就失去 quorum，`/etc/pve` 變唯讀，連開 VM 都不行。維護時只能用 `pvecm expected 1` 硬救，split-brain 的風險就是從這裡來的。

4 node 的 quorum 是 3，只能容忍掉 1 台，和 3 node 一樣，第 4 台沒有增加容錯。平常重開一台做更新時，剩下 3 台必須全部正常，這段期間再掉一台就失去 quorum。

更麻煩的是對半分裂。假設兩台接 A 交換器、兩台接 B 交換器，兩台交換器之間的 uplink 斷了，2:2 兩邊都只有一半的票，兩邊都失去 quorum，整個叢集停擺。有開 HA 的話，所有節點都會 fencing 重開。

加上 QDevice 之後，2 node 可以容忍 1 台掉線；4 node 可以容忍掉 2 票，也撐得住 2:2 分裂，因為 qnetd 會把票給其中一邊。QDevice 自己掛掉時，叢集只是退回沒有 QDevice 的狀態，不會比原本更差。

## 初次設定 QDevice

### 事前準備

- qnetd 主機用靜態 IP，放在 DHCP pool 外。我的 Pi 是 eth0 設靜態 .239，wlan0 另有 DHCP 位址，不給 qnetd 用。
- 有兩張網卡時調整 route metric（我設 eth0 100、wlan0 600），再用 `ip route get <節點IP>` 確認走 eth0。
- 防火牆開放節點到 qnetd 的 TCP 5403，用 `nc -vz 192.168.67.239 5403` 測試。
- 所有 PVE 節點都要在線，且叢集狀態是 Quorate。

### 安裝與 setup

1. 在 qnetd 主機（Pi）安裝伺服端，並設為開機啟動：

   ```bash
   apt update && apt install corosync-qnetd
   systemctl enable --now corosync-qnetd
   ```

2. 在**每一台** PVE 節點安裝 client：

   ```bash
   apt install corosync-qdevice
   ```

3. 讓執行 setup 的那台 PVE 能用 root 金鑰 ssh 進 qnetd 主機。setup 的第一步是 `ssh-copy-id -i /root/.ssh/id_rsa root@<qnetd>`（原始碼），所以 qnetd 主機必須讓 root 登入。Pi 預設不允許 root 用密碼登入，會直接出現 `Permission denied (publickey)`，不會問密碼。不必打開密碼登入，手動放公鑰就好：

   ```bash
   # PVE 上
   cat /root/.ssh/id_rsa.pub
   # Pi 上
   sudo mkdir -p /root/.ssh
   echo '<公鑰>' | sudo tee -a /root/.ssh/authorized_keys
   sudo chmod 700 /root/.ssh && sudo chmod 600 /root/.ssh/authorized_keys
   # PVE 上測試，不問密碼就是成功
   ssh root@192.168.67.239 hostname
   ```

   Pi 上實際生效的 sshd 設定可以用 `sshd -T | grep -Ei 'permitrootlogin|passwordauthentication'` 查。

4. 在任一台 PVE 執行：

   ```bash
   pvecm qdevice setup 192.168.67.239
   ```

   依原始碼，它會依序做這些事：
   - 在 qnetd 上初始化 CA
   - 替叢集簽發憑證，分發到各節點的 nssdb
   - 在 corosync.conf 的 `quorum {}` 加上 `device { model: net; net { host; algorithm: ffsplit; tls: on }; votes: 1 }`
   - ssh 到每一台節點執行 `systemctl start` / `enable corosync-qdevice`
   - 最後執行 `corosync-cfgtool -R`，讓全叢集重新載入設定

   另外有個選用參數 `--network <CIDR>`，可指定節點用哪個網段連 qnetd。

### 驗證與狀態判讀

```bash
pvecm status            # Flags: Quorate Qdevice；Total votes = Expected votes = 節點數 + 1
corosync-qnetd-tool -l  # 在 Pi 上執行，看連進來的叢集與節點
```

`pvecm status` 裡每台節點的 Qdevice 欄位應該是 `A,V,NMW`：

| 欄位值       | 意思                                        |
| ------------ | ------------------------------------------- |
| `A` / `NA`   | Alive / Not Alive：連得到／連不到 qnetd     |
| `V` / `NV`   | Vote / Not Voting：QDevice 的票有沒有算進去 |
| `MW` / `NMW` | Master Wins / Not Master Wins：正常是 `NMW` |

如果看到 `NA,NV,NMW`，Total votes 也少 1 票，代表 QDevice 有設定但連不上，先到 Pi 上看 `systemctl status corosync-qnetd`。

## 增減節點

### 原則：依節點數奇偶決定要不要加回

我以前的筆記寫的是「增減節點後一律 `pvecm qdevice setup --force` 把 QDevice 加回去」。知道 `--force` 在奇數叢集會切成 lms 之後，這條要改。

增減節點前先移除 QDevice。`pvecm qdevice setup` 發現 corosync.conf 已經有 device 時會直接拒絕（`must be removed before setting up new one`），不 remove 也沒辦法重設。`pvecm qdevice remove` 則要求所有節點都在線，否則會中止。

節點都到齊後，看節點數決定。變成偶數就加回 QDevice（ffsplit，1 票）。變成奇數就不要加回：奇數叢集本身不會對半分裂，硬要加回得用 `--force`，結果是 lms、N−1 票，qnetd 成為單點故障。

### 加入節點

以下是今天把 pve-1-5 加進叢集的實際流程。

1. 新節點先和叢集對齊：
   - 新裝的 PVE 預設是 enterprise repo。沒有訂閱的話，改成和其他節點一樣的 no-subscription repo。
   - `apt full-upgrade` 後重開，讓版本接近叢集。這次新節點升到 9.2.21，舊節點是 9.2.11，同一個大版本內 join 沒有問題，但之後應該把舊節點也升上去。
   - 就算暫時不打算加回 QDevice，也先裝 `corosync-qdevice`，join 不會自動補裝。之前重灌後 join 的 pve-1-3、pve-1-4 就是沒裝，跑 setup 時出現 `corosync-qdevice-net-certutil: command not found`。
   - 確認 DNS 正反解、NTP 已同步，新節點上沒有 VM/CT（join 時新節點的 `/etc/pve` 會被叢集的版本覆蓋）。

2. 在現有叢集任一台執行 `pvecm qdevice remove`，確認 Total votes 退回節點數。

3. 在新節點執行：

   ```bash
   pvecm add pve-1-1.homelab.example.com
   ```

   - 要用 FQDN。叢集換成公開信任的憑證之後，用 IP join 會出現 `hostname verification failed`。
   - 過程中會要求輸入目標節點的 root 密碼。
   - 成功時最後會印出 `successfully added node 'pve-1-5' to cluster.`

4. 一次只 join 一台，每台 join 完都用 `pvecm status` 確認 Quorate。

5. 修正 storage.cfg。join 之後，新節點原本的 `storage.cfg` 會被叢集的版本覆蓋。我的新節點是 ZFS root（`local-zfs` 對應 `rpool/data`），舊節點是 LVM-thin（`local-lvm`）。join 之後新節點的 `local-zfs` 不見了，`local-lvm` 顯示 disabled。修正方式：

   ```bash
   pvesm set local-lvm --nodes pve-1-1,pve-1-2,pve-1-3,pve-1-4
   pvesm add zfspool local-zfs --pool rpool/data --sparse 1 --content images,rootdir --nodes pve-1-5
   ```

   共享儲存也要檢查。這次 NFS 出現 `access denied by server`，原因是 NAS 端的 NFS 權限清單還沒加入新節點的 IP。

6. 依新的節點數決定要不要加回 QDevice。這次變成 5 台，所以沒有加回。如果是偶數：

   ```bash
   # 僅限節點數為偶數時；--force 用來覆蓋殘留的 nssdb
   pvecm qdevice setup 192.168.67.239 --force
   ```

### 移除節點

1. 把該節點上的 VM/CT 遷走，HA 資源也一併移除或遷走。
2. 執行 `pvecm qdevice remove`，這時所有節點都必須在線。
3. 把要移除的節點關機，之後也不能讓它用同樣的設定再開機連回叢集。
4. 在剩下的任一台執行 `pvecm delnode <節點名>`，再確認 Quorate。
5. 剩下偶數台的話，執行 `pvecm qdevice setup <qnetd> --force` 加回 QDevice；剩下奇數台就不加。

### qnetd 主機換 IP

叢集記的是舊位址。先從節點測 `nc -vz <新IP> 5403`，再執行 `pvecm qdevice remove`，然後 `pvecm qdevice setup <新IP> --force`。這裡同樣只適用偶數叢集。

## 其他注意事項

### 遇過的錯誤

依發生順序：

| 錯誤／症狀                                                                                                                                         | 原因                                                                                                                                                                          | 解法                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `ssh-copy-id ... Permission denied (publickey)`，沒有問密碼                                                                                        | Pi 的 sshd 不允許 root 用密碼登入                                                                                                                                             | 手動把 PVE 的 `id_rsa.pub` 放進 Pi 的 `/root/.ssh/authorized_keys`                                          |
| `QDevice certificate store already initialised, set force to delete!`                                                                              | 執行 setup 的節點上還留著 `/etc/corosync/qdevice/net/nssdb`，可能是上次 remove 沒跑完或手動殘留。setup 只檢查本機的這個目錄，原始碼裡還有一行 `# FIXME: check on all nodes?!` | setup 加 `--force`                                                                                          |
| `corosync-qdevice-net-certutil: command not found`（exit 127）                                                                                     | 重灌後 join 的節點沒裝 `corosync-qdevice`                                                                                                                                     | 補裝套件；清掉各節點的 `/etc/corosync/qdevice/net/nssdb` 和 Pi 的 `/etc/corosync/qnetd/nssdb`，再重跑 setup |
| 節點顯示 `NA,NV,NMW`；Pi 的 qnetd log 出現 `Can't open NSS DB directory (13): Permission denied`                                                   | 用 root 手動重建的 nssdb 屬主是 root，但服務以 `coroqnetd` 身分執行                                                                                                           | `chown -R coroqnetd:coroqnetd /etc/corosync/qnetd/nssdb`，再 `systemctl start corosync-qnetd`               |
| `pvecm qdevice remove` 印出 `Load key "/root/.ssh/id_rsa": error in libcrypto`，接著 `ssh ... rm -rf /etc/corosync/qdevice' failed: exit code 255` | 執行 remove 的節點上，`/root/.ssh/id_rsa` 是 0 bytes 的空檔，不知何時被清空。remove 要 ssh 到每台節點清理                                                                     | 見下一節                                                                                                    |

第 3、4 列是連鎖反應：為了處理第 3 列，我手動刪掉 Pi 上的 nssdb，重建出來的檔案權限就錯了。

### `qdevice remove` 只做一半時的手動收尾

這是今天移除 QDevice 時遇到的。依原始碼，`pvecm qdevice remove` 的執行順序是：

1. 從 corosync.conf 刪除 `quorum.device` 並寫回
2. ssh 到每台節點執行 `rm -rf /etc/corosync/qdevice`
3. ssh 到每台節點 `systemctl stop` / `disable corosync-qdevice`
4. `corosync-cfgtool -R`

第 2 步 ssh 失敗時，第 1 步已經生效（config_version 從 7 變 8，Expected votes 變成 4），但第 3、4 步都沒有執行。這時 `pvecm status` 的 Flags 仍顯示 `Quorate Qdevice`，每台節點是 `NA,NV,NMW`，最後一行是 `Qdevice (votes 0)`。

手動收尾，每一台節點都要做：

```bash
systemctl stop corosync-qdevice
systemctl disable corosync-qdevice
rm -rf /etc/corosync/qdevice
```

接著我跑了 `corosync-cfgtool -R`，但 runtime 的 Qdevice 旗標還在，必須**逐台**執行 `systemctl restart corosync` 才清得掉。每台重啟後先確認 `pvecm status` 仍是 Quorate，再換下一台。4 node 時一台重啟只會暫時少 1 票，剩 3 票仍然過半。全部做完之後，Flags 只剩 `Quorate`，Qdevice 那一行也消失了。

pvecm 的 qdevice 子指令都靠執行節點用 root ssh 連到其他節點（`BatchMode=yes`，使用 `/etc/pve/nodes/<node>/ssh_known_hosts`）。執行前可以先檢查：

```bash
ls -la /root/.ssh/id_rsa*   # 不能是 0 bytes
for ip in 192.168.67.241 192.168.67.242 192.168.67.243 192.168.67.244; do
  ssh -o BatchMode=yes root@$ip hostname
done
```

### qnetd 主機的維運

qnetd 也算叢集的一票，穩定度要比照節點。Pi 最好接 UPS，用 SSD 或高耐久度的記憶卡，免得 SD 卡寫壞；`systemctl enable corosync-qnetd` 確保斷電後會自己起來。

位置上，qnetd 最好不要和節點共用同一台交換器或同一條電源迴路，否則它會和某半邊節點一起消失，仲裁就沒有意義。同理，也不要把 qnetd 跑在叢集自己的 VM 裡。網路走內網直連，我的 Pi 同時是 Tailscale subnet router，但 QDevice 刻意走 eth0。

Pi 上的 root SSH 金鑰要留著，之後每次增減節點、重跑 setup 都會用到。可以考慮在 Pi 的 `authorized_keys` 加上 `from="192.168.67.0/24"` 限制來源。

### 什麼時候不需要 QDevice

奇數節點（3、5、7……）不需要，理由見前面 lms 的部分。我的叢集加入第 5 台之後就移除了 QDevice：5 票、quorum 3、可以掉 2 票，容錯和原本 4 node 加 QDevice 一樣，還少了一個外部依賴。如果叢集會在奇偶數之間來回變動，每次增減節點都要重新判斷要不要 QDevice。

### 緊急狀況

偶數叢集加 QDevice 時，qnetd 失聯不會讓叢集失去 quorum，只會少一票。真的失去 quorum、需要在剩下的節點上救急時，可以用 `pvecm expected <n>` 暫時降低 expected votes。執行前務必確認另一半真的已經停機，否則會造成 split-brain。

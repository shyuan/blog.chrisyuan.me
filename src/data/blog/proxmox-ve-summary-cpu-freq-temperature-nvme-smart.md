---
pubDatetime: 2026-10-14T16:45:00Z
title: "Proxmox VE 9.2 Summary 頁顯示溫度、CPU 時脈與 NVMe SMART：給 homelab 的安全 patch 做法"
slug: "proxmox-ve-summary-cpu-freq-temperature-nvme-smart"
featured: false
draft: false
tags:
  - proxmox-ve
  - homelab
  - linux
description: "讓 PVE 9.2 Summary 頁顯示各核心時脈、溫度與 NVMe SMART：從 sysfs 讀 cpufreq 與 hwmon、root timer 快取 smartctl，patch 可重複套用、可回滾、升級後自動補回。"
---

Proxmox VE（PVE）9.2 的節點 Summary 頁只有 CPU 使用率、記憶體、負載這些數字，看不到 CPU 溫度、各核心時脈，也看不到 NVMe 的 SMART 健康狀態。API 也沒有這些欄位。想讓它們出現在 Summary 頁，唯一的辦法是 patch 兩個 PVE 自帶的檔案：後端的 `Nodes.pm` 和前端的 `pvemanagerlib.js`。社群的做法都是這樣，我也不例外，只是多花了力氣讓 patch 出錯時不會弄壞 PVE，升級後也會自己補回來。

以下是我寫的 `pve-hwinfo` 的做法與安裝方式，完整原始碼在 [shyuan/pve-hwinfo](https://github.com/shyuan/pve-hwinfo)，文中的程式碼片段有省略。

## Table of contents

## 為什麼不直接用現成腳本

社群裡最常被引用的是 [KoolCore/Proxmox_VE_Status](https://github.com/KoolCore/Proxmox_VE_Status)，另外還有 [Meliox/PVE-mods](https://github.com/Meliox/PVE-mods) 和 Proxmox 論壇上的幾篇教學（[這篇](https://forum.proxmox.com/threads/so-close-i-just-want-to-display-cpu-nvme-hdd-temps-on-summary-page-of-proxmox.128887/post-563993)、[這篇](https://forum.proxmox.com/goto/post?id=514129)、[這篇](https://forum.proxmox.com/goto/post?id=823747)）。思路都一樣：在 `Nodes.pm` 的 status API 多塞資料，在 `pvemanagerlib.js` 多畫幾列。

我一開始看的是 KoolCore 的 `pve.sh`，讀完決定自己寫。

最先讓我卻步的是它夾帶太多無關操作：移除企業源與訂閱提示、跑 `apt full-upgrade`、編譯 it87 驅動。我只想讓 Summary 頁多幾列資訊，不想讓一支顯示用的腳本去升級整台機器。它還對 `smartctl` 和 `iostat` 設了 `chmod +s`，這兩個程式從此變成 setuid root，任何本機使用者都能以 root 身分執行。

效能上，它在每次 status poll 都跑 `iostat 1 1`。這個指令本身就會等 1 秒，所以 Summary 頁每次更新都固定慢 1 秒。

資料格式也很脆弱。後端把 `sensors`、`smartctl`、`lscpu` 的純文字輸出直接丟給瀏覽器，前端再用 regex 抓數字，指令輸出一改版就壞。實際上已經壞了一處：新版 `lscpu` 沒有 `CPU MHz` 那行，只剩 `CPU(s) scaling MHz`，時脈顯示直接失效。它還要求安裝 lm-sensors，其實讀溫度用不到，後面會講。

剩下兩個問題跟叢集有關。面板高度是安裝時依那台機器的硬體算好、寫死在 JS 裡的，但 PVE UI 會用同一份 JS 顯示叢集裡的其他節點，核心數或硬碟數不同就跑版。pve-manager 一升級，兩個被改過的檔案都會被覆蓋，腳本也沒有機制補回。

## 資料從哪裡讀

### status API 是以 www-data 身分執行

動手之前要先知道程式碼會以什麼身分執行。Summary 頁的資料來自 `GET /nodes/{node}/status`，這個 API 沒有標成 `protected`，所以它不會被轉到以 root 執行的 pvedaemon，而是直接在 pveproxy 裡以 www-data 身分執行（它有 `proxyto => 'node'`，請求會轉給目標節點自己的 pveproxy 處理）。

結果是：在這個 API 裡能讀 sysfs，但不能跑 `smartctl`（讀 NVMe SMART 需要 root）。KoolCore 用 setuid 解決這個問題，我改成讓 root 的 systemd timer 定期產生 cache 檔，API 只讀 cache。

### 溫度：直接讀 hwmon，不需要 lm-sensors

lm-sensors 的 `sensors` 指令讀的其實就是 `/sys/class/hwmon/hwmon*/`，每個目錄代表一顆感測晶片：

- `name`：晶片名稱，例如 `coretemp`、`k10temp`
- `tempN_input`：溫度，單位是千分之一 °C
- `tempN_label`：標籤，例如 `Core 0`、`Tctl`，不一定存在

這些檔案 www-data 都讀得到，不需要裝任何套件。常見的晶片名稱：

| 晶片          | 來源              | 標籤                                 |
| ------------- | ----------------- | ------------------------------------ |
| `coretemp`    | Intel CPU         | `Package id 0`、`Core N`             |
| `acpitz`      | ACPI thermal zone | 無標籤                               |
| `pch_skylake` | Intel PCH         | 無標籤                               |
| `k10temp`     | AMD CPU           | `Tctl`                               |
| `amdgpu`      | AMD 內顯          | `edge`                               |
| 網卡          | 部分網卡驅動      | `PHY Temperature`、`MAC Temperature` |
| `nvme`        | NVMe SSD          | `Composite`                          |
| `iwlwifi_*`   | Intel Wi-Fi       | 有目錄但讀不到值                     |

### 各核心時脈：cpufreq

每個核心的目前時脈在 `/sys/devices/system/cpu/cpuN/cpufreq/scaling_cur_freq`，硬體上下限在同目錄的 `cpuinfo_min_freq` 與 `cpuinfo_max_freq`，單位都是 kHz。這比解析 `lscpu` 可靠得多，也不怕輸出格式改版。

### NVMe：SMART 走 cache，溫度讀即時值

SMART 資料用 `smartctl -a -j` 取得，`-j` 讓它輸出 JSON，就不用 regex 解析文字。我用到的欄位：

- `model_name`、`nvme_total_capacity`
- `smart_status.passed`
- `nvme_smart_health_information_log` 底下的 `critical_warning`、`temperature`、`percentage_used`、`available_spare`、`data_units_read`、`data_units_written`、`power_cycles`、`power_on_hours`、`unsafe_shutdowns`、`media_errors`

`data_units_*` 的單位要換算：NVMe 規格的 1 data unit 是 1000 個 512-byte 區塊，也就是 512,000 bytes。

收集腳本 `collect-nvme` 以 root 執行，把結果原子寫入 `/run/pve-hwinfo/nvme.json`（先寫 `.tmp`、`chmod 0644`、再 `rename`），API 讀的時候不會讀到寫一半的檔案：

```perl
for my $dev (@ctrls) {
    my $raw = `smartctl -a -j $dev 2>/dev/null`; # non-zero exit bits still come with valid JSON
    my $j = eval { decode_json($raw) };
    next if ref($j) ne 'HASH' || !$j->{model_name};

    my $h = $j->{nvme_smart_health_information_log} // {};
    my $units = sub { defined($_[0]) ? $_[0] * 512 * 1000 : undef }; # NVMe data unit = 1000 x 512 bytes
    ...
}

mkdir($outdir, 0755) if !-d $outdir;
open(my $fh, '>', "$out.tmp") or die "$out.tmp: $!\n";
print $fh encode_json(\@devs);
close($fh) or die "$out.tmp: $!\n";
chmod(0644, "$out.tmp");
rename("$out.tmp", $out) or die "$out: $!\n";
```

注意 `smartctl` 的 exit code 是 bitmask，磁碟有任何警告時就不是 0，但 JSON 照樣完整，所以這裡不看 exit code，只看 JSON 能不能解析。

timer 每 5 分鐘跑一次，service 用 `Nice=10` 和 `IOSchedulingClass=idle` 降低優先權：

```ini
# pve-hwinfo-nvme.service
[Service]
Type=oneshot
ExecStart=/usr/local/lib/pve-hwinfo/collect-nvme
Nice=10
IOSchedulingClass=idle

# pve-hwinfo-nvme.timer
[Timer]
OnBootSec=1min
OnUnitActiveSec=5min
```

SMART 的累計值 5 分鐘更新一次就夠，但溫度 5 分鐘太慢。好在 NVMe 的溫度也有 hwmon 介面：`/sys/class/nvme/nvmeN/hwmonM/temp1_input`，www-data 讀得到。所以 API 讀完 cache 後，會用這個即時值蓋掉 cache 裡的溫度；溫度區塊則略過 `name` 為 `nvme` 的 hwmon，避免同一顆 SSD 的溫度出現兩次。

## 把資料接到 Summary 頁

### 後端：在 status API 加 `hwinfo` 欄位

`Nodes.pm` 的 status handler 裡有一行 `$res->{pveversion} = PVE::pvecfg::package();`，我把程式碼注入在它後面。整段包在 `eval` 裡，任何地方出錯，`$res->{hwinfo}` 就只是 `undef`，不會讓整個 status API 回 500，Summary 頁其他資訊照常顯示：

```perl
        # >>> pve-hwinfo BEGIN (managed by /usr/local/sbin/pve-hwinfo, do not edit)
        $res->{hwinfo} = eval {
            ...
            my $cpu_dir = '/sys/devices/system/cpu';
            my @cpus = sort { $a <=> $b } map { m!/cpu(\d+)$! ? $1 : () } glob("$cpu_dir/cpu[0-9]*");
            my $khz2mhz = sub { defined($_[0]) ? int($_[0] / 1000) : undef };
            my $cpufreq = {
                cur => [map { $khz2mhz->($int->("$cpu_dir/cpu$_/cpufreq/scaling_cur_freq")) } @cpus],
                min => $khz2mhz->($int->("$cpu_dir/cpu0/cpufreq/cpuinfo_min_freq")),
                max => $khz2mhz->($int->("$cpu_dir/cpu0/cpufreq/cpuinfo_max_freq")),
            };

            my @temps;
            for my $hwmon (glob('/sys/class/hwmon/hwmon*')) {
                my $chip = $slurp->("$hwmon/name");
                next if !defined($chip) || $chip eq 'nvme'; # NVMe temps are shown with SMART data
                for my $input (glob("$hwmon/temp*_input")) {
                    my ($n) = $input =~ m!/temp(\d+)_input$!;
                    my $millic = $int->($input);
                    next if !defined($millic);
                    push @temps, {
                        chip => $chip,
                        label => $slurp->("$hwmon/temp${n}_label") // "temp$n",
                        n => $n + 0,
                        value => $millic / 1000,
                    };
                }
            }

            # SMART data is collected by root (pve-hwinfo-nvme.timer), pveproxy runs as www-data
            my $nvme = [];
            my $cache = '/run/pve-hwinfo/nvme.json';
            ...
            for my $d (@$nvme) {
                next if ($d->{dev} // '') !~ /^nvme\d+$/;
                my ($input) = glob("/sys/class/nvme/$d->{dev}/hwmon*/temp1_input");
                my $millic = defined($input) ? $int->($input) : undef;
                $d->{temp} = $millic / 1000 if defined($millic); # live value beats the cached one
            }

            return {
                cpufreq => $cpufreq,
                temps => [sort { $a->{chip} cmp $b->{chip} || $a->{n} <=> $b->{n} } @temps],
                nvme => $nvme,
                nvme_updated => (stat($cache))[9],
            };
        };
        # <<< pve-hwinfo END
```

回傳的是結構化資料，不是純文字（數值為示意）：

```json
{
  "cpufreq": { "cur": [3400, 3392, ...], "min": 400, "max": 3500 },
  "temps": [{ "chip": "coretemp", "label": "Core 0", "n": 2, "value": 45 }, ...],
  "nvme": [{ "dev": "nvme0", "model": "...", "percentage_used": 32, ... }],
  "nvme_updated": 1792080000
}
```

格式化（換算 MHz、分組、排版）全部留給前端，後端只負責讀數字。

### 前端：在 StatusView 加三列

節點 Summary 的面板是 `PVE.node.StatusView`（alias `widget.pveNodeStatus`），裡面每一列是一個 `pmxInfoWidget`。我在 `pveversion` 那列後面插入三個 item，`textField` 都指向 `hwinfo`，各自用不同的 renderer：

```js
        {
            itemId: 'hwinfo-cpufreq',
            colspan: 2,
            printBar: false,
            title: 'CPU 時脈',
            textField: 'hwinfo',
            renderer: (info) => PveHwInfo.render(info, 'freq'),
            value: '',
        },
```

溫度和 NVMe 兩列結構相同。渲染邏輯集中在注入於 `PVE.node.StatusView` 定義前面的全域物件 `PveHwInfo`：

- 時脈：第一行是平均值與硬體範圍，之後每列 8 個核心，例如 `#0 3400 · #1 3392 · …`
- 溫度：依晶片分組，換成好認的名稱（`coretemp` / `k10temp` → CPU、`amdgpu` / `i915` → iGPU、`pch_*` → PCH、`acpitz` → ACPI），`Core N` 合併成一串 `核心 45 / 47 / 44 / 46 °C`
- NVMe：每顆兩行，第一行是型號、容量、溫度、已用壽命，第二行是讀寫量、通電次數與時數、異常斷電次數。SMART 未通過、有 critical warning 或 media errors 時，在第一行尾端加上紅色 ⚠

有一個要小心的地方：`pmxInfoWidget` 的 template 會把 renderer 回傳的字串當 HTML 渲染。SSD 型號、感測器標籤都是外部來的字串，所以都要過 `Ext.htmlEncode`：

```js
lines.push(
  `<b>${Ext.htmlEncode(this.chipName(chip))}</b>: ${parts.join(", ")}`
);
```

### 前端：依節點動態調整面板高度

`PVE.node.StatusView` 的 `height` 寫死 350，多出三列一定塞不下。高度又不能在安裝時算死，因為叢集裡每台節點的核心數、感測器、SSD 數量都不同，而瀏覽器載入的是同一份 JS。

要在資料載入後依目前節點重新算高度，就得找到每次載入都會跑的 hook。追了一下 `Proxmox.panel.StatusView`，它的 `updateValues` 每次 load 完都會呼叫 `updateTitle`，所以我在 `pveNodeStatus` 的 `updateTitle` 開頭的 `var me = this;` 後面插一行：

```js
PveHwInfo.resize(me);
```

`resize` 第一次執行時記下原本的高度，之後每次依實際行數計算：原高度 + 行數 × 17px + 每列 7px 的間距。切換到另一台節點時，高度會跟著變。

```js
    resize: function (view) {
        let info = view.getRecordValue('hwinfo');
        if (!info) {
            return;
        }
        if (view.pveHwInfoBaseHeight === undefined) {
            view.pveHwInfoBaseHeight = view.getHeight();
        }
        let extra = ['freq', 'temp', 'nvme']
            .map((kind) => this[`${kind}Lines`](info).length * this.lineHeight + this.rowPadding)
            .reduce((a, b) => a + b, 0);
        let height = view.pveHwInfoBaseHeight + extra;
        if (view.getHeight() !== height) {
            view.setHeight(height);
        }
    },
```

## 讓 patch 安全、可維護

既然一定要改 PVE 自帶的檔案，我給 patch 定了幾條規則。

### 標記區塊，可重複套用、可完整還原

每段注入的程式碼都夾在 `>>> pve-hwinfo BEGIN` 與 `<<< pve-hwinfo END` 兩行註解之間。`apply` 永遠先 strip 掉所有標記區塊，再重新注入，所以跑幾次結果都一樣；`restore` 只做 strip，還原後的檔案跟原檔 byte-identical。

```bash
# remove every marked block (marker lines included)
strip() {
    perl -0pi -e 's{^[^\n]*>>> pve-hwinfo BEGIN.*?<<< pve-hwinfo END[^\n]*\n}{}gms' "$@"
}
```

### 錨點必須剛好匹配一次

注入位置用 regex 找錨點，匹配次數不是 1 就中止。pve-manager 改版時如果錨點消失或變得不唯一，寧可不裝，也不要插錯地方：

```perl
my $count = () = $src =~ /$re/g;
die "anchor for $snippet matched $count times in $file (expected 1)\n" if $count != 1;
$src =~ s/($re)/$1$add/;
```

四個錨點分別是：`Nodes.pm` 的 `$res->{pveversion} = PVE::pvecfg::package()` 那一行、`Ext.define('PVE.node.StatusView', {` 之前、`pveNodeStatus` 裡 `textField: 'pveversion'` 那個 item 之後、`updateTitle` 的 `var me = this;` 之後。

### 備份、自動回滾、編譯檢查

套用前先把兩個檔案備份到暫存目錄，`trap rollback ERR` 讓任何一步失敗都自動還原。注入完再跑 `perl -c` 檢查 `Nodes.pm` 能不能編譯，不行也回滾：

```bash
    trap rollback ERR

    strip "$NODES_PM" "$MANAGER_JS"
    inject "$NODES_PM" "$LIB/nodes.pm.snippet" \
        '\n[ \t]*\$res->\{pveversion\} = PVE::pvecfg::package\(\)[^\n]*\n'
    ...

    if ! perl -c "$NODES_PM" >/dev/null 2>&1; then
        log "patched Nodes.pm does not compile"
        rollback
    fi
```

最後用 `systemctl reload pveproxy` 讓修改生效，而不是 `restart`。`restart` 會跑 pveproxy unit 的 `ExecStartPre`，也就是 `pvecm updatecerts`，沒必要為了改一個 API 去動叢集憑證。

### pve-manager 升級後自動補回

pve-manager 升級會覆蓋 `Nodes.pm` 與 `pvemanagerlib.js`。我放了一個 apt hook，每次 dpkg 跑完就檢查一次，標記不在就重新套用：

```
// /etc/apt/apt.conf.d/99pve-hwinfo
DPkg::Post-Invoke { "if [ -x /usr/local/sbin/pve-hwinfo ]; then /usr/local/sbin/pve-hwinfo apply --if-needed || true; fi"; };
```

結尾的 `|| true` 是刻意的：新版 pve-manager 如果讓錨點失效，`apply` 會失敗並回滾，但不能因此讓 apt 回報錯誤。最壞的情況只是 Summary 頁少了這三列。

## 測試與部署

### 本機測試

PVE 節點上不適合反覆試錯，所以先在 Mac 上測：拿一份真的 `pvemanagerlib.js`，加上一份只含錨點的假 `Nodes.pm`，確認：

- `apply` 跑兩次，結果完全相同
- patch 後的 JS 通過 `node --check`，`Nodes.pm` 通過 `perl -c`
- `restore` 後兩個檔案與原檔 byte-identical

前端的 render 邏輯則用 node 載入 `PveHwInfo`，stub 掉 `Ext.htmlEncode` 和 `Proxmox.Utils`，餵模擬資料看輸出的 HTML。

### 部署

在 PVE 節點上以 root 身分 clone repo 後執行 `install.sh`（PVE 預設沒有 git，要先裝）：

```bash
apt install -y git
cd /root
git clone https://github.com/shyuan/pve-hwinfo.git
bash pve-hwinfo/install.sh
```

`install.sh` 把檔案裝到 `/usr/local/sbin`、`/usr/local/lib/pve-hwinfo`、systemd 和 apt 設定目錄，啟用 timer、先跑一次收集，再 `apply`。裝完後重新整理瀏覽器，Summary 頁就會多出三列。叢集的其他節點不用逐台 clone，從已安裝的這台用 `deploy.sh` 透過叢集內建的 SSH 推過去即可（`bash /root/pve-hwinfo/deploy.sh <node> <node> ...`）：

```bash
for node in "$@"; do
    echo "===== $node"
    opts=(-o BatchMode=yes -o HostKeyAlias="$node" -o UserKnownHostsFile="/etc/pve/nodes/$node/ssh_known_hosts")
    tar cf - pve-hwinfo | ssh "${opts[@]}" "$node" 'cd /root && rm -rf pve-hwinfo && tar xf - && bash pve-hwinfo/install.sh'
done
```

PVE 叢集節點之間本來就有 root SSH 互信，各節點的 host key 放在 `/etc/pve/nodes/<node>/ssh_known_hosts`，指定 `UserKnownHostsFile` 和 `HostKeyAlias` 就能用它驗證。

裝完逐台驗證三件事：

1. `pve-hwinfo status`：兩個檔案都是 patched、timer active、NVMe cache 有更新時間
2. `pvesh get /nodes/<node>/status --output-format json`：回傳裡有 `hwinfo` 欄位
3. 瀏覽器逐台打開 Summary：console 沒有錯誤，面板高度隨節點不同而變化

## 其他選擇

`pve-hwinfo` 只顯示當下的數值，沒有歷史紀錄也沒有告警。如果需要這些，比較正規的做法是 [Prometheus node_exporter](https://github.com/prometheus/node_exporter)（它的 hwmon collector 一樣讀 sysfs）加上 [smartctl_exporter](https://github.com/prometheus-community/smartctl_exporter)，再接 Grafana 畫圖、設告警規則。

另一個選擇是 [Pulse](https://github.com/rcourtman/Pulse)，它是獨立的 PVE 監控 dashboard，不改 PVE 本身的檔案，但溫度要另外在節點上裝 agent 和 lm-sensors（見[這則討論](https://github.com/rcourtman/Pulse/discussions/1000)）。

我想要的只是打開 Summary 頁就能一眼看到溫度和 SSD 狀態，不想多維護一套監控系統，所以選擇 patch。改 PVE 自帶檔案的風險本來就在，能做的是讓它出錯時只影響自己那三列：注入點找不到就不裝、程式出錯就不顯示、升級後自動補回、隨時可以 `pve-hwinfo restore` 還原成原檔。

---
title: "mDNS 全解析：從 .local 到 Matter 智慧家庭"
pubDatetime: 2020-01-03T10:51:27.000Z
modDatetime: 2026-02-20T00:00:00Z
slug: "mdns"
canonicalURL: "https://blog.chrisyuan.me/posts/mdns/"
tags:
  - linux
  - networking
  - iot
description: "從 Raspberry Pi 的 .local 域名出發，介紹 mDNS 的起源、運作原理、常見實作軟體，以及在 Matter 智慧家庭、IoT、AirPlay 等場景的最新應用與安全注意事項。"
---

## Table of contents

## 前言

如果有在 Raspberry Pi 上安裝過 Raspbian，網路設定完成，OpenSSH server 啟動後，就可以在同網段下，用下面指令 ssh 進去：

`ssh pi@raspberrypi.local`

為什麼可以直接用 raspberrypi.local 這個名稱找到 Raspberry Pi 裝置的 IP 呢?

## 起源

進入網路時代後，各種裝置都有聯網需求，既然要聯網，就少不了網路設定的步驟，雖然有 DHCP 協定，可以省去在設備裝置上設定 IP/子網路遮罩/DNS server 的流程，但如果需要連上某台設備，還是得先知道該台設備的 IP/Port 等資料才能連上，而且透過 DHCP 拿到的 IP 是有可能變動的，可能某台設備剛設定好時 IP 是 192.168.5.100，過一陣子重開機後就變成 192.168.5.200，使用這台設備的人就必須要重新設定到新的 IP 上才能繼續使用，這個步驟有沒有辦法讓他自動化呢?

現在人手一支的 iPhone，大家都知道是 Apple 的，大家也知道在 iPhone 之前 Apple 還賣了好多年 Mac 電腦，但應該很少人知道 [Apple 早年還賣過印表機](https://en.wikipedia.org/wiki/List_of_Apple_printers)，在後期進入網路時代，這些印表機也能聯網，可以分享給在同一區域網路中的電腦列印，Apple 也為此開發設計了一個通訊協定 [AppleTalk](https://en.wikipedia.org/wiki/AppleTalk) ，讓電腦可以和印表機溝通。再後來 AppleTalk 被 [Universal Plug and Play(UPnP)](https://en.wikipedia.org/wiki/Universal_Plug_and_Play) 取代，其中一份網路協定 [Multicast DNS(mDNS)](https://en.wikipedia.org/wiki/Multicast_DNS) 由 Apple工程師 [Stuart Cheshire](https://en.wikipedia.org/wiki/Stuart_Cheshire) 所設計出來，這位工程師還是 Apple 中的 [DEST(Distinguished Engineer, Scientist, or Technologist)](https://www.quora.com/What-are-the-equivalent-title-of-Apples-individual-contributor-as-engineers-to-outside-company) ，在 Apple 裡，只有最頂尖優秀的工程師、研究學者與技術人員才會給予 DEST 頭銜。

## 運作原理

mDNS 是利用 Multicast (224.0.0.251(IPv4), ff02::fb(IPv6) + UDP 5353 port) 模擬出一台虛擬的 DNS server，設備裝置可以透過這個特殊的 Multicast IP + Port 暴露自己的連線方式或是擁有的能力，讓同一網路中的其他裝置也在這組 IP/Port 找到對應的設備裝置。

搭配 [DNS-Based Service Discovery(DNS-SD)](https://tools.ietf.org/html/rfc6763)，裝置不只能解析 `.local` 主機名稱，還能廣播自己提供的服務類型（如 `_http._tcp`、`_ipp._tcp`），讓其他裝置自動發現可用的網頁伺服器、印表機等服務，完全不需要手動設定。

詳細細節規範可參考 [RFC 6762 (Multicast DNS)](https://tools.ietf.org/html/rfc6762) 及 [RFC 6763 (DNS-Based Service Discovery)](https://tools.ietf.org/html/rfc6763) 這兩份 RFC。

### 後續標準演進

- **[RFC 8766 - Discovery Proxy](https://datatracker.ietf.org/doc/rfc8766/)（2020）**：定義了一個 Proxy 機制，可以將本地 mDNS 服務透過 unicast DNS 暴露給跨網段的客戶端，解決 mDNS 無法跨子網路的限制。
- **[RFC 9665 - Service Registration Protocol(SRP)](https://datatracker.ietf.org/doc/rfc9665/)（2024）**：允許裝置透過 unicast DNS Update 註冊服務，取代 multicast 廣播。專為無線 mesh 網路（如 Thread）和省電裝置設計，是 Matter 智慧家庭協定中 Thread 裝置的核心通訊機制。

## 常見的 mDNS/DNS-SD 軟體

### Apple Bonjour

Apple 的原生 mDNS/DNS-SD 實作，基於開源的 [mDNSResponder](https://github.com/nicupavel/mDNSResponder)。深度整合在 macOS 和 iOS 中，是 AirPlay、AirPrint、HomeKit、Time Machine 等功能的基礎。Apple 也提供 Windows 版本（隨 iTunes 安裝）。

### Avahi

Linux 上最廣泛使用的 mDNS/DNS-SD 實作。Raspberry Pi 的 Raspbian 預設安裝 Avahi，這也是為什麼可以直接用 `raspberrypi.local` 連線的原因。

值得注意的是，Avahi 最後一個穩定版本 0.8 發布於 2020 年 2 月，至今已超過五年沒有新的正式版本。近年陸續被揭露多個安全漏洞（CVE-2024-52615、CVE-2024-52616 等），修補程式雖然已存在於專案 repository，但尚未整合發布新版本。

### systemd-resolved

systemd 內建的 DNS 解析服務，支援 mDNS 名稱解析（`.local` 主機名稱），但服務廣播和瀏覽的功能不如 Avahi 完整。同時執行 Avahi 和 systemd-resolved 會因為搶佔 UDP 5353 port 而產生衝突，Fedora 的做法是在安裝 Avahi 時預設停用 systemd-resolved 的 mDNS 功能。

### Windows 原生支援

- **Windows 10 1703（2017）**：首次加入原生 mDNS 支援，但僅限發現印表機、螢幕鏡像裝置等。
- **Windows 10 1903（2019）**：擴展為通用的 `.local` 主機名稱解析，並開放 Win32 API。
- **Windows 11**：透過 DNS Client 服務（`dnscache`）內建 mDNS 支援，不再需要額外安裝 Bonjour。

不過 Windows 的原生 mDNS 只處理名稱解析，不支援服務廣播。需要廣播服務的應用程式仍需依賴 Bonjour 或第三方 mDNS 函式庫。

### 瀏覽工具

- [Discovery - DNS-SD Browser for Mac](https://apps.apple.com/us/app/discovery-dns-sd-browser/id1381004916?mt=12)
- [Discovery - DNS-SD Browser for iOS](https://apps.apple.com/us/app/discovery-dns-sd-browser/id305441017)

## 常見應用

### 智慧家庭

- **[Matter](https://csa-iot.org/all-solutions/matter/)**：由 Connectivity Standards Alliance 制定的智慧家庭標準，截至 2025 年底已有超過 10,400 個認證產品。Matter 將 mDNS/DNS-SD 作為核心裝置發現機制——新裝置透過 mDNS 廣播自己等待配對（Commissionable Discovery），配對完成後也持續透過 DNS-SD 被發現（Operational Discovery）。Thread 裝置則透過 Thread Border Router 將 SRP 註冊轉譯為 mDNS 廣播。
- **[Apple HomeKit](https://developer.apple.com/homekit/)**：透過 Bonjour 廣播 `_hap._tcp`（HomeKit Accessory Protocol）服務來發現配件裝置。[Homebridge](https://homebridge.io/) 等開源專案也利用 mDNS 將非 HomeKit 裝置橋接進 HomeKit 生態系。

### 影音串流

- **Google Chromecast**：廣播 `_googlecast._tcp` 服務，讓 Google Home App 和支援 Cast 的 App 自動發現裝置。
- **Apple AirPlay**：廣播 `_airplay._tcp` 和 `_raop._tcp` 服務，實現無線投影和音訊串流。
- **Spotify Connect**：透過 mDNS 發現區域網路中的 Spotify 播放裝置。

### 列印服務

網路印表機是 mDNS 最早也最普及的應用之一，透過廣播 `_ipp._tcp`（Internet Printing Protocol）服務，macOS 和 Linux 可以自動發現印表機，完全不需要手動安裝驅動程式或設定 IP。Apple AirPrint 也是基於相同機制。

### IoT 裝置

- **ESP32 / Espressif 平台**：ESP-IDF 框架內建 mDNS 支援，ESP32 IoT 裝置普遍使用 mDNS 讓自己可被發現（如 `mydevice.local`）。
- **[OctoPrint](https://octoprint.org/)**（3D 列印管理）：內建 Discovery Plugin，透過 mDNS 廣播 `_octoprint._tcp` 服務。
- **NAS 裝置**：Synology DSM 和 QNAP QTS 都支援 Bonjour/mDNS 服務發現，讓 macOS 的 Finder 可以自動找到 NAS 上的檔案分享、多媒體等服務。
- **[Home Assistant](https://www.home-assistant.io/)**：利用 mDNS 自動發現 HomeKit 裝置、ESPHome 裝置等整合。

## mDNS vs LLMNR

[LLMNR（Link-Local Multicast Name Resolution）](https://tools.ietf.org/html/rfc4795) 是 Microsoft 開發的協定，功能與 mDNS 類似但僅提供名稱解析，不支援服務發現。

| 特性           | mDNS                                    | LLMNR            |
| -------------- | --------------------------------------- | ---------------- |
| 標準           | RFC 6762（IETF）                        | RFC 4795（IETF） |
| 開發者         | Apple                                   | Microsoft        |
| Multicast 位址 | 224.0.0.251                             | 224.0.0.252      |
| Port           | UDP 5353                                | UDP 5355         |
| 網域           | `.local`                                | 任意單一標籤名稱 |
| 服務發現       | 有（搭配 DNS-SD）                       | 無               |
| 跨平台         | macOS / Linux / Windows / iOS / Android | 主要 Windows     |

Microsoft 在 2022 年宣布將逐步淘汰 LLMNR 和 NetBIOS，統一採用 mDNS 作為預設的 multicast 名稱解析協定。Windows Server 2025 將是最後一個內建 WINS 的 LTSC 版本。

## 安全注意事項

mDNS 在設計上沒有驗證機制，使用時需要留意以下風險：

- **放大攻擊（DDoS）**：mDNS 回應封包通常比查詢封包大很多（放大倍率可達 130%–975%），如果 mDNS 暴露在公網上，可被利用為 DDoS 反射攻擊的跳板。
- **投毒攻擊（Spoofing）**：同一網段的任何裝置都能回應 mDNS 查詢，攻擊者可以偽造回應將流量導向惡意主機。滲透測試工具 [Responder](https://github.com/lgandx/Responder) 就利用 mDNS、LLMNR 和 NetBIOS 來攔截 Windows 網路的 NTLMv2 雜湊值。
- **資訊洩漏**：mDNS 會向網路上所有裝置廣播主機名稱、服務類型、Port 等詳細資訊。

### 防護建議

- 絕對不要將 mDNS（UDP 5353）暴露在外網 / WAN 介面上
- 企業網路中考慮透過 Group Policy 停用 mDNS、LLMNR 和 NetBIOS-NS
- 利用網路分段和防火牆規則，限制 mDNS 只在受信任的網段中運作
- 定期更新 mDNS 實作軟體（Avahi 等）的安全修補

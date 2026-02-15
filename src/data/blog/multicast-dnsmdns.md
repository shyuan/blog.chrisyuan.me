---
title: "聊聊 Multicast DNS(mDNS)"
pubDatetime: 2020-01-03T10:51:27.000Z
slug: "multicast-dnsmdns"
description: "如果有在 Raspberry Pi 上安裝過 Raspbian，網路設定完成，OpenSSH server 啟動後，就可以在同網段下，用下面指令 ssh 進去： ssh pi@raspberrypi.local 為什麼可以直接用 raspberrypi.local 這個名稱找到 Raspberry Pi 裝置的 IP 呢? 起源 進入網路時代後，各種裝置都有聯網需求，既然要聯網，就少不了網路設定的"
---

如果有在 Raspberry Pi 上安裝過 Raspbian，網路設定完成，OpenSSH server 啟動後，就可以在同網段下，用下面指令 ssh 進去：

`ssh pi@raspberrypi.local`

為什麼可以直接用 raspberrypi.local 這個名稱找到 Raspberry Pi 裝置的 IP 呢?

# 起源

進入網路時代後，各種裝置都有聯網需求，既然要聯網，就少不了網路設定的步驟，雖然有 DHCP 協定，可以省去在設備裝置上設定 IP/子網路遮罩/DNS server 的流程，但如果需要連上某台設備，還是得先知道該台設備的 IP/Port 等資料才能連上，而且透過 DHCP 拿到的 IP 是有可能變動的，可能某台設備剛設定好時 IP 是 192.168.5.100，過一陣子重開機後就變成 192.168.5.200，使用這台設備的人就必須要重新設定到新的 IP 上才能繼續使用，這個步驟有沒有辦法讓他自動化呢?

現在人手一支的 iPhone，大家都知道是 Apple 的，大家也知道在 iPhone 之前 Apple 還賣了好多年 Mac 電腦，但應該很少人知道 [Apple 早年還賣過印表機](https://en.wikipedia.org/wiki/List_of_Apple_printers)，在後期進入網路時代，這些印表機也能聯網，可以分享給在同一區域網路中的電腦列印，Apple 也為此開發設計了一個通訊協定 [AppleTalk](https://en.wikipedia.org/wiki/AppleTalk) ，讓電腦可以和印表機溝通。再後來 AppleTalk 被 [Universal Plug and Play(UPnP)](https://en.wikipedia.org/wiki/Universal_Plug_and_Play) 取代，其中一份網路協定 [Multicast DNS(mDNS)](https://en.wikipedia.org/wiki/Multicast_DNS) 由 Apple工程師 [Stuart Cheshire](https://en.wikipedia.org/wiki/Stuart_Cheshire) 所設計出來，這位工程師還是 Apple 中的 [DEST(Distinguished Engineer, Scientist, or Technologist)](https://www.quora.com/What-are-the-equivalent-title-of-Apples-individual-contributor-as-engineers-to-outside-company) ，在 Apple 裡，只有最頂尖優秀的工程師、研究學者與技術人員才會給予 DEST 頭銜。

mDNS 是利用 Multicast (224.0.0.251(IPv4), ff02::fb(IPv6) + UDP 5353 port) 模擬出一台虛擬的 DNS server，設備裝置可以透過這個特殊的 Multicast IP + Port 暴露自己的連線方式或是擁有的能力，讓同一網路中的其他裝置也在這組 IP/Port 找到對應的設備裝置，詳細細節規範可參考 [RFC 6762 (Multicast DNS)](https://tools.ietf.org/html/rfc6762) 及 [RFC 6763 (DNS-Based Service Discovery)](https://tools.ietf.org/html/rfc6763) 這兩份 RFC。

# 常見的 mDNS/DNS-SD 軟體

- [Bonjour](https://en.wikipedia.org/wiki/Bonjour_%28software%29)
- [Avahi](https://en.wikipedia.org/wiki/Avahi_%28software%29)
- [Discovery - DNS-SD Browser for Mac](https://apps.apple.com/us/app/discovery-dns-sd-browser/id1381004916?mt=12)
- [Discovery - DNS-SD Browser for iOS](https://apps.apple.com/us/app/discovery-dns-sd-browser/id305441017)

# 常見應用

- Google Chromecast
- Apple AirPlay
- Spotify Connect
- Apple Time Machine

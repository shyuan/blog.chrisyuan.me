---
title: "幾個 VirtualBox 小技巧"
pubDatetime: 2020-01-06T06:52:14.000Z
slug: "virtualbox"
description: "Headless Mode 如果 VM 是跑成 server 不需要終端機做螢幕輸出和鍵盤滑鼠輸入，可以用 Headless 方式把 VM 跑起來 VBoxHeadless --startvm vm-name --vrde off & 強制改變 Disk Image 的 UUID 如果要使用的 disk image 被 VirtualBox 說有其他 VM 使用相同 UUID 的 disk ima"
---

# Headless Mode
如果 VM 是跑成 server 不需要終端機做螢幕輸出和鍵盤滑鼠輸入，可以用 Headless 方式把 VM 跑起來
`VBoxHeadless --startvm vm-name --vrde off &`

# 強制改變 Disk Image 的 UUID
如果要使用的 disk image 被 VirtualBox 說有其他 VM 使用相同 UUID 的 disk image，可以參考  [How do I change the UUID of a virtual disk?](https://stackoverflow.com/questions/17803331/how-do-i-change-the-uuid-of-a-virtual-disk) 強制變更 UUID

`VBoxManage internalcommands sethduuid "Ubuntu Server 18.04.3 (64bit).vdi"`

# 送出關機訊號給 VM
如果想關閉 VM 又不想登入 VM 執行關機指令，可以用這樣的 command 讓 VM 可以正常關機
`VBoxManage controlvm vm-name acpipowerbutton`

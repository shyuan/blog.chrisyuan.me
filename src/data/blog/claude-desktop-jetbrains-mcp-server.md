---
title: "在 Claude Desktop 上使用
  JetBrains MCP Server"
pubDatetime: 2025-05-20T07:44:36.000Z
slug: "claude-desktop-jetbrains-mcp-server"
description: "https://github.com/JetBrains/mcp-jetbrains JetBrains 有提供 MCP Server plugin 可以讓 MCP client 使用，照 JetBrains/mcp-jetbrains 的說明文件在 Claude Desktop 設定會出現以下錯誤： env: node: No such file or directory 原來是因為我的"
tags:
  - claude-desktop
  - jetbrains
  - mcp
  - mcp-server
  - nodejs
  - environment-variables
---

%[https://github.com/JetBrains/mcp-jetbrains]

[JetBrains](https://www.jetbrains.com/) 有提供 [MCP Server plugin](https://plugins.jetbrains.com/plugin/26071-mcp-server) 可以讓 MCP client 使用，照 [JetBrains/mcp-jetbrains](https://github.com/JetBrains/mcp-jetbrains) 的說明文件在 [Claude Desktop](https://claude.ai/download) 設定會出現以下錯誤：

```plaintext
env: node: No such file or directory
```

原來是因為我的 [Node.js](https://nodejs.org/) 是特別安裝 [v22(LTS)](https://nodejs.org/en/blog/announcements/v22-release-announce)，Claude Desktop 的 PATH 環境變數抓不到 node 的路徑，把設定檔加上 `env` attribute 後就可以用了

```JSON
{
  "mcpServers": {
    "jetbrains": {
      "command": "npx",
      "args": [
        "-y",
        "@jetbrains/mcp-proxy"
      ],
      "env": {
        "PATH": "/opt/homebrew/opt/node@22/bin:/usr/local/bin:/usr/bin:/bin",
        "NODE_PATH": "/opt/homebrew/opt/node@22/lib/node_modules"
      }
    }
  }
}
```

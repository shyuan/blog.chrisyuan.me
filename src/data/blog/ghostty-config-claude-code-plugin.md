---
title: "用自然語言設定 Ghostty — 開發 Claude Code Plugin 的經過"
pubDatetime: 2026-02-21T16:00:00Z
slug: ghostty-config-claude-code-plugin
tags:
  - ghostty
  - claude-code
  - mcp
  - mcp-server
  - plugin
  - marketplace
description: "Ghostty 純文字設定檔的不便催生了一個想法：把 Ghostty CLI 包裝成 MCP Server，搭配 Claude Code Skill，用自然語言來設定終端機。從踩坑到上架 Marketplace 的開發紀錄。"
---

## Table of contents

## 起因：Ghostty 的設定痛點

[Ghostty](https://ghostty.org/) 是一個用 Zig 寫的現代終端機模擬器，效能很好、功能完整，但它跟 [iTerm2](https://iterm2.com/) 之類的 macOS 終端機有個很大的不同——**沒有 GUI 設定介面**。所有設定都靠編輯一個純文字的 `config` 檔，macOS 上路徑是：

```
~/Library/Application Support/com.mitchellh.ghostty/config
```

設定語法長這樣：

```ini
font-family = JetBrains Mono
font-size = 14
theme = catppuccin-mocha
background-opacity = 0.9
```

看起來很直覺，但實際用起來會碰到不少問題。首先，Ghostty 有超過 120 個設定選項，每個選項的值型態、單位、預設值都不同，光靠記憶很容易搞錯。再來，有些選項的行為跟直覺不一樣——這點後面會詳細講。社群也注意到了這個不便，有人做了 [web 版設定編輯器](https://ghostty.zerebos.com/)，但我覺得這個問題更適合用自然語言來解決：直接跟 AI 說「我想要半透明深色背景」，讓它幫你查文件、產生正確的設定值。

這個想法就是 [ghostty-config plugin](https://github.com/shyuan/ghostty-config-plugin) 的起點。

## 契機：認識 Claude Code 的 Plugin 生態

正好那時在研究 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 的擴展機制。Claude Code 有一套 marketplace / plugin 的生態系統，讓開發者可以把自己做的工具分享給其他人用。Ghostty 設定這個題目不大不小——有明確的 scope、有實際的痛點、又不至於複雜到做不完——非常適合拿來練手。

Claude Code 的 plugin 架構大致分三層：

| 層級                   | 角色 | 說明                                                 |
| ---------------------- | ---- | ---------------------------------------------------- |
| **Marketplace**        | 索引 | 列出有哪些 plugin 可以安裝，像是 npm registry 的角色 |
| **Plugin**             | 容器 | 宣告這個 plugin 包含什麼——MCP Server、Skill、Agent   |
| **MCP Server + Skill** | 實作 | MCP 提供工具能力，Skill 提供領域知識與判斷力         |

一句話總結：**MCP 讓 AI「能做」，Skill 讓 AI「知道怎麼做」。**

我決定把整個專案拆成三個 repo：

- [`shyuan-marketplace`](https://github.com/shyuan/shyuan-marketplace) — marketplace 索引，列出可安裝的 plugin，未來開發新的 plugin 也可以直接加進來
- [`ghostty-config-plugin`](https://github.com/shyuan/ghostty-config-plugin) — plugin 本體，包含 Skill 和內嵌的 MCP Server
- [`ghostty-config-mcp`](https://github.com/shyuan/ghostty-config-mcp) — MCP Server 獨立 repo，也可以單獨使用

拆開的好處是 MCP Server 可以獨立發布到 npm，不依賴 Claude Code plugin 系統也能用。其實 marketplace 和 plugin 用的是同一種設定檔格式，所以也可以跳過 add marketplace 的步驟，直接用 GitHub repo URL 安裝 plugin。

## 技術核心：把 Ghostty CLI 包裝成 Local MCP Server

Ghostty 的執行檔本身就提供了很豐富的子命令：

```bash
ghostty +show-config --default --docs   # 完整設定文件（~120KB）
ghostty +list-fonts                      # 列出所有可用字型
ghostty +list-themes --plain             # 列出所有主題
ghostty +list-actions --docs             # 列出可綁定的 action
ghostty +list-keybinds --plain           # 列出目前的快捷鍵
ghostty +list-colors --plain             # 列出命名顏色
ghostty +show-face --string="你好"        # 查看特定字元用了哪個字型
ghostty +validate-config                 # 驗證設定檔語法
ghostty +show-config --changes-only      # 只顯示使用者修改過的值
```

這些子命令回傳的是純文字——每個都是可以被 parse 的結構化資料。把它們包裝成 [MCP](https://modelcontextprotocol.io/) Server 的好處是：**不需要對外連線，所有資料都來自本機安裝的 Ghostty**。查設定文件不靠網路、列字型列的是你電腦上實際安裝的字型、驗證設定檔驗的是你本機的 config 檔——全部 local。

### MCP Server 的實作

MCP Server 用 TypeScript 寫，跑在 Node.js 上（也相容 bun）。入口長這樣：

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "ghostty-config",
  version: "1.0.0",
});

// 註冊 11 個 tools
registerVersion(server);
registerSearchConfigDocs(server);
registerGetConfigOption(server);
registerShowCurrentConfig(server);
registerValidateConfig(server);
registerListFonts(server);
registerListThemes(server);
registerListActions(server);
registerListKeybinds(server);
registerListColors(server);
registerShowFace(server);

// 用 stdio transport 啟動
const transport = new StdioServerTransport();
await server.connect(transport);
```

每個 tool 是一個獨立模組。以 `ghostty_list_themes` 為例——接收篩選參數、執行 CLI 命令、parse 輸出、回傳結構化結果：

```typescript
import { z } from "zod";
import { exec } from "../lib/exec.ts";
import { parseThemeList } from "../lib/parsers.ts";

export function registerListThemes(server: McpServer) {
  server.tool(
    "ghostty_list_themes",
    "List available Ghostty themes",
    {
      color: z
        .enum(["dark", "light", "all"])
        .optional()
        .describe("Filter by color scheme (dark/light/all). Default: all"),
      search: z
        .string()
        .optional()
        .describe("Filter themes by name (case-insensitive substring match)"),
    },
    async ({ color, search }) => {
      const args = ["+list-themes", "--plain"];
      if (color && color !== "all") {
        args.push(`--color=${color}`);
      }

      const { stdout, stderr, exitCode } = await exec(args);
      if (exitCode !== 0) {
        return {
          content: [{ type: "text", text: `Error: ${stderr}` }],
          isError: true,
        };
      }

      let themes = parseThemeList(stdout);
      if (search) {
        const q = search.toLowerCase();
        themes = themes.filter(t => t.name.toLowerCase().includes(q));
      }

      return {
        content: [
          {
            type: "text",
            text: themes.length
              ? themes.map(t => `${t.name} (${t.source})`).join("\n")
              : "No themes found matching the criteria.",
          },
        ],
      };
    }
  );
}
```

底層的 CLI 執行器用 `node:child_process`，這是為了同時相容 bun 和 Node.js。MCP 使用 stdio transport，所以有一個鐵律：**絕對不能寫入 `process.stdout`**，debug 訊息全部走 `console.error`。

```typescript
import { execFile } from "node:child_process";

export function exec(args: string[], timeoutMs = 10_000): Promise<ExecResult> {
  return new Promise(resolve => {
    execFile(
      "ghostty",
      args,
      {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        resolve({
          stdout: stdout ?? "",
          stderr: stderr ?? "",
          exitCode:
            error && "code" in error
              ? ((error.code as number) ?? 1)
              : error
                ? 1
                : 0,
        });
      }
    );
  });
}
```

### Plugin 的包裝

Plugin 用一個 `plugin.json` 宣告它包含什麼：

```json
{
  "name": "ghostty-config",
  "version": "1.0.0",
  "description": "Manage Ghostty terminal config with AI-powered tools and domain knowledge",
  "mcpServers": {
    "ghostty-config": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp/dist/index.js"]
    }
  }
}
```

`${CLAUDE_PLUGIN_ROOT}` 是 Claude Code 提供的變數，會在執行時解析成 plugin 的安裝路徑。MCP Server 的 TypeScript 原始碼需要先用 bun 打包成單一 JavaScript 檔：

```bash
bun build src/index.ts --target=node --outfile=dist/index.js
```

打包後的 `dist/index.js` 直接用 Node.js 執行，不需要額外安裝依賴。

## Skill 設計：讓 AI 知道怎麼幫你設定

MCP Server 給了 AI 11 個工具，但工具本身不會告訴 AI「什麼時候該用哪個」或「有哪些常見陷阱要注意」。這就是 Skill 的角色——它是一份領域知識文件，告訴 AI 在這個領域裡應該怎麼思考和行動。

Skill 的核心是一個 `SKILL.md` 檔案。我的設計哲學借鑑了一個概念：**The Iron Law**——用一句話定義 AI 絕對不能違反的規則：

```markdown
## The Iron Law

ALWAYS CHECK DOCS VIA MCP TOOL BEFORE GIVING CONFIG ADVICE.
NEVER ASSUME A VALUE'S TYPE, UNIT, OR BEHAVIOR FROM ITS NAME.
```

這句話的意思是：不管 AI 覺得自己多了解 Ghostty，每次給設定建議之前都必須先透過 MCP tool 查文件確認。因為 Ghostty 的設定有太多反直覺的地方，光靠 AI 的既有知識很容易給錯建議。

Skill 裡還定義了具體的工作流程。例如改任何設定的標準步驟：

```markdown
## Core Workflow: Changing Any Config Option

1. `ghostty_get_config_option` → 讀取該選項的完整文件
2. 確認值的型態和單位 — 例如 `scrollback-limit` 是 bytes，不是 lines
3. 編輯 config 檔
4. `ghostty_validate_config` → 驗證語法
5. 大多數設定會 hot-reload；theme 的 `light:X,dark:Y` 語法在 macOS 上可能需要完全重啟
```

### 用 GitHub Issues 建立領域知識

Skill 最有價值的部分是 `references/` 目錄下的參考文件。這些知識不是我憑空想的——我去翻了 Ghostty 的 [GitHub Issues](https://github.com/ghostty-org/ghostty/issues)，找了 150 多個與設定相關的 issue，整理出最常見的十大痛點：

1. `background-opacity` 的 alpha blending bug
2. Theme 在 config reload 後外觀壞掉
3. Linux 非整數倍縮放導致字型模糊
4. Keybind 語法混亂（空值會清除所有快捷鍵）
5. 設定檔路徑混淆（macOS 有兩個路徑，有優先順序）
6. 透明 titlebar 遇到深色背景會靜默失敗
7. macOS CJK 字型 fallback 導致字元過大
8. `scrollback-limit` 記憶體失控
9. `selection-word-chars` 的 escape sequence 不被解析
10. glass blur 效果與 opacity 的交互問題

這些痛點被整理成 `config-gotchas.md`，每個都附上說明和 workaround，放進 Skill 的 references。AI 在給建議時會參考這些文件，主動提醒使用者潛在的問題。

## 踩坑紀錄：scrollback-limit 的教訓

整個開發過程中最深刻的體驗，是我自己踩到 `scrollback-limit` 的坑。

Ghostty 的 `scrollback-limit` 選項看名字會以為是「最多保留幾行 scrollback」——就像大多數終端機一樣。但它的單位其實是 **bytes**。預設值 `10000000` 代表的是 10 MB，不是一萬行。

如果你像我一樣設了 `scrollback-limit = 10000`，以為是一萬行的 scrollback，實際上你只拿到了 ~10 KB——大概幾百行而已。

更嚴重的是記憶體問題。Ghostty 的 scrollback 使用 arena allocator，**已分配的記憶體不會歸還給 OS**。在高吞吐量的 session 裡——像是跑 Claude Code 這種會大量輸出文字的工具——記憶體使用量會遠超你設定的 limit。GitHub Issues 上有人回報從 1 GB 漲到 21 GB，花了兩天半。

```
scrollback-limit = 10000000    # 10 MB，不是一萬行
scrollback-limit = 10000       # ~10 KB，只有幾百行
scrollback-limit = 100000000   # 100 MB，高吞吐場景可能不夠
```

這個親身體驗直接促使我把 plugin 做出來。如果有一個工具能在使用者設定 `scrollback-limit` 時主動提醒「這個單位是 bytes 不是 lines」，就能避免很多人踩同樣的坑。

這也是為什麼 Skill 的 Iron Law 是「NEVER ASSUME A VALUE'S TYPE, UNIT, OR BEHAVIOR FROM ITS NAME」——因為我自己就假設錯了。

## 成果：安裝與使用

### 安裝

先切到 Ghostty 的設定目錄，再啟動 Claude Code：

```bash
# macOS
cd ~/Library/Application\ Support/com.mitchellh.ghostty/

# Linux
cd ${XDG_CONFIG_HOME:-~/.config}/ghostty/

# 啟動 Claude Code
claude
```

在 Claude Code 裡安裝 marketplace 和 plugin：

```
/plugin marketplace add shyuan/shyuan-marketplace
/plugin install ghostty-config@shyuan-marketplace
```

安裝後重啟 Claude Code session 即可使用。

### 使用範例

裝好之後，直接用自然語言跟 Claude Code 互動就好：

- **「幫我換成深色半透明主題」** — AI 會列出 dark 主題、設定 `background-opacity`，並提醒 alpha blending 的已知問題
- **「我的 scrollback 設成 10000 夠嗎？」** — AI 會告訴你那只有 ~10 KB，並建議合理的值
- **「幫我設定 Vim 風格的 split 切換快捷鍵」** — AI 會查 `ghostty_list_actions` 找到相關 action，產生正確的 keybind 語法
- **「為什麼我的中文字型特別大？」** — AI 會解釋 macOS CJK fallback 的問題，建議明確指定 CJK 字型

每次 AI 給設定建議之前，都會先透過 MCP tool 查閱 Ghostty 的文件，確認選項的型態和行為——不會憑記憶亂猜。

## 小結

整個專案的核心想法很簡單：**Ghostty CLI 已經提供了所有需要的資訊，只是缺一個好的介面來使用它們。** MCP Server 把 CLI 命令變成 AI 可呼叫的工具，Skill 提供領域知識讓 AI 知道怎麼正確使用這些工具。最後用 Claude Code 的 plugin 系統打包起來，讓安裝只需要兩行指令。

做這個 plugin 的過程也是在學習 Claude Code 的 marketplace / plugin 開發流程。從 MCP Server 的 tool 設計、stdio transport 的限制、bun 打包相容性、到 Skill 的知識結構設計，每一步都有值得記錄的經驗。如果你也在考慮做 Claude Code plugin，Ghostty config 這種「包裝本機 CLI 工具」的模式可以作為參考——找一個你熟悉的命令列工具，把它的子命令包裝成 MCP tool，再寫一份 Skill 告訴 AI 該領域的 know-how，就是一個完整的 plugin。

## 參考資料

### 專案連結

- [ghostty-config-plugin](https://github.com/shyuan/ghostty-config-plugin) — Claude Code Plugin 本體（Skill + 內嵌 MCP Server）
- [ghostty-config-mcp](https://github.com/shyuan/ghostty-config-mcp) — MCP Server 獨立 repo（可單獨使用）
- [shyuan-marketplace](https://github.com/shyuan/shyuan-marketplace) — Marketplace 索引

### Ghostty

- [Ghostty](https://ghostty.org/) — 用 Zig 寫的現代終端機模擬器
- [Ghostty GitHub](https://github.com/ghostty-org/ghostty) — 原始碼與 Issues
- [Ghostty Config Editor](https://ghostty.zerebos.com/) — 社群開發的 web 版設定編輯器

### Claude Code 與 MCP

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — Anthropic 官方 CLI
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) — AI 工具整合的開放協定
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — MCP Server 的 TypeScript SDK

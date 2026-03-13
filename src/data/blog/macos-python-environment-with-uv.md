---
pubDatetime: 2026-03-12T00:00:00Z
title: "macOS Python 環境整理筆記"
slug: macos-python-environment-with-uv
draft: false
tags:
  - macos
  - python
  - uv
  - homebrew
description: "在 macOS Tahoe 上用 uv 取代 pyenv、pipx、poetry，統一管理 Python 版本與 CLI 工具的筆記。"
---

## Table of contents

## 背景

macOS 系統自帶 Python 3.9.6，但該版本已於 2025 年 10 月 31 日正式 EOL，不再收到任何安全更新。目前 Python 最新的 feature release 是 3.14.3（2026 年 2 月發布），3.15 正在開發中。

原本系統上透過 Homebrew 安裝了 Python 3.11 ~ 3.14 多個版本，以及大量 Python CLI 工具，需要整理乾淨。

## 為什麼選 uv

現在大家大致都改用 **uv** 了。uv 是做 Ruff linter 那家 Astral 的產品，用 Rust 寫的，速度很快。一個工具就能處理 Python 版本、虛擬環境、套件安裝、CLI 工具，pyenv、pipx、poetry 那些都不用了。

uv 下載預編譯 binary，裝 Python 只要幾秒，不像 pyenv 還得從原始碼編譯。

### 安裝 uv

```bash
# 透過 Homebrew
brew install uv
```

### Shell Completion（zsh）

```bash
# 方式一：動態載入（每次開 shell 都跑一次，略慢）
echo 'eval "$(uv generate-shell-completion zsh)"' >> ~/.zshrc

# 方式二：靜態輸出（較快，但 uv 升級後需重新產生）
uv generate-shell-completion zsh > ~/.zfunc/_uv
# 確保 ~/.zfunc 在 fpath 裡，放在 compinit 之前：
# fpath=(~/.zfunc $fpath)
# autoload -Uz compinit && compinit
```

## Python 版本管理

```bash
uv python install 3.14           # 安裝最新穩定版
uv python install 3.12 3.13 3.14 # 同時裝多個版本
uv python list                    # 查看所有可用/已安裝版本
uv python uninstall 3.10          # 移除不需要的版本
```

### 專案層級管理

```bash
cd ~/my-project
uv python pin 3.14    # 釘選版本，建立 .python-version
uv venv                # 建立 venv
uv add requests pandas  # 安裝依賴，自動寫入 pyproject.toml
uv run python main.py   # 不需要手動 activate
uv run pytest
```

## CLI 工具管理

### 用 `uv tool` 取代 Homebrew 安裝的純 Python CLI 工具

```bash
uv tool install bpytop
uv tool install certbot
uv tool install glances
uv tool install hf               # huggingface
uv tool install httpie
uv tool install litecli
uv tool install llm              # Simon Willison 的 LLM CLI
uv tool install mercurial
uv tool install mycli
uv tool install pygments
uv tool install pylint
uv tool install restructuredtext-lint  # brew 裡叫 rst-lint
uv tool install yamllint
uv tool install yt-dlp
```

### 更新工具

```bash
uv tool upgrade --all    # 更新全部
uv tool upgrade yt-dlp   # 更新特定工具
```

### pdm / poetry → 不再需要

uv 能做的事情已經完全涵蓋這兩個了，我直接 `brew uninstall` 移掉。真的碰到舊專案需要 poetry 的話，`uvx poetry install` 臨時跑一下就好，不用特別裝。

不過要注意，如果你有在用 poetry 的 plugin 生態（像 `poetry-dynamic-versioning`）或 pdm 的 PEP 582 模式，這些 uv 目前還沒覆蓋到，移除前先評估一下。

## 留在 Homebrew 的套件

### 有系統層依賴，uv 管不了

- **llvm** — 編譯器工具鏈
- **vim** — build 時連結 Python
- **nmap** — C 程式，Python 只是 scripting engine
- **ykman** — YubiKey 硬體通訊，有系統層依賴

### 雲端 CLI 工具

- **awscli** — 有 C extension 依賴（`awscrt`），brew 的 bottle 已經編譯好，比 uv 裝起來省事
- **azure-cli** — 依賴很重，建議留 brew
- **gcloud-cli** — Google 自己的安裝方式特殊，留 brew 最省事

## 整理 Homebrew Python 依賴的方法

```bash
# 查看哪些套件依賴特定 Python 版本
brew uses --installed python@3.13
brew uses --installed python@3.14

# 區分「主動安裝」vs「被依賴拉進來」
brew leaves | grep python

# 移除後清理不再需要的依賴
brew autoremove
```

## 讓 `python3` 指向 uv 管理的版本

確認 `~/.local/bin` 在 PATH 中排在 `/opt/homebrew/bin` 前面（已確認），然後建立 symlink：

```bash
ln -sf ~/.local/share/uv/python/cpython-3.14-macos-aarch64-none/bin/python3.14 ~/.local/bin/python3
```

注意這個路徑包含版本號，之後升級到 3.15 時 symlink 不會自動跟著更新，要記得手動重建。

## 最終狀態

| 來源     | 版本  | 用途                                          |
| -------- | ----- | --------------------------------------------- |
| 系統     | 3.9.6 | macOS 內部用，不動                            |
| Homebrew | 3.13  | awscli / azure-cli / gcloud-cli 的 dependency |
| Homebrew | 3.14  | llvm / nmap / vim / ykman 的 dependency       |
| uv       | 3.14  | 日常開發主力，`python3` 指向這裡              |

Homebrew 和 uv 各自有一份 3.14 是正常的，互不干擾。

## 日常維護

```bash
brew upgrade uv                        # 更新 uv（因為是用 brew 安裝的）
uv python install 3.xx                 # 新版 Python 出來時安裝
uv tool upgrade --all                  # 更新所有 CLI 工具
ln -sf ~/.local/share/uv/python/cpython-3.xx-macos-aarch64-none/bin/python3.xx ~/.local/bin/python3  # 升級後重建 symlink
```

## 踩過的坑

### `~/.cache/uv` 權限問題

之前用 `sudo uv` 導致 cache 目錄下部分檔案 owner 變成 root，執行 `uv cache clean` 會 Permission denied。

解法：

```bash
# 最乾脆的方式：直接整個刪掉，uv 會自動重建
sudo rm -rf ~/.cache/uv

# 或者修正權限後再清
sudo chown -R $(whoami):staff ~/.cache/uv
uv cache clean
```

**以後不要用 `sudo uv`**，uv 設計上所有東西都在 user space，不需要 root。

### `uv cache clean` 要在正確目錄執行

如果 `cd ~/.cache/uv` 後執行，uv 會把 current working directory 當成 cache 路徑，輸出會顯示 `Clearing cache at: .`，等於它在試圖清掉你當前目錄下的東西。切回 `~` 或任何其他目錄再執行就正常了。

### uv cache 空間管理

```bash
du -sh ~/.cache/uv/*/  | sort -rh | head -10  # 查看哪個子目錄最肥
uv cache prune --dry-run                        # 預覽可回收空間
uv cache prune                                  # 只清不再被引用的 cache
uv cache clean                                  # 清除全部 cache
```

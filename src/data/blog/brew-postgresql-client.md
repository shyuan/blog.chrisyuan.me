---
title: "用 brew 安裝 PostgreSQL client"
pubDatetime: 2021-10-26T18:49:59.000Z
slug: "brew-postgresql-client"
description: "只需用 homebrew 安裝 libpq formula brew installl libpq 安裝完成訊息，把 libpq 的 bin 目錄加進 PATH 環境變數後 reload shell 即可使用 ==> libpq libpq is keg-only, which means it was not symlinked into /opt/homebrew, because confl"
---

## Table of contents

## 安裝步驟

只需用 homebrew 安裝 [libpq](https://formulae.brew.sh/formula/libpq) formula

```
brew installl libpq
```

安裝完成訊息，把 libpq 的 bin 目錄加進 PATH 環境變數後 reload shell 即可使用

```
==> libpq
libpq is keg-only, which means it was not symlinked into /opt/homebrew,
because conflicts with postgres formula.

If you need to have libpq first in your PATH, run:
  echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc

For compilers to find libpq you may need to set:
  export LDFLAGS="-L/opt/homebrew/opt/libpq/lib"
  export CPPFLAGS="-I/opt/homebrew/opt/libpq/include"

For pkg-config to find libpq you may need to set:
  export PKG_CONFIG_PATH="/opt/homebrew/opt/libpq/lib/pkgconfig"
```

看有哪些工具可以用

```
% ls -m /opt/homebrew/opt/libpq/bin
clusterdb, createdb, createuser, dropdb, dropuser, ecpg, initdb, pg_amcheck, pg_archivecleanup, pg_basebackup, pg_checksums, pg_config,
pg_controldata, pg_ctl, pg_dump, pg_dumpall, pg_isready, pg_receivewal, pg_recvlogical, pg_resetwal, pg_restore, pg_rewind, pg_test_fsync,
pg_test_timing, pg_upgrade, pg_verifybackup, pg_waldump, pgbench, psql, reindexdb, vacuumdb
```

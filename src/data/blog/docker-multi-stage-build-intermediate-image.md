---
title: "Docker Multi-Stage build 的 intermediate image 留存問題"
pubDatetime: 2020-10-07T03:01:13.000Z
slug: "docker-multi-stage-build-intermediate-image"
description: "Docker 在版本 17.05 後，新推出了 multi-stage build 的功能，主要目的是讓最終的 docker image 盡可能地保持乾淨，使用最少的儲存空間，只把最為必要的 artifact 放到最終要執行使用的 docker image 上，建置和打包時產生的不必要檔案則留存在中繼 image 上。 但用 multi-stage build 會讓 intermediate i"
---

Docker 在版本 17.05 後，新推出了 [multi-stage build](https://docs.docker.com/develop/develop-images/multistage-build/) 的功能，主要目的是讓最終的 docker image 盡可能地保持乾淨，使用最少的儲存空間，只把最為必要的 artifact 放到最終要執行使用的 docker image 上，建置和打包時產生的不必要檔案則留存在中繼 image 上。

但用 multi-stage build 會讓 intermediate image 留在系統中，不會在 build 完成後自動清除掉，以一個有兩個 stage 的 Dockerfile ，第一個 stage 做下載/編譯 dependency 套件及編譯主要套件，第二個 stage 只把第一個 stage 的 artifact copy 進來，完成後會留存一個 <none>:<none> 的 image，如下：

```
% docker images -a
REPOSITORY       TAG        IMAGE ID       CREATED        SIZE
<none>           <none>     37d196fa13cf   52 seconds ago 9.48MB
sslscan          2.0.2      86b1dc996113   52 seconds ago 9.48MB
```

詳細的問題和討論可以參考 GitHub 上的兩條 issue：

- [https://github.com/moby/moby/issues/34513](Proposal: multi-stage docker build with --rm flag should remove builder container #34513)
- [Multi stage build leaves "<none>" images behind #34151](https://github.com/moby/moby/issues/34151)

目前看起來是沒有要處理或是提供 flag 機制去控制是否要把這個 intermediate image 留存在系統中。

參考文章:

- [Builder pattern vs. Multi-stage builds in Docker](https://blog.alexellis.io/mutli-stage-docker-builds/)
- [用 Docker Multi-Stage 編譯出 Go 語言最小 Image](https://blog.wu-boy.com/2017/04/build-minimal-docker-container-using-multi-stage-for-go-app/)
- [透過 Multiple Stage Builds 編譯出最小的 Docker Image](https://jiepeng.me/2018/06/09/use-docker-multiple-stage-builds)
- [透過 Multi-Stage Builds 改善持續交付流程](https://tachingchen.com/tw/blog/docker-multi-stage-builds/)
- [Creating Laravel Image with Docker Multi-Stage Builds](https://blog.johnsonlu.org/creating-laravel-image-with-docker-multi-stage-builds/)

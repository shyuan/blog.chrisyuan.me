const unused_variable = "this will fail lint"
export const SITE = {
  website: "https://blog.chrisyuan.me/",
  author: "Chris Yuan",
  profile: "https://blog.chrisyuan.me/",
  desc: "Chris Yuan 的技術筆記與時事觀察 — 涵蓋 DevOps、Cloud、AI、CLI 工具實務，以及地緣政治、台灣議題分析",
  title: "Chris Yuan | Blog",
  ogImage: "",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 10,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: true,
    text: "Edit page",
    url: "https://github.com/shyuan/blog.chrisyuan.me/edit/main/",
  },
  dynamicOgImage: process.env.FAST_BUILD !== "true",
  dir: "ltr", // "rtl" | "auto"
  lang: "zh-TW", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Taipei", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;

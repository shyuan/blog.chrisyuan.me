export const SITE = {
  website: "https://blog.chrisyuan.me/",
  author: "Chris Yuan",
  profile: "https://blog.chrisyuan.me/",
  desc: "Chris Yuan 的技術筆記與時事觀察。技術面涵蓋 DevOps、Cloud、AI、CLI 工具與 macOS／Linux 實務；時事面聚焦地緣政治、兩岸關係與台灣公共議題的結構性分析。",
  title: "Chris Yuan | Blog",
  ogImage: "",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 10,
  scheduledPostMargin: 65 * 60 * 1000, // 65 minutes (slightly larger than the hourly cron interval in .github/workflows/deploy.yml)
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

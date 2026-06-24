import type { APIRoute } from "astro";

const getRobotsTxt = (sitemapURL: URL) => `
User-agent: *
Allow: /

# Pagefind 搜尋索引（.pf_fragment / .pf_index 分塊），無 SEO 價值、數量龐大
Disallow: /pagefind/

# 客戶端搜尋頁，內容由 JS 動態載入，無可索引內容
Disallow: /search
Disallow: /search/

Sitemap: ${sitemapURL.href}
`;

export const GET: APIRoute = ({ site }) => {
  const sitemapURL = new URL("sitemap-index.xml", site);
  return new Response(getRobotsTxt(sitemapURL));
};

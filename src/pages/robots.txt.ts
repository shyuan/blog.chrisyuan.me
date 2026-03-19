import type { APIRoute } from "astro";

const getRobotsTxt = (sitemapURL: URL, llmsTxtURL: URL) => `
User-agent: *
Allow: /

Sitemap: ${sitemapURL.href}
Llms-txt: ${llmsTxtURL.href}
`;

export const GET: APIRoute = ({ site }) => {
  const sitemapURL = new URL("sitemap-index.xml", site);
  const llmsTxtURL = new URL("llms.txt", site);
  return new Response(getRobotsTxt(sitemapURL, llmsTxtURL));
};

import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getPath } from "@/utils/getPath";
import getSortedPosts from "@/utils/getSortedPosts";
import { SITE } from "@/config";

export const GET: APIRoute = async ({ site }) => {
  const posts = await getCollection("blog");
  const sortedPosts = getSortedPosts(posts);
  const baseUrl =
    site?.href.replace(/\/$/, "") ?? SITE.website.replace(/\/$/, "");

  const lines: string[] = [
    `# ${SITE.title}`,
    "",
    `> ${SITE.desc}`,
    "",
    `- Author: ${SITE.author}`,
    `- Language: zh-TW`,
    `- Site: ${baseUrl}`,
    `- RSS: ${baseUrl}/rss.xml`,
    "",
    "## Docs",
    "",
    `- [All Blog Posts (full content)](${baseUrl}/llms-full.txt): All blog posts with full Markdown content`,
    "",
    "## Blog Posts",
    "",
  ];

  for (const post of sortedPosts) {
    const path = getPath(post.id, post.filePath);
    const url = `${baseUrl}${path}`;
    const tags = post.data.tags.join(", ");
    lines.push(
      `- [${post.data.title}](${url}): ${post.data.description} [${tags}]`
    );
  }

  lines.push("");

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};

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

  const sections: string[] = [`# ${SITE.title}`, "", `> ${SITE.desc}`, ""];

  for (const post of sortedPosts) {
    const path = getPath(post.id, post.filePath);
    const url = `${baseUrl}${path}`;
    const date = (post.data.modDatetime ?? post.data.pubDatetime)
      .toISOString()
      .slice(0, 10);
    const tags = post.data.tags.join(", ");

    sections.push(
      "---",
      "",
      `## ${post.data.title}`,
      "",
      `- URL: ${url}`,
      `- Date: ${date}`,
      `- Tags: ${tags}`,
      `- Description: ${post.data.description}`,
      "",
      post.body ?? "",
      ""
    );
  }

  return new Response(sections.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};

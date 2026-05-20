import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { getPath } from "@/utils/getPath";
import { generateOgImageForPost } from "@/utils/generateOgImages";
import { preloadFonts } from "@/utils/loadGoogleFont";
import postFilter from "@/utils/postFilter";
import { SITE } from "@/config";

export async function getStaticPaths() {
  if (!SITE.dynamicOgImage) {
    return [];
  }

  const posts = await getCollection("blog").then(p =>
    p.filter(post => postFilter(post) && !post.data.ogImage)
  );

  // Collect all characters needed across all OG images and preload fonts once
  const allChars = posts
    .map(
      p =>
        p.data.title +
        p.data.author +
        SITE.title +
        new URL(SITE.website).hostname
    )
    .join("");
  const fixedChars = "$ cat ~/blog/post █chris-yuan@blog:~by>";
  await preloadFonts(allChars + fixedChars);

  return posts.map(post => ({
    params: { slug: getPath(post.id, post.filePath, false) },
    props: post,
  }));
}

export const GET: APIRoute = async ({ props }) => {
  if (!SITE.dynamicOgImage) {
    return new Response(null, {
      status: 404,
      statusText: "Not found",
    });
  }

  const buffer = await generateOgImageForPost(props as CollectionEntry<"blog">);
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png" },
  });
};

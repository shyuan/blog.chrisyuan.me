import type { APIRoute } from "astro";
import { generateOgImageForSite } from "@/utils/generateOgImages";
import { preloadFonts } from "@/utils/loadGoogleFont";
import { SITE } from "@/config";

export const GET: APIRoute = async () => {
  const allText =
    SITE.title +
    SITE.desc +
    new URL(SITE.website).hostname +
    "$ cat ~/blog> █chris-yuan@blog:~";
  await preloadFonts(allText);

  const buffer = await generateOgImageForSite();
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png" },
  });
};

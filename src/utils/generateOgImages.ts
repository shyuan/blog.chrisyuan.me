import { Resvg } from "@resvg/resvg-js";
import { type CollectionEntry } from "astro:content";
import postOgImage from "./og-templates/post";
import siteOgImage from "./og-templates/site";
import { getFontFilePaths } from "./loadGoogleFont";

function svgToPng(svg: string) {
  const fontFiles = getFontFilePaths();
  const resvg = new Resvg(svg, {
    font: {
      loadSystemFonts: false,
      ...(fontFiles ? { fontFiles } : { loadSystemFonts: true }),
      defaultFontFamily: "Fira Code",
    },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

export async function generateOgImageForPost(post: CollectionEntry<"blog">) {
  const svg = await postOgImage(post);
  return svgToPng(svg);
}

export async function generateOgImageForSite() {
  const svg = await siteOgImage();
  return svgToPng(svg);
}

import type { CollectionEntry } from "astro:content";
import { SITE } from "@/config";

const postFilter = ({ data }: CollectionEntry<"blog">) => {
  const isPublishTimePassed =
    Date.now() >
    new Date(data.pubDatetime).getTime() - SITE.scheduledPostMargin;
  // Boolean(): import.meta.env values are not guaranteed to be real booleans
  // (bun 1.4+ / Vite coerce assigned values to strings), and `||` would leak
  // that value straight into the return type.
  return !data.draft && (Boolean(import.meta.env.DEV) || isPublishTimePassed);
};

export default postFilter;

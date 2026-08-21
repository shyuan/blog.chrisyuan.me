import type { CollectionEntry } from "astro:content";
import { SITE } from "@/config";

const postFilter = ({ data }: CollectionEntry<"blog">) => {
  const isPublishTimePassed =
    Date.now() >
    new Date(data.pubDatetime).getTime() - SITE.scheduledPostMargin;
  // Boolean(): import.meta.env values are not guaranteed to be real booleans.
  // Under bun, import.meta.env IS process.env, and bun 1.4 coerces every
  // assignment to a string (Node semantics), so `||` would leak "true" straight
  // into the return type.
  return !data.draft && (Boolean(import.meta.env.DEV) || isPublishTimePassed);
};

export default postFilter;

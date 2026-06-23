import { defineConfig, envField, fontProviders } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import partytown from "@astrojs/partytown";
import embeds from "astro-embed/integration";
import remarkMermaid from "./src/utils/remark-mermaid";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import { SITE } from "./src/config";

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  integrations: [
    sitemap({
      filter: page => {
        // 排除文章列表分頁：/posts/2/, /posts/3/, ...
        if (/\/posts\/\d+\/$/.test(page)) return false;

        // 排除 tag 分頁：/tags/xxx/2/, /tags/xxx/3/, ...
        if (/\/tags\/[^/]+\/\d+\/$/.test(page)) return false;

        // 排除低 SEO 價值的功能頁面
        const siteUrl = SITE.website.replace(/\/$/, "");
        const excludeExact = [
          `${siteUrl}/search/`,
          `${siteUrl}/tags/`,
          ...(!SITE.showArchives ? [`${siteUrl}/archives/`] : []),
        ];
        if (excludeExact.includes(page)) return false;

        return true;
      },
    }),
    embeds({ services: { LinkPreview: false } }),
    mdx(),
    partytown({
      config: {
        forward: ["dataLayer.push"],
      },
    }),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [
        remarkMermaid,
        remarkMath,
        remarkToc,
        [remarkCollapse, { test: "Table of contents" }],
      ],
      rehypePlugins: [rehypeKatex],
    }),
    shikiConfig: {
      // For more themes, visit https://shiki.style/themes
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  image: {
    responsiveStyles: true,
    layout: "constrained",
  },
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GA_MEASUREMENT_ID: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  fonts: [
    {
      name: "Fira Code",
      cssVariable: "--font-fira-code",
      provider: fontProviders.google(),
      fallbacks: [
        "JetBrains Mono",
        "SF Mono",
        "Cascadia Code",
        "ui-monospace",
        "monospace",
      ],
      weights: [400, 500, 600, 700],
    },
  ],
});

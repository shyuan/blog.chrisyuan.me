import { renderMermaidSVG } from "beautiful-mermaid";
import type { RenderOptions } from "beautiful-mermaid";
import { visit } from "unist-util-visit";
import type { Root, Code, Html } from "mdast";

export interface RemarkMermaidOptions {
  /** Font family for diagram text. Default: "Fira Code" */
  font?: string;
  /** Render with transparent background. Default: true */
  transparent?: boolean;
  /** Strip Google Fonts @import from SVG output. Default: true */
  stripGoogleFonts?: boolean;
  /** CSS class for the wrapper div. Default: "mermaid-diagram" */
  className?: string;
}

const GOOGLE_FONTS_IMPORT_RE =
  /@import\s+url\([^)]*fonts\.googleapis\.com[^)]*\)\s*;?/g;

export default function remarkMermaid(options: RemarkMermaidOptions = {}) {
  const {
    font = "Fira Code",
    transparent = true,
    stripGoogleFonts = true,
    className = "mermaid-diagram",
  } = options;

  return (tree: Root) => {
    const replacements: {
      index: number;
      parent: Root["children"];
      node: Html;
    }[] = [];

    visit(tree, "code", (node: Code, index, parent) => {
      if (node.lang !== "mermaid" || index == null || !parent) return;

      const renderOptions: RenderOptions = {
        font,
        transparent,
        bg: "var(--background)",
        fg: "var(--foreground)",
        accent: "var(--accent)",
        border: "var(--border)",
        muted: "var(--border)",
        surface: "var(--muted)",
      };

      let html: string;
      try {
        let svg = renderMermaidSVG(node.value, renderOptions);

        if (stripGoogleFonts) {
          svg = svg.replace(GOOGLE_FONTS_IMPORT_RE, "");
        }

        html = `<div class="${className}">${svg}</div>`;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown render error";
        html =
          `<div class="${className} ${className}--error">` +
          `<div class="${className}__notice">Mermaid render error: ${message}</div>` +
          `<pre><code>${escapeHtml(node.value)}</code></pre>` +
          `</div>`;
      }

      replacements.push({
        index,
        parent: parent.children as Root["children"],
        node: { type: "html", value: html },
      });
    });

    // Reverse to preserve indices when splicing
    for (const { index, parent, node } of replacements.reverse()) {
      parent.splice(index, 1, node);
    }
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const fontsConfig = [
  {
    name: "Fira Code",
    font: "Fira+Code",
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: "Fira Code",
    font: "Fira+Code",
    weight: 700 as const,
    style: "normal" as const,
  },
  {
    name: "Noto Sans TC",
    font: "Noto+Sans+TC",
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: "Noto Sans TC",
    font: "Noto+Sans+TC",
    weight: 700 as const,
    style: "normal" as const,
  },
];

async function fetchGoogleFont(
  font: string,
  text: string,
  weight: number
): Promise<ArrayBuffer> {
  const API = `https://fonts.googleapis.com/css2?family=${font}:wght@${weight}&text=${encodeURIComponent(text)}`;

  const css = await (
    await fetch(API, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
      },
    })
  ).text();

  const resource = css.match(
    /src: url\((.+?)\) format\('(opentype|truetype)'\)/
  );

  if (!resource) throw new Error("Failed to download dynamic font");

  const res = await fetch(resource[1]);

  if (!res.ok) {
    throw new Error("Failed to download dynamic font. Status: " + res.status);
  }

  return res.arrayBuffer();
}

const loadedChars = new Set<string>();
const fontCacheData = new Map<string, ArrayBuffer>();
let fontDir: string | null = null;
let fontFilePaths: string[] | null = null;

function saveFontsToDisk() {
  if (!fontDir) {
    fontDir = join(tmpdir(), `og-fonts-${process.pid}`);
    mkdirSync(fontDir, { recursive: true });
  }
  fontFilePaths = [];
  for (const { font, weight } of fontsConfig) {
    const key = `${font}:${weight}`;
    const data = fontCacheData.get(key);
    if (data) {
      const path = join(fontDir, `${font}-${weight}.ttf`);
      writeFileSync(path, new Uint8Array(data));
      fontFilePaths.push(path);
    }
  }
}

/**
 * Pre-load all fonts with the given character set and save to temp files.
 * Accumulates characters across calls — re-fetches only when new chars appear.
 */
export async function preloadFonts(allText: string): Promise<void> {
  const newChars = new Set<string>();
  for (const ch of allText) {
    if (!loadedChars.has(ch)) newChars.add(ch);
  }

  if (newChars.size === 0 && fontFilePaths) return;

  // Merge character sets
  for (const ch of newChars) loadedChars.add(ch);
  const fullText = [...loadedChars].join("");

  await Promise.all(
    fontsConfig.map(async ({ font, weight }) => {
      const key = `${font}:${weight}`;
      const data = await fetchGoogleFont(font, fullText, weight);
      fontCacheData.set(key, data);
    })
  );

  saveFontsToDisk();
}

/**
 * Get font file paths for resvg. Returns null if fonts haven't been preloaded.
 */
export function getFontFilePaths(): string[] | null {
  return fontFilePaths;
}

async function loadGoogleFonts(text: string) {
  const fonts = await Promise.all(
    fontsConfig.map(async ({ name, font, weight, style }) => {
      const key = `${font}:${weight}`;
      let data = fontCacheData.get(key);
      if (!data) {
        data = await fetchGoogleFont(font, text, weight);
        fontCacheData.set(key, data);
      }
      return { name, data, weight, style };
    })
  );

  return fonts;
}

export default loadGoogleFonts;

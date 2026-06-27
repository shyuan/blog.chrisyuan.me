import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { setSystemTime } from "bun:test";
import { SITE } from "@/config";
import postFilter from "./postFilter";

// Tests written following the `complete-test-code` skill at Essential tier.
// postFilter decides whether a post is publicly visible. Its logic lives almost
// entirely on the UNHAPPY / time-dependent path (drafts, not-yet-published,
// bad dates), which is exactly where the skill says to concentrate effort.
//
// Technique on show: fault-injection of TIME via a fake clock (bun's
// setSystemTime), so the schedule boundary is tested deterministically instead
// of depending on the real wall clock.

const MARGIN = SITE.scheduledPostMargin; // 65 min: a post becomes visible this long BEFORE its pubDatetime
const NOW = new Date("2026-06-27T00:00:00.000Z").getTime();

type Entry = Parameters<typeof postFilter>[0];
const makeEntry = (opts: {
  offsetMs?: number; // pubDatetime relative to the frozen "now"
  draft?: boolean;
  pubDatetime?: Date | string;
}): Entry => {
  const pub = opts.pubDatetime ?? new Date(NOW + (opts.offsetMs ?? 0));
  return {
    data: { draft: opts.draft ?? false, pubDatetime: pub },
  } as unknown as Entry;
};

beforeEach(() => setSystemTime(new Date(NOW)));
afterEach(() => setSystemTime()); // reset to the real clock

describe("postFilter — core unhappy-path behavior (production config, DEV off)", () => {
  it("hides a draft even if it was published long ago", () => {
    expect(postFilter(makeEntry({ draft: true, offsetMs: -10 * MARGIN }))).toBe(
      false
    );
  });
  it("shows a normal already-published post", () => {
    expect(postFilter(makeEntry({ offsetMs: -1000 }))).toBe(true);
  });
  it("hides a post scheduled far in the future", () => {
    expect(postFilter(makeEntry({ offsetMs: 10 * MARGIN }))).toBe(false);
  });
});

describe("postFilter — the scheduling-margin boundary (n-1 / n / n+1)", () => {
  // Visibility condition is `now > pubDatetime - margin` (STRICT >). Pin all
  // three positions around the threshold so the exact operator is locked in —
  // a >, >=, or sign mistake here changes a published post into a hidden one.
  it("just BEFORE the threshold → hidden", () => {
    // pub = now + margin + 1  ⇒  now < pub - margin  ⇒  hidden
    expect(postFilter(makeEntry({ offsetMs: MARGIN + 1 }))).toBe(false);
  });
  it("EXACTLY at the threshold → hidden (strict greater-than)", () => {
    // pub = now + margin  ⇒  now == pub - margin  ⇒  NOT > ⇒ hidden
    expect(postFilter(makeEntry({ offsetMs: MARGIN }))).toBe(false);
  });
  it("just PAST the threshold → visible", () => {
    // pub = now + margin - 1  ⇒  now > pub - margin  ⇒  visible
    expect(postFilter(makeEntry({ offsetMs: MARGIN - 1 }))).toBe(true);
  });
});

describe("postFilter — the margin is actually applied (not just now > pub)", () => {
  // A post 1 minute in the future is visible ONLY because of the scheduling
  // margin. If the `- margin` term were dropped, this would flip to hidden, so
  // this test guards that the margin is wired in (robust to its exact value).
  it("a post 1 minute in the future is visible thanks to the margin", () => {
    expect(postFilter(makeEntry({ offsetMs: 60 * 1000 }))).toBe(true);
  });
});

describe("postFilter — malformed / garbage input is handled cleanly", () => {
  it("an invalid pubDatetime hides the post instead of throwing", () => {
    const entry = makeEntry({ pubDatetime: "not-a-real-date" });
    expect(() => postFilter(entry)).not.toThrow();
    expect(postFilter(entry)).toBe(false); // NaN comparison ⇒ not published
  });
});

describe("postFilter — the DEV override branch", () => {
  // In dev the schedule is bypassed so authors can preview future posts. Verify
  // the override flips a far-future (normally hidden) post to visible. Production
  // behavior (DEV off) is covered above — which matters most per the skill's
  // "test the as-deployed configuration" principle.
  it("DEV=true makes a far-future, normally-hidden post visible", () => {
    const env = (import.meta as unknown as { env: Record<string, unknown> })
      .env;
    const original = env.DEV;
    try {
      env.DEV = true;
      expect(env.DEV).toBe(true); // guard: the override is actually in effect
      expect(postFilter(makeEntry({ offsetMs: 10 * MARGIN }))).toBe(true);
    } finally {
      env.DEV = original;
    }
  });
});

import { describe, it, expect } from "bun:test";
import { slugifyStr, slugifyAll } from "./slugify";

// Tests written following the `complete-test-code` skill at Essential tier:
// document the happy-path contract, force BOTH branches of the one decision,
// feed malformed/garbage input, and add property/oracle checks that hold for
// every input (so we test the contract, not the implementation details).

describe("slugifyStr — documented contract (happy path)", () => {
  // These two are the contract stated in the function's own doc comment.
  it("lowercases and hyphenates a Latin title", () => {
    expect(slugifyStr("E2E Testing")).toBe("e2e-testing");
  });
  it("keeps version-like numbers intact", () => {
    expect(slugifyStr("TypeScript 5.0")).toBe("typescript-5.0");
  });
});

describe("slugifyStr — both sides of the Latin / non-Latin decision", () => {
  // The function branches on hasNonLatin(). The skill requires exercising BOTH
  // outcomes of every decision, not just the common one.
  it("Latin branch: pure-ASCII input is slugified", () => {
    expect(slugifyStr("Hello World")).toBe("hello-world");
  });
  it("non-Latin branch: CJK characters are PRESERVED (not stripped)", () => {
    // The whole reason for the branch: slugify() would drop CJK; kebabcase keeps it.
    const out = slugifyStr("測試 文章");
    expect(out).toContain("測試");
    expect(out).toContain("文章");
    expect(out).not.toMatch(/\s/); // joined, not space-separated
  });
  it("mixed Latin + CJK keeps the CJK run", () => {
    expect(slugifyStr("Docker 容器")).toContain("容器");
  });
});

describe("slugifyStr — malformed / garbage / boundary input", () => {
  // The skill's highest-leverage shift: feed bad input, assert clean handling
  // (a string back, never a throw), instead of only testing tidy titles.
  const cases: Array<[string, string]> = [
    ["empty string", ""],
    ["only whitespace", "   "],
    ["only punctuation", "!!!???"],
    ["leading/trailing spaces", "  Hello  "],
    ["collapsing repeated spaces", "a     b"],
    ["already a slug (idempotence seed)", "already-a-slug"],
    ["emoji and symbols", "release 🎉 v2 — done"],
    ["very long input", "word ".repeat(500).trim()],
  ];
  for (const [name, input] of cases) {
    it(`returns a string and never throws: ${name}`, () => {
      expect(() => slugifyStr(input)).not.toThrow();
      expect(typeof slugifyStr(input)).toBe("string");
    });
  }
});

describe("slugifyStr — invariants that must hold for EVERY input (generated oracle)", () => {
  // Instead of hand-writing an expected output for each, assert properties true
  // of all valid output. This is the accessible, dependency-free form of the
  // skill's "oracle you didn't hand-write".
  const samples = [
    "Hello World",
    "TypeScript 5.0",
    "  spaced  out  ",
    "MiXeD CaSe ACRONYM",
    "release 🎉 v2",
    "a/b\\c:d",
    "kubernetes & docker",
  ];
  for (const s of samples) {
    it(`no leading/trailing hyphen, no spaces, no ASCII uppercase: ${JSON.stringify(s)}`, () => {
      const out = slugifyStr(s);
      expect(out).not.toMatch(/\s/); // never contains whitespace
      expect(out).not.toMatch(/[A-Z]/); // ASCII letters are lowercased
      expect(out).not.toMatch(/^-|-$/); // no dangling hyphens
    });
  }

  it("idempotence: slugifying a Latin slug again returns the same value", () => {
    // Metamorphic / round-trip style oracle: f(f(x)) === f(x) for Latin input.
    for (const s of ["Hello World", "TypeScript 5.0", "E2E Testing"]) {
      const once = slugifyStr(s);
      expect(slugifyStr(once)).toBe(once);
    }
  });
});

describe("slugifyAll — delegation and boundaries", () => {
  it("maps slugifyStr over each element, in order", () => {
    expect(slugifyAll(["Hello World", "TypeScript 5.0"])).toEqual([
      "hello-world",
      "typescript-5.0",
    ]);
  });
  it("empty array boundary returns empty array", () => {
    expect(slugifyAll([])).toEqual([]);
  });
});

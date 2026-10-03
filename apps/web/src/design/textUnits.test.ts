import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TEXT_SIZE_PERCENT } from "@/preferences/preferences";

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

describe("text size", () => {
  it("is 90% by default (Pequeña), 100% (Normal) and 125% (Grande) on the root, which every rem size follows", () => {
    const css = readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8");
    expect(TEXT_SIZE_PERCENT).toEqual({ small: 90, normal: 100, large: 125 });
    // No attribute yet (the server's first paint) is the same as small.
    expect(css).toMatch(
      /html:not\(\[data-text-size\]\),\s*html\[data-text-size="small"\]\s*{[^}]*font-size:\s*90%/,
    );
    // Normal needs no rule: the browser's own size.
    expect(css).not.toMatch(/data-text-size="normal"/);
    expect(css).toMatch(/html\[data-text-size="large"\]\s*{[^}]*font-size:\s*125%/);
  });

  // "Grande" raises the root font size, so only sizes in rem (or Tailwind's text-* scale) follow it.
  it("never sets a font size in px in the UI", () => {
    const root = fileURLToPath(new URL("../components", import.meta.url));
    for (const file of sources(root)) {
      const code = readFileSync(file, "utf8");
      expect(code, file).not.toMatch(/text-\[\d+(\.\d+)?px\]/);
      expect(code, file).not.toMatch(/fontSize:\s*[`"']?\d+(\.\d+)?(px)?[`"']?/);
    }
  });
});

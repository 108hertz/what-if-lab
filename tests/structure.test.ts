import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { SANDBOX_KEYS } from "@/worlds/registry";

/** Change 0008: worlds are separate projects; shared layers never reach into a world. */
const ROOT = join(__dirname, "..");

function files(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((f) => {
    const p = join(dir, f);
    return statSync(join(ROOT, p)).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}
const imports = (file: string) => [...readFileSync(join(ROOT, file), "utf8").matchAll(/from\s+"([^"]+)"|import\(\s*"([^"]+)"\s*\)/g)].map((m) => m[1] ?? m[2]);

describe("world boundaries", () => {
  it.each(["lib", "components/ui", "components/console"])("%s never imports a world", (dir) => {
    for (const f of files(dir)) for (const i of imports(f)) expect(i, `${f} → ${i}`).not.toMatch(/(^@\/worlds|\/worlds\/)/);
  });

  it.each(SANDBOX_KEYS)("%s imports no other world", (key) => {
    for (const f of files(`worlds/${key}`)) {
      for (const i of imports(f)) {
        const other = SANDBOX_KEYS.find((k) => k !== key && (i.startsWith(`@/worlds/${k}`) || i.startsWith(`../${k}`)));
        expect(other, `${f} → ${i}`).toBeUndefined();
      }
    }
  });

  it.each(SANDBOX_KEYS)("%s simulation stays framework-free", (key) => {
    for (const f of ["sim.ts", "data.ts", "meta.ts"].map((n) => `worlds/${key}/${n}`).filter((p) => existsSync(join(ROOT, p)))) {
      for (const i of imports(f)) expect(i, `${f} → ${i}`).not.toMatch(/^(react|next|@\/components)/);
    }
  });
});

describe("world projects", () => {
  const views = readFileSync(join(ROOT, "worlds/views.tsx"), "utf8");

  it.each(SANDBOX_KEYS)("%s has its own folder, console and brief", (key) => {
    for (const f of ["sim.ts", "meta.ts", "Console.tsx", "README.md"]) expect(existsSync(join(ROOT, "worlds", key, f)), `${key}/${f}`).toBe(true);
    expect(views).toContain(`import("./${key}/Console")`);
  });

  it.each(SANDBOX_KEYS)("%s console reserves its ad slots (ADR 0007)", (key) => {
    const src = readFileSync(join(ROOT, "worlds", key, "Console.tsx"), "utf8");
    const standard = /<StandardConsole\b/.test(src);
    const own = /size="box"/.test(src) && /size="banner"/.test(src);
    expect(standard || own, `${relative(ROOT, join("worlds", key, "Console.tsx"))} must use StandardConsole or place box + banner AdSlots`).toBe(true);
  });
});

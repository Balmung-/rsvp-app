// Production build wrapper. Three jobs:
//  1. FORCE NODE_ENV=production before any child process runs. If the host
//     (Railway, etc.) has NODE_ENV set to anything else, `next build` pulls in
//     dev-only internals that reference next/document's <Html> and prerender
//     of /404 then fails. Overriding here makes the build resilient to the
//     deploy env.
//  2. Clear the Next.js + webpack on-disk caches (BuildKit cache mounts on
//     Railway can otherwise pin stale chunks across deploys).
//  3. Run `prisma generate` and `next build` serially.

process.env.NODE_ENV = "production";

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

function clearContents(dir) {
  if (!existsSync(dir)) {
    try { mkdirSync(dir, { recursive: true }); } catch {}
    return;
  }
  let cleared = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    try {
      rmSync(full, { recursive: true, force: true });
      cleared++;
    } catch (err) {
      console.warn(`skip ${full}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`cleared ${cleared} entries from ${dir}`);
}

clearContents(".next/cache");
clearContents("node_modules/.cache");

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: process.env });
}

run("npx --no-install prisma generate");
run("npx --no-install next build");

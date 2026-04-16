// Clear Next.js + webpack on-disk caches before building.
// Railway mounts /app/.next/cache and /app/node_modules/.cache as persistent
// BuildKit cache volumes. The mount POINT itself cannot be rmdir'd (EBUSY)
// while mounted — delete only the contents so Next.js sees an empty cache.
import { rmSync, readdirSync, existsSync, mkdirSync } from "node:fs";
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

for (const p of [".next/cache", "node_modules/.cache"]) {
  clearContents(p);
}

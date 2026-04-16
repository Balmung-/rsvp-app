// Clear Next.js + webpack on-disk caches before building.
// Railway mounts /app/.next/cache and /app/node_modules/.cache as persistent
// BuildKit cache volumes; stale entries there survive source changes and can
// pin old compiled chunks across deploys. Wipe them at the start of every
// build so each deploy produces fresh output.
import { rmSync } from "node:fs";

const paths = [".next/cache", "node_modules/.cache"];
for (const p of paths) {
  try {
    rmSync(p, { recursive: true, force: true });
    console.log(`cleared ${p}`);
  } catch (err) {
    console.warn(`skip ${p}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

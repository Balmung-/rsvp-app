// Production start wrapper. Forces NODE_ENV=production so a stray
// deploy-env override cannot put Next.js into dev mode at runtime, then
// applies pending Prisma migrations and boots Next.
process.env.NODE_ENV = "production";

import { execSync } from "node:child_process";

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: process.env });
}

run("npx --no-install prisma migrate deploy");
run("node scripts/bootstrap.mjs");
run("npx --no-install next start");

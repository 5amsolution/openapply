#!/usr/bin/env node
// Deploys OpenApply to Railway using the Railway CLI and .env.production.
//
//   npx @railway/cli login                 # once, opens a browser
//   node scripts/deploy-railway.mjs        # creates project + service, sets variables, deploys
//   DOMAIN=openapply.example.com node scripts/deploy-railway.mjs   # also attaches your domain
//
// Re-running is safe: it reuses the linked project/service and redeploys.

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const SERVICE = process.env.RAILWAY_SERVICE || "openapply";
const railway = (args, opts = {}) =>
  execSync(`npx -y @railway/cli ${args}`, { stdio: opts.capture ? "pipe" : "inherit", encoding: "utf8" });

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

if (!existsSync(".env.production")) fail("Missing .env.production — run scripts/setup-supabase.mjs first.");

try {
  railway("whoami", { capture: true });
} catch {
  fail("Not logged in to Railway. Run: npx @railway/cli login");
}

let linked = true;
try {
  railway("status", { capture: true });
} catch {
  linked = false;
}
if (!linked) {
  console.log("→ Creating Railway project…");
  railway(`init --name ${SERVICE}`);
}

try {
  railway(`service ${SERVICE}`, { capture: true });
} catch {
  console.log(`→ Creating service "${SERVICE}"…`);
  railway(`add --service ${SERVICE}`);
  railway(`service ${SERVICE}`, { capture: true });
}

const vars = readFileSync(".env.production", "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#") && l.includes("="));
console.log(`→ Setting ${vars.length} variables…`);
railway(`variables --service ${SERVICE} --skip-deploys ${vars.map((v) => `--set ${JSON.stringify(v)}`).join(" ")}`);

console.log("→ Deploying (builds the Dockerfile on Railway)…");
railway(`up --service ${SERVICE} --detach`);

if (process.env.DOMAIN) {
  console.log(`→ Attaching ${process.env.DOMAIN}… add the DNS record Railway prints below at your registrar.`);
  railway(`domain ${process.env.DOMAIN} --service ${SERVICE}`);
} else {
  console.log("→ Generating a railway.app domain…");
  try {
    railway(`domain --service ${SERVICE}`);
  } catch {
    /* already has one */
  }
}

console.log("\n✓ Deploy started. Follow the build with: npx @railway/cli logs --build");
console.log("  Remember: NEXT_PUBLIC_SITE_URL must equal the domain users visit, then redeploy.\n");

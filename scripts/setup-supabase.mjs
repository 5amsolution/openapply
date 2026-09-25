#!/usr/bin/env node
// Creates (or reuses) a Supabase project for OpenApply, applies the database
// migrations, configures auth redirect URLs, and writes .env.production.
//
//   SUPABASE_ACCESS_TOKEN=sbp_... SITE_URL=https://openapply.example.com node scripts/setup-supabase.mjs
//
// Optional: SUPABASE_PROJECT_REF (reuse an existing project), SUPABASE_ORG (org slug),
//           SUPABASE_REGION (default us-east-1), SUPABASE_DB_PASSWORD, PROJECT_NAME.

import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const API = "https://api.supabase.com/v1";
const token = process.env.SUPABASE_ACCESS_TOKEN;
const siteUrl = (process.env.SITE_URL || "").replace(/\/$/, "");
if (!token) fail("Set SUPABASE_ACCESS_TOKEN (create one at https://supabase.com/dashboard/account/tokens).");
if (!siteUrl) fail("Set SITE_URL to the public URL of the app, e.g. https://openapply.example.com");

const STATE_FILE = ".supabase-setup.json";
const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : {};

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) },
  });
  const text = await res.text();
  const body = text ? safeJSON(text) : null;
  if (!res.ok) throw new Error(`${init.method || "GET"} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  return body;
}

function safeJSON(t) {
  try {
    return JSON.parse(t);
  } catch {
    return t;
  }
}

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let ref = process.env.SUPABASE_PROJECT_REF || state.ref;
  let dbPass = process.env.SUPABASE_DB_PASSWORD || state.dbPass;

  if (!ref) {
    const orgs = await api("/organizations");
    if (!orgs.length) fail("Your Supabase account has no organization. Create one in the dashboard first.");
    const org = process.env.SUPABASE_ORG ? orgs.find((o) => o.slug === process.env.SUPABASE_ORG || o.id === process.env.SUPABASE_ORG) : orgs[0];
    if (!org) fail(`Organization ${process.env.SUPABASE_ORG} not found.`);
    dbPass = dbPass || randomBytes(18).toString("base64url");
    const region = process.env.SUPABASE_REGION || "us-east-1";
    const name = process.env.PROJECT_NAME || "openapply";
    console.log(`→ Creating Supabase project "${name}" in ${org.name} (${region})…`);
    const base = { name, db_pass: dbPass, organization_slug: org.slug || org.id };
    let project;
    try {
      project = await api("/projects", { method: "POST", body: JSON.stringify({ ...base, region_selection: { type: "specific", code: region } }) });
    } catch (err) {
      if (!/region/i.test(String(err))) throw err;
      project = await api("/projects", { method: "POST", body: JSON.stringify({ ...base, organization_id: org.id, region }) });
    }
    ref = project.ref || project.id;
    writeFileSync(STATE_FILE, JSON.stringify({ ref, dbPass }, null, 2));
    console.log(`  created ${ref} (details saved to ${STATE_FILE}, keep it private)`);
  } else {
    console.log(`→ Using existing project ${ref}`);
    if (!dbPass) fail("Set SUPABASE_DB_PASSWORD for the existing project (needed to push migrations).");
    writeFileSync(STATE_FILE, JSON.stringify({ ref, dbPass }, null, 2));
  }

  process.stdout.write("→ Waiting for the project to become healthy");
  for (let i = 0; i < 90; i++) {
    const p = await api(`/projects/${ref}`);
    if (p.status === "ACTIVE_HEALTHY") break;
    if (i === 89) fail(`Project status is still ${p.status}. Re-run this script in a few minutes.`);
    process.stdout.write(".");
    await sleep(10_000);
  }
  console.log(" ready");

  console.log("→ Applying database migrations…");
  const env = { ...process.env, SUPABASE_ACCESS_TOKEN: token };
  try {
    execSync(`npx supabase link --project-ref ${ref} --password "${dbPass}"`, { stdio: "inherit", env });
    execSync(`npx supabase db push --password "${dbPass}" --include-all --yes`, { stdio: "inherit", env });
  } catch {
    // Some access tokens can't use the CLI link endpoint; apply through the Management API instead.
    console.log("  CLI push unavailable, applying migrations through the Management API…");
    await applyViaApi(ref);
  }

  console.log("→ Configuring auth URLs…");
  await api(`/projects/${ref}/config/auth`, {
    method: "PATCH",
    body: JSON.stringify({
      site_url: siteUrl,
      uri_allow_list: [`${siteUrl}/**`, "http://localhost:3000/**"].join(","),
      mailer_autoconfirm: false,
      external_email_enabled: true,
    }),
  });

  // Scoped tokens may not be allowed to read keys; then the user pastes them from the dashboard.
  const keys = await api(`/projects/${ref}/api-keys?reveal=true`).catch(() => []);
  const anon = keys.find((k) => k.name === "anon")?.api_key || "PASTE_PUBLISHABLE_KEY";
  const service = keys.find((k) => k.name === "service_role")?.api_key || "PASTE_SECRET_KEY";
  if (anon.startsWith("PASTE")) {
    console.log(`  Couldn't read API keys with this token. Copy them from https://supabase.com/dashboard/project/${ref}/settings/api-keys into .env.production`);
  }

  const existing = existsSync(".env.production") ? readFileSync(".env.production", "utf8") : "";
  const keep = (name, fallback) => existing.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1] || fallback;
  const lines = [
    `NEXT_PUBLIC_SUPABASE_URL=https://${ref}.supabase.co`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}`,
    `SUPABASE_SERVICE_ROLE_KEY=${service}`,
    `NEXT_PUBLIC_SITE_URL=${siteUrl}`,
    `ENCRYPTION_KEY=${keep("ENCRYPTION_KEY", randomBytes(32).toString("base64url"))}`,
    `CRON_SECRET=${keep("CRON_SECRET", randomBytes(24).toString("base64url"))}`,
  ];
  writeFileSync(".env.production", lines.join("\n") + "\n");

  console.log(`\n✓ Supabase is ready: https://supabase.com/dashboard/project/${ref}`);
  console.log("✓ Wrote .env.production. These are the variables for Railway.");
  console.log("  ENCRYPTION_KEY protects every user's AI key: back it up and never change it.\n");
}

/** Runs pending supabase/migrations/*.sql files and records them the same way the CLI does. */
async function applyViaApi(ref) {
  const { readdirSync } = await import("node:fs");
  const query = (sql) => api(`/projects/${ref}/database/query`, { method: "POST", body: JSON.stringify({ query: sql }) });
  await query(
    "create schema if not exists supabase_migrations; " +
      "create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);",
  );
  const applied = new Set((await query("select version from supabase_migrations.schema_migrations")).map((r) => r.version));
  const files = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
    if (applied.has(version)) continue;
    const sql = readFileSync(`supabase/migrations/${file}`, "utf8");
    const name = rest.join("_").replace(/'/g, "''");
    await query(`${sql}\n;insert into supabase_migrations.schema_migrations (version, name) values ('${version}', '${name}');`);
    console.log(`  applied ${file}`);
  }
}

main().catch((err) => fail(err.message));

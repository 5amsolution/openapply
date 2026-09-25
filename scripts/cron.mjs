#!/usr/bin/env node
// Runs the daily autopilot. Point a Railway cron service at this script
// (schedule e.g. "0 * * * *"); each rule runs at most once every ~20 hours.
//
//   APP_URL=https://openapply.example.com CRON_SECRET=... node scripts/cron.mjs

const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const secret = process.env.CRON_SECRET;
if (!appUrl || !secret) {
  console.error("APP_URL (or NEXT_PUBLIC_SITE_URL) and CRON_SECRET are required");
  process.exit(1);
}

let rounds = 0;
let total = 0;
while (rounds < 40) {
  rounds++;
  const res = await fetch(`${appUrl}/api/cron/autopilot?batch=5`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
  if (!res.ok) {
    console.error(`autopilot endpoint responded ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const body = await res.json();
  total += body.processed;
  console.log(`round ${rounds}: ran ${body.processed} rules, wrote ${body.drafts} applications, ${body.errors} errors`);
  if (body.processed === 0) break;
}
console.log(`done — ${total} rules processed`);

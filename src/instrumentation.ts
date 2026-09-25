// Built-in hourly scheduler for autopilot, so a single Railway web service is
// enough. Disable with AUTOPILOT_SCHEDULER=off (e.g. when you run
// scripts/cron.mjs from an external scheduler, or run several replicas).

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const enabled =
    process.env.AUTOPILOT_SCHEDULER === "on" ||
    (process.env.NODE_ENV === "production" && process.env.AUTOPILOT_SCHEDULER !== "off");
  if (!enabled || !process.env.CRON_SECRET) return;

  const port = process.env.PORT || "3000";
  const url = `http://127.0.0.1:${port}/api/cron/autopilot?batch=5`;
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      for (let round = 0; round < 40; round++) {
        const res = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
        if (!res.ok) {
          console.error(`[autopilot] scheduler got ${res.status}`);
          break;
        }
        const body = (await res.json()) as { processed: number; drafts: number };
        if (body.processed > 0) console.log(`[autopilot] ran ${body.processed} rules, wrote ${body.drafts} applications`);
        if (body.processed === 0) break;
      }
    } catch (err) {
      console.error("[autopilot] scheduler error", err);
    } finally {
      running = false;
    }
  };

  setTimeout(tick, 2 * 60_000).unref();
  setInterval(tick, 60 * 60_000).unref();
}

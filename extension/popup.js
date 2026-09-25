// 5AM Apply popup: pick the application for this page and fill the form.

const $ = (id) => document.getElementById(id);
const EMBED_ORIGINS = ["https://job-boards.greenhouse.io/*", "https://boards.greenhouse.io/*", "https://jobs.lever.co/*"];
let config = { server: "", token: "" };
let profilePayload = null;
let applications = [];

async function api(path, init = {}) {
  const res = await fetch(`${config.server.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json", ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

function status(text) {
  $("status").textContent = text;
}

function selectedApplication() {
  return applications.find((a) => a.id === $("application").value) || null;
}

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

const siteUrl = () => (config.server || globalThis.DEFAULT_SERVER || "").replace(/\/$/, "");

async function load() {
  const stored = await chrome.storage.local.get(["server", "token"]);
  config = { server: stored.server || "", token: stored.token || "" };
  $("server").value = config.server || globalThis.DEFAULT_SERVER || "";
  $("token").value = config.token;

  if (!config.server || !config.token) {
    $("connect").hidden = false;
    $("main").hidden = true;
    return;
  }
  $("connect").hidden = true;
  $("main").hidden = false;

  try {
    const tab = await currentTab();
    const [profile, apps] = await Promise.all([
      api("/api/extension/profile"),
      api(`/api/extension/application?url=${encodeURIComponent(tab?.url || "")}`),
    ]);
    profilePayload = profile;
    applications = [...(apps.match ? [apps.match] : []), ...apps.ready.filter((a) => a.id !== apps.match?.id)];

    const select = $("application");
    select.innerHTML = "";
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "Profile only (no tailored answers)";
    select.appendChild(none);
    for (const a of applications) {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = `${a.title} at ${a.company}`;
      select.appendChild(opt);
    }
    if (apps.match) select.value = apps.match.id;

    status(
      apps.match
        ? `Matched: ${apps.match.title} at ${apps.match.company}`
        : applications.length
          ? "No saved job matches this page. Pick one, or fill with your profile only."
          : "No ready applications. Filling will use your profile only.",
    );
    $("picker").hidden = false;
    $("actions").hidden = false;
    updateButtons();
  } catch (err) {
    status(err.message);
    $("settings").hidden = false;
  }
}

function updateButtons() {
  const app = selectedApplication();
  $("copy-letter").disabled = !app?.cover_letter;
  $("mark-applied").disabled = !app;
}

$("application").addEventListener("change", updateButtons);

$("toggle-settings").addEventListener("click", () => {
  $("settings").hidden = !$("settings").hidden;
});

$("open-site").addEventListener("click", () => {
  chrome.tabs.create({ url: `${siteUrl()}/settings#extension` });
  window.close();
});

$("save-settings").addEventListener("click", async () => {
  let server = $("server").value.trim().replace(/\/$/, "");
  if (server && !/^https?:\/\//.test(server)) server = `https://${server}`;
  const token = $("token").value.trim();
  await chrome.storage.local.set({ server, token });
  $("settings").hidden = true;
  status("Loading…");
  load();
});

$("fill").addEventListener("click", async () => {
  const tab = await currentTab();
  if (!tab?.id) return;
  $("fill").disabled = true;
  $("result").textContent = "Filling…";
  try {
    // On 5AM Apply's own apply page the employer form is an embedded frame from another
    // site, which needs a one-time permission for that site (asked from this click).
    if (config.server && tab.url?.startsWith(config.server)) {
      const granted = await chrome.permissions.request({ origins: EMBED_ORIGINS });
      if (!granted) throw new Error("permission to fill the embedded form was declined");
    }
    const data = { ...profilePayload, application: selectedApplication() };
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["fill.js"],
    });
    void results;
    const fills = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: (payload) => window.__openapplyFill(payload),
      args: [data],
    });
    const total = fills.reduce(
      (acc, f) => ({
        filled: acc.filled + (f.result?.filled || 0),
        skipped: acc.skipped + (f.result?.skipped || 0),
        resume: acc.resume || !!f.result?.resume,
      }),
      { filled: 0, skipped: 0, resume: false },
    );
    $("result").textContent =
      `Filled ${total.filled} field${total.filled === 1 ? "" : "s"}` +
      (total.resume ? " and attached your resume" : "") +
      (total.skipped ? `. ${total.skipped} left for you (highlighted in orange).` : ".") +
      " Review everything, then submit.";
  } catch (err) {
    $("result").textContent = `Couldn't fill this page: ${err.message}`;
  } finally {
    $("fill").disabled = false;
  }
});

$("copy-letter").addEventListener("click", async () => {
  const app = selectedApplication();
  if (!app?.cover_letter) return;
  await navigator.clipboard.writeText(app.cover_letter);
  $("result").textContent = "Cover letter copied.";
});

$("mark-applied").addEventListener("click", async () => {
  const app = selectedApplication();
  if (!app) return;
  try {
    await api("/api/extension/application", { method: "POST", body: JSON.stringify({ id: app.id }) });
    $("result").textContent = "Marked as applied. Good luck!";
  } catch (err) {
    $("result").textContent = err.message;
  }
});

load();

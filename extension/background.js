// Lets the 5AM Apply website connect the extension in one click, and opens the
// connect page right after install. Only the sites listed under
// "externally_connectable" in manifest.json can send these messages.
importScripts("defaults.js");

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "install" || !globalThis.DEFAULT_SERVER) return;
  chrome.tabs.create({ url: `${globalThis.DEFAULT_SERVER}/settings?extension=installed#extension` });
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  let origin = "";
  try {
    origin = new URL(sender.url || sender.origin || "").origin;
  } catch {
    sendResponse({ ok: false, error: "unknown sender" });
    return;
  }

  if (message?.type === "ping") {
    chrome.storage.local.get(["server", "token"]).then(({ server, token }) => {
      sendResponse({ ok: true, version: chrome.runtime.getManifest().version, connected: !!token && server === origin });
    });
    return true;
  }

  if (message?.type === "connect") {
    if (typeof message.token !== "string" || !message.token.startsWith("oa_")) {
      sendResponse({ ok: false, error: "invalid token" });
      return;
    }
    // The server is always the site that sent the token, never a URL from the message.
    chrome.storage.local.set({ server: origin, token: message.token }).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === "disconnect") {
    chrome.storage.local.get(["server"]).then(({ server }) => {
      if (server !== origin) return sendResponse({ ok: false, error: "not connected to this site" });
      chrome.storage.local.remove(["server", "token"]).then(() => sendResponse({ ok: true }));
    });
    return true;
  }

  sendResponse({ ok: false, error: "unknown message" });
});

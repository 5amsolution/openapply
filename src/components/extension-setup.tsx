"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, Copy, Download, KeyRound, Plug, Puzzle, RefreshCw } from "lucide-react";
import { connectExtensionAction, createExtensionTokenAction, revokeExtensionTokenAction } from "@/app/(app)/actions";
import { Badge, Button, Card, IconTile, Input, Label, Notice, buttonClass, cn, type Tone } from "@/components/ui";
import { friendlyError } from "@/components/progress";
import { toast } from "@/components/toast";
import { celebrate } from "@/lib/celebrate";
import { EXTENSION_DOWNLOAD, EXTENSION_ID, EXTENSION_VERSION } from "@/lib/extension-meta";
import { timeAgo } from "@/lib/format";

type Status = "checking" | "unsupported" | "missing" | "installed" | "connected";
type Ping = { ok: boolean; version?: string; connected?: boolean; error?: string };
type Runtime = { sendMessage: (id: string, msg: unknown, cb: (res: unknown) => void) => void; lastError?: unknown };

// Pages can only message an extension that lists them under "externally_connectable";
// when it isn't installed, chrome.runtime.sendMessage simply doesn't exist here.
function runtime(): Runtime | null {
  const rt = (window as unknown as { chrome?: { runtime?: Partial<Runtime> } }).chrome?.runtime;
  return rt?.sendMessage ? (rt as Runtime) : null;
}

function send<T>(message: unknown, timeoutMs = 2500): Promise<T | null> {
  return new Promise((resolve) => {
    const rt = runtime();
    if (!rt) return resolve(null);
    const timer = setTimeout(() => resolve(null), timeoutMs);
    try {
      rt.sendMessage(EXTENSION_ID, message, (reply) => {
        clearTimeout(timer);
        void rt.lastError; // reading it marks a "not installed" error as handled
        resolve((reply as T) ?? null);
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

function detectBrowser() {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|Mobile/i.test(ua)) return "mobile";
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if ((navigator as unknown as { brave?: unknown }).brave) return "Brave";
  if (/Chrome\//.test(ua)) return "Chrome";
  return "other";
}
const noop = () => () => {};

const older = (a: string, b: string) => {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0);
  return false;
};

const BADGE: Record<Status, [Tone, string]> = {
  checking: ["neutral", "Checking"],
  unsupported: ["neutral", "Computer only"],
  missing: ["neutral", "Not installed"],
  installed: ["primary", "Installed"],
  connected: ["success", "Connected"],
};

export function ExtensionSetup({
  tokens,
  siteUrl,
  justInstalled,
}: {
  tokens: { id: string; label: string; created_at: string; last_used_at: string | null }[];
  siteUrl: string;
  justInstalled: boolean;
}) {
  const router = useRouter();
  const browser = useSyncExternalStore(noop, detectBrowser, () => "");
  const [status, setStatus] = useState<Status>("checking");
  const [installedVersion, setInstalledVersion] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const check = () =>
      void send<Ping>({ type: "ping" }).then((reply) => {
        if (!alive) return;
        const b = detectBrowser();
        if (b === "mobile" || b === "other") return setStatus(reply?.ok ? (reply.connected ? "connected" : "installed") : "unsupported");
        setInstalledVersion(reply?.version ?? "");
        setStatus(!reply?.ok ? "missing" : reply.connected ? "connected" : "installed");
      });
    check();
    window.addEventListener("focus", check);
    const poll = setInterval(check, 4000);
    return () => {
      alive = false;
      window.removeEventListener("focus", check);
      clearInterval(poll);
    };
  }, []);

  const run = (key: string, fn: () => Promise<void>) =>
    void (async () => {
      setBusy(key);
      setError("");
      try {
        await fn();
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        setBusy("");
      }
    })();

  const connect = () =>
    run("connect", async () => {
      const res = await connectExtensionAction(browser && browser !== "other" ? browser : "Browser");
      if (!res.ok) throw new Error(res.error);
      const reply = await send<Ping>({ type: "connect", token: res.data });
      if (!reply?.ok) throw new Error(reply?.error ? `The extension said: ${reply.error}` : "The extension didn't answer. Check it's installed and switched on, then try again.");
      setStatus("connected");
      celebrate();
      toast("Extension connected. Open any job application and click the 5AM Apply icon.", { tone: "celebrate" });
      router.refresh();
    });

  const disconnect = () =>
    run("disconnect", async () => {
      await send<Ping>({ type: "disconnect" });
      setStatus("installed");
      toast("Extension disconnected");
    });

  const extensionsPage = browser === "Edge" ? "edge://extensions" : browser === "Brave" ? "brave://extensions" : "chrome://extensions";
  const [tone, label] = BADGE[status];
  const outdated = status !== "missing" && !!installedVersion && older(installedVersion, EXTENSION_VERSION);

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <IconTile tone="primary">
          <Puzzle size={18} />
        </IconTile>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold tracking-tight text-fg">Autofill browser extension</h3>
            <Badge tone={tone}>
              {status === "connected" && <CheckCircle2 size={12} aria-hidden="true" />}
              {label}
            </Badge>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Fills application forms on Greenhouse, Lever, Workday and most other sites with your profile and the answers written
            for that job. You always review and submit.
          </p>
        </div>
      </div>

      <div className="grid gap-4" aria-live="polite">
        {justInstalled && status === "installed" && (
          <Notice tone="success" title="Extension installed">
            One more click: connect it to your account below.
          </Notice>
        )}
        {outdated && (
          <Notice tone="warn" title={`Update available (you have ${installedVersion}, latest is ${EXTENSION_VERSION})`}>
            Download it again, unzip over the old folder, then click the refresh icon on the extension card in {extensionsPage}.
          </Notice>
        )}

        {status === "connected" ? (
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-success-soft p-4 text-success-soft-fg">
            <CheckCircle2 size={22} aria-hidden="true" className="shrink-0" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-bold">Connected to your account</p>
              <p>Open any job application form and click the 5AM Apply icon in your toolbar. Pin it from the puzzle-piece menu so it&apos;s always there.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={disconnect} loading={busy === "disconnect"}>
              Disconnect
            </Button>
          </div>
        ) : status === "unsupported" ? (
          <Notice tone="info">The extension works in Chrome, Edge, Brave and other Chromium browsers on a computer. Open 5AM Apply there to set it up.</Notice>
        ) : (
          <ol className="grid gap-3 lg:grid-cols-3">
            <SetupStep n={1} title="Download" done={status === "installed"}>
              <a href={EXTENSION_DOWNLOAD} download className={buttonClass("primary", "sm", "w-full")}>
                <Download size={15} aria-hidden="true" /> Download extension
              </a>
              <p className="mt-2 text-[13px] text-muted">Version {EXTENSION_VERSION}, a small .zip file.</p>
            </SetupStep>
            <SetupStep n={2} title="Install" done={status === "installed"}>
              <p className="text-[13px] leading-relaxed text-muted">
                Unzip it. Open{" "}
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-fg hover:bg-primary-soft hover:text-primary-soft-fg"
                  onClick={() => navigator.clipboard.writeText(extensionsPage).then(() => toast("Copied. Paste it into your address bar."))}
                  title="Copy"
                >
                  {extensionsPage} <Copy size={11} aria-hidden="true" />
                </button>
                , switch on <b className="text-fg">Developer mode</b>, click <b className="text-fg">Load unpacked</b> and pick the unzipped folder.
              </p>
            </SetupStep>
            <SetupStep n={3} title="Connect">
              <Button className="w-full" size="sm" onClick={connect} disabled={status !== "installed"} loading={busy === "connect"}>
                {busy !== "connect" && <Plug size={15} aria-hidden="true" />} Connect extension
              </Button>
              <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
                {status === "installed" ? (
                  "Found it. Connect in one click."
                ) : (
                  <>
                    <RefreshCw size={12} aria-hidden="true" className={status === "checking" ? "animate-spin" : ""} /> Waiting for the extension
                  </>
                )}
              </p>
            </SetupStep>
          </ol>
        )}

        {error && <Notice tone="danger">{error}</Notice>}

        <ManualTokens tokens={tokens} siteUrl={siteUrl} />
      </div>
    </Card>
  );
}

function SetupStep({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-border bg-surface-2 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-fg">
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs",
            done ? "bg-success-soft text-success-soft-fg" : "bg-primary-soft text-primary-soft-fg",
          )}
          aria-hidden="true"
        >
          {done ? <CheckCircle2 size={14} /> : n}
        </span>
        {title}
        {done && <span className="sr-only">(done)</span>}
      </p>
      {children}
    </li>
  );
}

function ManualTokens({
  tokens,
  siteUrl,
}: {
  tokens: { id: string; label: string; created_at: string; last_used_at: string | null }[];
  siteUrl: string;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [newToken, setNewToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const origin = siteUrl || (typeof window !== "undefined" ? window.location.origin : "");

  const run = (key: string, fn: () => Promise<void>) =>
    void (async () => {
      setBusy(key);
      setError("");
      try {
        await fn();
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        setBusy("");
      }
    })();

  return (
    <details className="group rounded-xl border border-border">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-xl px-4 text-sm font-semibold text-fg hover:bg-surface-2">
        <KeyRound size={16} aria-hidden="true" className="text-muted" />
        Manual setup and connected browsers ({tokens.length})
        <ChevronDown size={16} aria-hidden="true" className="ml-auto text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid gap-4 border-t border-border p-4">
        {newToken && (
          <div className="grid gap-2">
            <Notice tone="success" title="Copy this token now. It won't be shown again.">
              In the extension, open Settings and paste it with the server address <code className="font-mono">{origin}</code>.
            </Notice>
            <Input readOnly value={newToken} onFocus={(e) => e.currentTarget.select()} className="bg-surface-2 font-mono text-sm" aria-label="New extension token" />
          </div>
        )}

        {tokens.length > 0 && (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {tokens.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-fg">{t.label}</p>
                  <p className="text-[13px] text-muted">
                    Added {timeAgo(t.created_at)} · {t.last_used_at ? `last used ${timeAgo(t.last_used_at)}` : "never used"}
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  loading={busy === t.id}
                  onClick={() =>
                    run(t.id, async () => {
                      const res = await revokeExtensionTokenAction(t.id);
                      if (!res.ok) throw new Error(res.error);
                      toast("Access removed");
                      router.refresh();
                    })
                  }
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            run("create", async () => {
              const res = await createExtensionTokenAction(label);
              if (!res.ok) throw new Error(res.error);
              setNewToken(res.data);
              setLabel("");
              router.refresh();
            });
          }}
        >
          <div className="min-w-0 sm:w-72">
            <Label htmlFor="token-label" hint="optional">
              Name this browser
            </Label>
            <Input id="token-label" placeholder="e.g. Work laptop" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <Button type="submit" variant="secondary" loading={busy === "create"} className="self-start sm:self-auto">
            Create token
          </Button>
        </form>
        {error && <Notice tone="danger">{error}</Notice>}
      </div>
    </details>
  );
}

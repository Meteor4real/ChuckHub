// MoreMe — external calendar feeds. Canvas connects via its real REST API
// (a personal access token — see CanvasApiCard) so it can carry submission
// status and real course/teacher names, not just due dates. Veracross and
// Google Calendar publish a private .ics subscription URL per student
// instead. Paste it in once; MoreMe fetches + parses it (electron/main.ts
// does the actual request — no CORS, no scraping, no login flow) and
// idempotently mirrors it onto the calendar.

import { useState } from "react";
import { T } from "./styles";
import type { State } from "./types";
import { clearCanvasApi, clearIcsFeed, setCanvasApiToken, setIcsUrl, syncCanvasApi, syncIcsFeed, type IcsSource } from "./store";

function timeAgo(ts: number): string {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function FeedCard({ s, source, label, blurb }: { s: State; source: IcsSource; label: string; blurb: string }) {
  const feed = s.integrations[source];
  const [draft, setDraft] = useState(feed.url ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setIcsUrl(source, draft);
    if (!draft.trim()) return;
    setBusy(true);
    try { await syncIcsFeed(source); } finally { setBusy(false); }
  }
  async function syncNow() {
    setBusy(true);
    try { await syncIcsFeed(source); } finally { setBusy(false); }
  }
  function clear() {
    if (!confirm(`Remove the ${label} link and everything it imported from your calendar?`)) return;
    clearIcsFeed(source);
    setDraft("");
  }

  return (
    <div className="mm-card" style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <b style={{ fontSize: 14, flex: 1 }}>{label}</b>
        {feed.url && <span className="mm-pill" style={{ background: T.mint, color: T.bg }}>Connected</span>}
      </div>
      <div style={{ fontSize: 11, color: T.inkSoft, lineHeight: 1.5, marginBottom: 8 }}>{blurb}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <input
          placeholder="Paste the .ics subscription link…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{ flex: 1, fontSize: 11 }}
        />
        <button className="mm-btn mm-btn-primary" onClick={save} disabled={busy || draft.trim() === (feed.url ?? "")}>Save</button>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <button className="mm-btn" onClick={syncNow} disabled={busy || !feed.url}>{busy ? "Syncing…" : "Sync now"}</button>
        {feed.url && <button className="mm-btn mm-btn-danger" onClick={clear}>Disconnect</button>}
        <span style={{ fontSize: 10, color: feed.lastError ? T.warn : T.inkTiny, flex: 1, minWidth: 120 }}>
          {feed.lastError
            ? `Last sync failed: ${feed.lastError}`
            : feed.lastSyncAt
              ? `Synced ${timeAgo(feed.lastSyncAt)} · ${feed.lastCount ?? 0} item${feed.lastCount === 1 ? "" : "s"}`
              : feed.url ? "Not synced yet." : "Not connected."}
        </span>
      </div>
    </div>
  );
}

function CanvasApiCard({ s }: { s: State }) {
  const api = s.integrations.canvasApi;
  const [domain, setDomain] = useState(api.domain ?? "");
  const [token, setToken] = useState("");
  const [phase, setPhase] = useState<"idle" | "saving" | "syncing" | "saved-ok" | "saved-fail">("idle");
  const connected = !!api.domain && !!api.token;
  const busy = phase === "saving" || phase === "syncing";

  async function save() {
    if (!domain.trim() || !token.trim()) return;
    setCanvasApiToken(domain, token);
    setToken("");
    setPhase("saving");
    const res = await syncCanvasApi();
    setPhase(res.ok ? "saved-ok" : "saved-fail");
  }
  async function syncNow() {
    setPhase("syncing");
    const res = await syncCanvasApi();
    setPhase(res.ok ? "saved-ok" : "saved-fail");
  }
  function clear() {
    if (!confirm("Disconnect Canvas and remove everything it imported from your calendar?")) return;
    clearCanvasApi();
    setDomain("");
    setToken("");
    setPhase("idle");
  }

  return (
    <div className="mm-card" style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <b style={{ fontSize: 14, flex: 1 }}>Canvas</b>
        {connected && <span className="mm-pill" style={{ background: T.mint, color: T.bg }}>Connected</span>}
      </div>
      <div style={{ fontSize: 11, color: T.inkSoft, lineHeight: 1.5, marginBottom: 8 }}>
        The real Canvas API — assignments, due dates, real class names + teachers, and actual submission status
        (not guessed). Get a token from Canvas → Account → Settings → Approved Integrations → + New Access Token.
        The token stays on this machine only.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 6 }}>
        <input
          placeholder="Canvas domain, e.g. canvas.mountvernonschool.org"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          style={{ fontSize: 11 }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="password"
            placeholder={connected ? "Paste a new token to replace it…" : "Paste your access token…"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{ flex: 1, fontSize: 11 }}
          />
          <button className="mm-btn mm-btn-primary" onClick={save} disabled={busy || !domain.trim() || !token.trim()}>
            {phase === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      {/* Loud, impossible-to-miss feedback right under the buttons — the tiny
          status line below is easy to skim past, and a slow first sync with
          nothing else changing on screen reads exactly like the button did
          nothing. */}
      {phase === "saving" && (
        <div style={{ fontSize: 11, color: T.mint, marginBottom: 6 }}>Saving and fetching your courses + assignments — this can take a few seconds…</div>
      )}
      {phase === "saved-ok" && (
        <div style={{ fontSize: 11, color: T.mint, marginBottom: 6 }}>✓ Saved and synced.</div>
      )}
      {phase === "saved-fail" && (
        <div style={{ fontSize: 11, color: T.warn, marginBottom: 6 }}>Saved the token, but the sync failed — see the error below.</div>
      )}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <button className="mm-btn" onClick={syncNow} disabled={busy || !connected}>{phase === "syncing" ? "Syncing…" : "Sync now"}</button>
        {connected && <button className="mm-btn mm-btn-danger" onClick={clear}>Disconnect</button>}
        <span style={{ fontSize: 10, color: api.lastError ? T.warn : T.inkTiny, flex: 1, minWidth: 160 }}>
          {api.lastError
            ? `Last sync failed: ${api.lastError}`
            : api.lastSyncAt
              ? `Synced ${timeAgo(api.lastSyncAt)} · ${api.lastCourseCount ?? 0} class${api.lastCourseCount === 1 ? "" : "es"} · ${api.lastAssignmentCount ?? 0} assignment${api.lastAssignmentCount === 1 ? "" : "s"}`
              : connected ? "Not synced yet." : "Not connected."}
        </span>
      </div>
    </div>
  );
}

export function IntegrationsSection({ s }: { s: State }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div className="serif" style={{ fontSize: 20, marginBottom: 4 }}>Connected calendars</div>
      <div style={{ fontSize: 11, color: T.inkTiny, marginBottom: 8 }}>
        Private credentials — nothing here is shared beyond fetching your own data. Veracross → Calendar →
        Subscribe/Export for its link; Google Calendar → Settings → pick a calendar on the left → "Secret address
        in iCal format" (under Integrate calendar).
      </div>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", alignItems: "start" }}>
        <CanvasApiCard s={s} />
        <FeedCard s={s} source="veracross" label="Veracross" blurb="The live Student Portal schedule. Re-sync whenever it changes and MoreMe follows." />
        <FeedCard s={s} source="google" label="Google Calendar" blurb="Any Google calendar's secret iCal address — personal events, a shared family calendar, whatever you point it at." />
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { MoreMe } from "./embedded/MoreMe";
import { applyAccent, loadAccent } from "./theme-accent";
import { applyUiPrefs, loadPrefs } from "./uiPrefs";
import { initTheme } from "./moreme/styles";
import { initTrackingSiren } from "./moreme/tracking";
import { installAgentApi } from "./moreme/agentApi";
import { MoreMeMark } from "./moreme/ui";
import { T } from "./moreme/styles";

// Single-user app — this machine, this person, no accounts. State lives in
// this install's localStorage only (survives updates fine: same app data
// dir every version). Boots straight into MoreMe, no login gate.
export function App() {
  useEffect(() => {
    applyAccent(loadAccent());
    applyUiPrefs(loadPrefs());
    initTheme();
    initTrackingSiren();
    installAgentApi();
  }, []);

  return (
    <>
    <BootSplash />
    {/* MoreMe's own sidebar is the app's only chrome now — no separate outer
        topbar. Two "MoreMe" headers stacked on top of each other was a
        leftover from the three-surface shell. */}
    <div className="shell" style={{ display: "flex", flexDirection: "column", height: "100vh", minHeight: 0 }}>
      <main style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <MoreMe />
      </main>
    </div>
    </>
  );
}

// ── boot moment ─────────────────────────────────────────────────────────
// Entering the app should feel like arriving somewhere. One brief
// mark-and-wordmark flash per launch — 1s total, fades itself out,
// click-through to skip, never shown again until the next launch.
let bootShown = false;
function BootSplash() {
  const [phase, setPhase] = useState<"show" | "fade" | "done">(bootShown ? "done" : "show");
  useEffect(() => {
    if (phase !== "show") return;
    bootShown = true;
    const a = window.setTimeout(() => setPhase("fade"), 700);
    const b = window.setTimeout(() => setPhase("done"), 1100);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, [phase]);
  if (phase === "done") return null;
  return (
    <div
      onClick={() => setPhase("done")}
      style={{
        position: "fixed", inset: 0, zIndex: 10000, display: "grid", placeItems: "center",
        background: T.bg, opacity: phase === "fade" ? 0 : 1, transition: "opacity .4s ease",
        pointerEvents: phase === "fade" ? "none" : "auto",
      }}
    >
      <div style={{ textAlign: "center", animation: "mmBootIn .5s ease-out" }}>
        <MoreMeMark size={64} />
        <div className="mm-h1 serif" style={{ fontSize: 30, color: T.ink, marginTop: 10, fontFamily: "Georgia, serif" }}>MoreMe</div>
        <div style={{ fontSize: 10, letterSpacing: "0.3em", color: T.inkTiny, marginTop: 6 }}>more you than yesterday</div>
      </div>
      <style>{`@keyframes mmBootIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}

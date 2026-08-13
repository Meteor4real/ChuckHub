// MoreMe — the parent-code gate. Wraps a block of settings (screen-budget
// numbers, adding level rewards) behind a 4-digit code only a parent knows.
// Not real security — it's a friction point so a kid can't quietly self-buff
// their own budget or rewards, and a promise a parent can reset without
// needing the kid's cooperation (enter the current code, set a new one).
// Never used for punishments or for logging — those stay open.

import { useState } from "react";
import { T } from "./styles";
import { checkParentCode, hasParentCode, setParentCode } from "./store";
import type { State } from "./types";

export function ParentGate({ s, children }: { s: State; children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);
  const [showReset, setShowReset] = useState(false);

  if (unlocked) {
    return (
      <div>
        {children}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <button className="mm-btn" style={{ fontSize: 10, padding: "3px 8px" }} onClick={() => setUnlocked(false)}>Lock</button>
          <button className="mm-btn" style={{ fontSize: 10, padding: "3px 8px" }} onClick={() => setShowReset((v) => !v)}>Change parent code</button>
        </div>
        {showReset && <ResetCodeForm onDone={() => setShowReset(false)} />}
      </div>
    );
  }

  if (!hasParentCode(s)) {
    return <SetCodeForm onDone={() => setUnlocked(true)} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11, color: T.inkTiny }}>Locked behind the parent code.</div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="password" inputMode="numeric" maxLength={4} placeholder="4-digit code" value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setErr(false); }}
          style={{ width: 110 }}
        />
        <button
          className="mm-btn mm-btn-primary"
          onClick={() => { if (checkParentCode(code, s)) { setUnlocked(true); setCode(""); } else setErr(true); }}
        >Unlock</button>
      </div>
      {err && <div style={{ fontSize: 11, color: "#FF5577" }}>Wrong code.</div>}
    </div>
  );
}

function SetCodeForm({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  function save() {
    if (code.length !== 4) { setErr("Code must be 4 digits."); return; }
    if (code !== confirm) { setErr("Codes don't match."); return; }
    setParentCode(code);
    onDone();
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11, color: T.inkTiny, lineHeight: 1.5 }}>
        No parent code set yet — set one now. This is what a parent will hold to gate these settings and level rewards.
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input type="password" inputMode="numeric" maxLength={4} placeholder="New 4-digit code" value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 4)); setErr(""); }} style={{ width: 130 }} />
        <input type="password" inputMode="numeric" maxLength={4} placeholder="Confirm" value={confirm} onChange={(e) => { setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4)); setErr(""); }} style={{ width: 100 }} />
        <button className="mm-btn mm-btn-primary" onClick={save}>Set code</button>
      </div>
      {err && <div style={{ fontSize: 11, color: "#FF5577" }}>{err}</div>}
    </div>
  );
}

function ResetCodeForm({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  function save() {
    if (next.length !== 4) { setErr("New code must be 4 digits."); return; }
    if (next !== confirm) { setErr("New codes don't match."); return; }
    if (!setParentCode(next, current)) { setErr("Current code is wrong."); return; }
    onDone();
  }
  return (
    <div style={{ marginTop: 8, padding: 8, background: T.sunk, borderRadius: 8, display: "flex", flexDirection: "column", gap: 6 }}>
      <input type="password" inputMode="numeric" maxLength={4} placeholder="Current code" value={current} onChange={(e) => { setCurrent(e.target.value.replace(/\D/g, "").slice(0, 4)); setErr(""); }} />
      <div style={{ display: "flex", gap: 6 }}>
        <input type="password" inputMode="numeric" maxLength={4} placeholder="New code" value={next} onChange={(e) => { setNext(e.target.value.replace(/\D/g, "").slice(0, 4)); setErr(""); }} />
        <input type="password" inputMode="numeric" maxLength={4} placeholder="Confirm new" value={confirm} onChange={(e) => { setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4)); setErr(""); }} />
      </div>
      <button className="mm-btn mm-btn-primary" onClick={save}>Save new code</button>
      {err && <div style={{ fontSize: 11, color: "#FF5577" }}>{err}</div>}
    </div>
  );
}

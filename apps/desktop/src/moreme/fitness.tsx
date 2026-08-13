// MoreMe — Fitness logging. Real numbers, not a checkbox: what you did, how
// long, distance when it applies. Same log-it-after shape as Screens, so
// the training half of the story gets the same first-class treatment the
// screen-time half already had.

import { useState } from "react";
import { T } from "./styles";
import { FITNESS_KINDS, FITNESS_KIND_LABEL, type FitnessKind, type State } from "./types";
import { fitnessMinutesOn, fitnessSessionsOn, logFitnessSession, removeFitnessSession, today } from "./store";

function fmtMin(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function FitnessCardToday({ s, onOpenLog }: { s: State; onOpenLog: () => void }) {
  const date = today();
  const sessions = fitnessSessionsOn(date, s);
  const minutes = fitnessMinutesOn(date, s);
  return (
    <div className="mm-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: T.inkTiny }}>Training today</div>
        <div style={{ flex: 1 }} />
        {sessions.length > 0 && <span className="mm-pill" style={{ background: "#4ADE8022", color: "#4ADE80" }}>{fmtMin(minutes)} logged</span>}
      </div>

      {sessions.length === 0 ? (
        <div style={{ fontSize: 12, color: T.inkTiny, fontStyle: "italic" }}>Nothing logged yet today.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sessions.map((x) => (
            <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <span className="mm-dot" style={{ ["--c" as never]: "#4ADE80" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{x.what}</b> <span style={{ color: T.inkTiny, fontWeight: 400 }}>· {FITNESS_KIND_LABEL[x.kind]}</span>
                {x.distanceMi ? <span style={{ color: T.inkTiny }}> · {x.distanceMi}mi</span> : null}
              </div>
              <span style={{ color: T.inkTiny }}>{fmtMin(x.minutes)}</span>
              <button className="mm-btn" style={{ padding: "2px 6px" }} onClick={() => removeFitnessSession(x.id)}>×</button>
            </div>
          ))}
        </div>
      )}

      <button className="mm-btn mm-btn-primary" onClick={onOpenLog}>+ Log workout</button>
    </div>
  );
}

export function LogFitnessModal({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<FitnessKind>("cardio");
  const [what, setWhat] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [distance, setDistance] = useState("");
  const [details, setDetails] = useState("");

  function save() {
    const m = parseInt(minutes, 10);
    if (!Number.isFinite(m) || m <= 0) return;
    const d = parseFloat(distance);
    logFitnessSession(kind, what, m, {
      distanceMi: Number.isFinite(d) && d > 0 ? d : undefined,
      details: details.trim() || undefined,
    });
    onClose();
  }

  return (
    <div className="mm-modal-back" onClick={onClose}>
      <div className="mm-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div className="serif" style={{ fontSize: 20, flex: 1 }}>Log a workout</div>
          <button className="mm-btn" onClick={onClose}>Close</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="What did you do?">
            <input autoFocus value={what} placeholder="5k run, leg day, basketball…" onChange={(e) => setWhat(e.target.value)} />
          </Field>
          <Field label="Kind">
            <select value={kind} onChange={(e) => setKind(e.target.value as FitnessKind)}>
              {FITNESS_KINDS.map((k) => <option key={k} value={k}>{FITNESS_KIND_LABEL[k]}</option>)}
            </select>
          </Field>
          <div className="mm-row">
            <Field label="Minutes">
              <input type="number" inputMode="numeric" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </Field>
            {kind === "cardio" && (
              <Field label="Distance (mi, optional)">
                <input type="number" inputMode="decimal" min={0} step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} />
              </Field>
            )}
          </div>
          <Field label="Sets / reps / notes (optional)">
            <textarea value={details} rows={2} placeholder="3x10 squats, 3x12 bench…" onChange={(e) => setDetails(e.target.value)} />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="mm-btn mm-btn-primary" onClick={save}>Log it</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mm-field"><label>{label}</label>{children}</div>;
}

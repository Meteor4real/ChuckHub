// MoreMe — Mount Vernon mod schedule. The real structure: 4 Mods/year, 5
// rotating periods whose order changes daily (no fixed weekly grid), a
// fixed 9:30-10:00 special block per weekday, and a lunch slot that splits
// around lunch based on room floor. Built as a manual per-day block editor
// since the full bell schedule / rotation isn't known yet — real times
// only, nothing guessed. Fill it in as you learn each Mod's actual rotation.

import { useState } from "react";
import { T } from "./styles";
import type { SchoolBlock, SchoolMod, State } from "./types";
import {
  addSchoolBlock, blankSchoolMod, generateSchoolModEvents, removeSchoolBlock,
  removeSchoolMod, removeSchoolModEvents, schoolModEventsApplied, setLunchSlot,
  updateSchoolBlock, upsertSchoolMod,
} from "./store";

const WEEKDAYS: { d: number; label: string }[] = [
  { d: 1, label: "Monday" }, { d: 2, label: "Tuesday" }, { d: 3, label: "Wednesday" },
  { d: 4, label: "Thursday" }, { d: 5, label: "Friday" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mm-field"><label>{label}</label>{children}</div>;
}

export function SchoolModsCard({ s }: { s: State }) {
  const [openId, setOpenId] = useState<string | null>(s.schoolMods[0]?.id ?? null);
  const nextNumber = (s.schoolMods.reduce((max, m) => Math.max(max, m.number), 0) % 4) + 1;
  return (
    <div className="mm-card" style={{ padding: 16 }}>
      <div className="serif" style={{ fontSize: 16, marginBottom: 4 }}>Mod Schedule</div>
      <div style={{ fontSize: 11, color: T.inkTiny, marginBottom: 10, lineHeight: 1.5 }}>
        4 Mods a year. Periods rotate order day to day, so build each weekday's real blocks as you learn them —
        nothing here is guessed. The 9:30–10:00 special block is filled in automatically per weekday.
      </div>
      {s.schoolMods.length === 0 && (
        <div style={{ fontSize: 12, color: T.inkTiny, fontStyle: "italic", marginBottom: 10 }}>No mods added yet.</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {s.schoolMods.sort((a, b) => a.number - b.number).map((m) => (
          <SchoolModRow key={m.id} m={m} s={s} open={openId === m.id} onToggle={() => setOpenId(openId === m.id ? null : m.id)} />
        ))}
      </div>
      <button className="mm-btn" style={{ width: "100%" }} onClick={() => { const m = blankSchoolMod(nextNumber); upsertSchoolMod(m); setOpenId(m.id); }}>
        + Add Module {nextNumber}
      </button>
    </div>
  );
}

function SchoolModRow({ m, s, open, onToggle }: { m: SchoolMod; s: State; open: boolean; onToggle: () => void }) {
  const applied = schoolModEventsApplied(m.id, s);
  return (
    <div style={{ border: `1px solid ${applied ? T.mint : T.line}`, borderRadius: 10, padding: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={onToggle}>
        <b style={{ fontSize: 13, flex: 1 }}>{m.label}</b>
        {applied && <span className="mm-pill" style={{ background: T.mint, color: T.bg }}>On calendar</span>}
        <span style={{ color: T.inkTiny, fontSize: 11 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="mm-row">
            <Field label="Label"><input value={m.label} onChange={(e) => upsertSchoolMod({ ...m, label: e.target.value })} /></Field>
            <Field label="Advisor"><input value={m.advisor ?? ""} onChange={(e) => upsertSchoolMod({ ...m, advisor: e.target.value })} /></Field>
          </div>
          <div className="mm-row">
            <Field label="Starts"><input type="date" value={m.startDate} onChange={(e) => upsertSchoolMod({ ...m, startDate: e.target.value })} /></Field>
            <Field label="Ends"><input type="date" value={m.endDate} onChange={(e) => upsertSchoolMod({ ...m, endDate: e.target.value })} /></Field>
          </div>

          {WEEKDAYS.map((w) => <DayEditor key={w.d} modId={m.id} weekday={w.d} label={w.label} blocks={m.days[w.d] ?? []} />)}

          <div style={{ display: "flex", gap: 6 }}>
            <button className="mm-btn mm-btn-primary" style={{ flex: 1 }} onClick={() => generateSchoolModEvents(m.id)}>{applied ? "Update calendar" : "Add to calendar"}</button>
            {applied && <button className="mm-btn" onClick={() => removeSchoolModEvents(m.id)}>Remove from calendar</button>}
            <button className="mm-btn mm-btn-danger" onClick={() => { if (confirm(`Delete ${m.label} and its calendar events?`)) removeSchoolMod(m.id); }}>Delete mod</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DayEditor({ modId, weekday, label, blocks }: { modId: string; weekday: number; label: string; blocks: SchoolBlock[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [showLunch, setShowLunch] = useState(false);
  const sorted = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
  return (
    <div style={{ padding: 8, background: T.sunk, borderRadius: 8 }}>
      <div style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: T.inkTiny, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
        {sorted.map((b) => <BlockRow key={b.id} modId={modId} weekday={weekday} b={b} />)}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="mm-btn" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => setShowAdd((v) => !v)}>+ Period</button>
        <button className="mm-btn" style={{ padding: "3px 8px", fontSize: 11 }} onClick={() => setShowLunch((v) => !v)}>Set lunch-slot class</button>
      </div>
      {showAdd && <AddPeriodForm modId={modId} weekday={weekday} onDone={() => setShowAdd(false)} />}
      {showLunch && <LunchForm modId={modId} weekday={weekday} onDone={() => setShowLunch(false)} />}
    </div>
  );
}

function BlockRow({ modId, weekday, b }: { modId: string; weekday: number; b: SchoolBlock }) {
  const tone = b.kind === "special" ? T.cool : b.kind === "lunch" ? "#4ADE80" : T.mint;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, borderLeft: `3px solid ${tone}`, paddingLeft: 8 }}>
      <span style={{ width: 92, color: T.inkTiny, fontFamily: "ui-monospace, monospace", fontSize: 10 }}>{b.start}–{b.end}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>{b.label}</b>
        {(b.room || b.teacher) && <span style={{ color: T.inkTiny }}> · {[b.room, b.teacher].filter(Boolean).join(" · ")}</span>}
      </div>
      {b.kind === "period" && (
        <input placeholder="room" value={b.room ?? ""} onChange={(e) => updateSchoolBlock(modId, weekday, b.id, { room: e.target.value })} style={{ width: 60, fontSize: 11, padding: "2px 6px" }} />
      )}
      <button className="mm-btn" style={{ padding: "1px 6px" }} onClick={() => removeSchoolBlock(modId, weekday, b.id)}>×</button>
    </div>
  );
}

function AddPeriodForm({ modId, weekday, onDone }: { modId: string; weekday: number; onDone: () => void }) {
  const [subject, setSubject] = useState("");
  const [room, setRoom] = useState("");
  const [teacher, setTeacher] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  function save() {
    if (!subject.trim() || !start || !end) return;
    addSchoolBlock(modId, weekday, { kind: "period", label: subject.trim(), room: room.trim() || undefined, teacher: teacher.trim() || undefined, start, end });
    onDone();
  }
  return (
    <div style={{ marginTop: 6, padding: 8, background: T.bg, borderRadius: 8, display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="mm-row">
        <input placeholder="Subject (e.g. Algebra II)" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ flex: 1 }} />
        <input placeholder="Room" value={room} onChange={(e) => setRoom(e.target.value)} style={{ width: 70 }} />
      </div>
      <div className="mm-row">
        <input placeholder="Teacher (optional)" value={teacher} onChange={(e) => setTeacher(e.target.value)} style={{ flex: 1 }} />
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <button className="mm-btn mm-btn-primary" onClick={save}>Add</button>
    </div>
  );
}

function LunchForm({ modId, weekday, onDone }: { modId: string; weekday: number; onDone: () => void }) {
  const [subject, setSubject] = useState("");
  const [room, setRoom] = useState("");
  const [teacher, setTeacher] = useState("");
  function save() {
    if (!subject.trim()) return;
    setLunchSlot(modId, weekday, subject, room, teacher);
    onDone();
  }
  return (
    <div style={{ marginTop: 6, padding: 8, background: T.bg, borderRadius: 8, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 10, color: T.inkTiny, lineHeight: 1.5 }}>
        Whichever class rotates into the lunch slot this day. Room decides A/B Lunch automatically —
        floor 1 or 3 → B Lunch (class first), everything else → A Lunch (lunch first).
      </div>
      <div className="mm-row">
        <input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ flex: 1 }} />
        <input placeholder="Room" value={room} onChange={(e) => setRoom(e.target.value)} style={{ width: 70 }} />
      </div>
      <input placeholder="Teacher (optional)" value={teacher} onChange={(e) => setTeacher(e.target.value)} />
      <button className="mm-btn mm-btn-primary" onClick={save}>Set</button>
    </div>
  );
}

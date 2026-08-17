// MoreMe — minimal iCalendar (.ics) reader for external school feeds
// (Canvas assignments/classes, Veracross schedule). No external library:
// just enough of RFC 5545 to pull UID/SUMMARY/DTSTART/DTEND/LOCATION/
// DESCRIPTION out of VEVENT blocks. Not a general-purpose ICS parser —
// recurring VEVENTs (RRULE) are read as their single anchor occurrence
// only, which matches how Canvas/Veracross actually emit these feeds
// (one VEVENT per concrete assignment/meeting, not a recurrence rule).

export type IcsEvent = {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  allDay: boolean;
  date: string;      // YYYY-MM-DD
  start?: string;    // HH:MM, local time — undefined when allDay
  end?: string;       // HH:MM, local time
  endDate?: string;   // YYYY-MM-DD when a multi-day all-day span
};

// RFC 5545 line unfolding: a line starting with a space or tab continues
// the previous line. Also normalizes CRLF/CR to LF first.
function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function unescapeText(v: string): string {
  return v
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function pad2(n: number): string { return n < 10 ? `0${n}` : String(n); }

// Parses a DTSTART/DTEND VALUE — either "20260815" (date), or
// "20260815T093000" (floating local time), or "20260815T093000Z" (UTC,
// converted to this machine's local time — correct as long as MoreMe runs
// where the student actually is, which it does).
function parseDtValue(value: string): { allDay: boolean; date: string; time?: string } {
  const v = value.trim();
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(v);
  if (!m) return { allDay: true, date: v.slice(0, 10) || "" };
  const [, y, mo, d, hh, mm, ss, z] = m;
  if (hh == null) return { allDay: true, date: `${y}-${mo}-${d}` };
  if (z) {
    const dt = new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm, +(ss ?? "0")));
    return {
      allDay: false,
      date: `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`,
      time: `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`,
    };
  }
  return { allDay: false, date: `${y}-${mo}-${d}`, time: `${hh}:${mm}` };
}

// Splits "PROP;PARAM=X;PARAM2=Y:value" into { name, value } (params dropped —
// we don't need TZID resolution since DTSTART is either UTC or floating-local,
// both handled above without a timezone database).
function splitLine(line: string): { name: string; value: string } | null {
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  const left = line.slice(0, colon);
  const name = left.split(";")[0].toUpperCase();
  return { name, value: line.slice(colon + 1) };
}

export function parseIcs(text: string): IcsEvent[] {
  const lines = unfold(text);
  const out: IcsEvent[] = [];
  let cur: Record<string, string> | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT") {
      if (cur) {
        const uid = cur.UID ?? "";
        const summary = cur.SUMMARY ? unescapeText(cur.SUMMARY) : "";
        if (uid && cur.DTSTART) {
          const startVal = parseDtValue(cur.DTSTART);
          const endVal = cur.DTEND ? parseDtValue(cur.DTEND) : null;
          out.push({
            uid,
            summary: summary || "(untitled)",
            description: cur.DESCRIPTION ? unescapeText(cur.DESCRIPTION) : undefined,
            location: cur.LOCATION ? unescapeText(cur.LOCATION) : undefined,
            allDay: startVal.allDay,
            date: startVal.date,
            start: startVal.time,
            end: endVal?.time,
            endDate: endVal && endVal.allDay && endVal.date !== startVal.date ? endVal.date : undefined,
          });
        }
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const parsed = splitLine(line);
    if (!parsed) continue;
    // First value for a property wins (Canvas doesn't repeat these).
    if (cur[parsed.name] == null) cur[parsed.name] = parsed.value;
  }
  return out;
}

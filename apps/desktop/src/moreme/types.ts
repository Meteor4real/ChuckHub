// MoreMe — types for the calendar-first rebuild.
//
// Everything schedulable is a CalEvent: recurring routine habits, school
// classes, business meetings, travel, and "announcements" (which can be
// hidden until you're ready to reveal them). XP is earned per completed
// occurrence; completing milestones and projects adds bonus XP. No modes,
// no focus blocks, no strikes, no session breaks.

export type Category =
  | "routine"      // recurring habit (morning routine, bedtime, movement)
  | "class"        // a Mount Vernon class period
  | "school"       // homework / assignments / school work
  | "business"     // running your companies
  | "venture"      // a specific business / venture activity
  | "project"      // personal build / mod work
  | "meeting"      // a scheduled meeting
  | "travel"       // trips, the helicopter, logistics
  | "announcement" // something you plan to reveal to the school
  | "fitness"      // workout / sport
  | "personal";    // anything else

export type Priority = "low" | "normal" | "high";
export type EventStatus = "planned" | "doing" | "done" | "skipped";
// "hidden" = an unannounced plan: visible only to you until you reveal it.
export type Visibility = "visible" | "hidden";

export type ChecklistItem = { id: string; text: string; done: boolean };

export type Recurrence =
  | { kind: "none" }
  | { kind: "daily" }
  | { kind: "weekdays" }            // Mon–Fri
  | { kind: "weekly"; days: number[] }; // 0=Sun … 6=Sat

export type CalEvent = {
  id: string;
  title: string;
  notes?: string;
  category: Category;
  date: string;                 // YYYY-MM-DD — anchor date (recurrence start)
  until?: string;               // YYYY-MM-DD — recurrence end (optional)
  allDay: boolean;
  start?: string;               // "HH:MM"
  end?: string;                 // "HH:MM"
  location?: string;
  people: string[];             // Person ids
  linkedProjectId?: string;
  linkedClassId?: string;       // for category="school" or "class" — anchors Get Ahead
  checklist: ChecklistItem[];
  priority: Priority;
  visibility: Visibility;
  recurrence: Recurrence;
  reminders: number[];          // minutes before start
  xp: number;                   // awarded per completed occurrence
  // Single events: status drives completion. Recurring events ignore this and
  // use the completions map keyed by occurrence date instead.
  status: EventStatus;
  createdAt: number;
  // Stamped by revealEvent() on a real hidden -> visible transition. The
  // "Made It Official" achievement keys on this, so it can only be earned by
  // actually using the reveal mechanic.
  revealedAt?: number;
  // ── School honesty log (only meaningful when category === "school") ──
  // The neutral mirror: did you actually read the material before starting?
  // What help did you use? What stuck? No nags — just self-reflection.
  prepared?: boolean;           // "I read what I needed before I dove in"
  helpUsed?: HelpKind;          // "none" | "search" | "ai" | "friend" | "mixed"
  learned?: string;             // one-line takeaway, your own words
};

export type HelpKind = "none" | "search" | "ai" | "friend" | "mixed";
export const HELP_KINDS: HelpKind[] = ["none", "search", "ai", "friend", "mixed"];
export const HELP_KIND_LABEL: Record<HelpKind, string> = {
  none: "None — all me", search: "Search / docs", ai: "AI", friend: "A friend", mixed: "A mix",
};

// A Mount Vernon class (or any course). School-work events link to a class
// so the Get Ahead planner can roll up "% pre-done" per course over the
// upcoming week / month. An optional weekly `period` lets MoreMe generate the
// recurring class meetings onto the calendar in one click.
export type ClassPeriod = { days: number[]; start: string; end: string };  // days: 0=Sun..6=Sat
export type Class = {
  id: string;
  name: string;        // "World History", "Algebra II", etc.
  teacher?: string;    // Person id
  color?: string;      // optional accent override
  room?: string;       // where it meets
  period?: ClassPeriod; // weekly meeting pattern (drives the timetable generator)
};

// A freeform note / plan. The "folders of plans in development" bucket — the
// unannounced ideas, ARG planning, meeting talking points, anything that's
// reference rather than a scheduled action.
export type Note = {
  id: string;
  title: string;
  body: string;
  pinned?: boolean;
  linkedProjectId?: string;
  hidden?: boolean;     // an unannounced plan — dimmed + marked in the list
  ts: number;
  updatedAt: number;
};

export type ProjectStatus = "active" | "paused" | "done";

export type Project = {
  id: string;
  name: string;
  // Free text, not a preset list — the app doesn't assume what kind of
  // projects you run. Leave it blank if it's not worth categorizing.
  kind: string;
  status: ProjectStatus;
  notes?: string;
  deadline?: string;            // YYYY-MM-DD
  milestones: ChecklistItem[];
  completedAt?: number;         // set when status flips to done (project XP bonus)
};

export type Person = {
  id: string;
  name: string;
  role: string;                 // "Friend", "Teacher", "Principal", "Investor"…
  notes?: string;
  lastTouch?: number;           // ms — last time you logged an interaction
};

// A logged interaction with someone in your Circle — the thing that makes
// it more than a name tag. "Touch" = any real contact: a call, a favor, a
// catch-up, not necessarily a scheduled meeting.
export type Touch = { id: string; personId: string; note?: string; ts: number };

// A business / venture you run. Tracked separately from Projects so the
// Empire view can sum monthly revenue and show health at a glance.
export type VentureStatus = "idea" | "building" | "live" | "scaling" | "sold" | "paused";
export type RevenueEntry = { id: string; month: string; amount: number };  // month = YYYY-MM
export type Venture = {
  id: string;
  name: string;
  tagline?: string;
  status: VentureStatus;
  link?: string;
  notes?: string;
  // monthly revenue history -> the Empire dashboard derives current MRR + trend
  revenue: RevenueEntry[];
  nextAction?: string;
  createdAt: number;
};

// GTD quick-capture. Dump anything; triage later into an event/project/goal.
export type InboxItem = { id: string; text: string; ts: number };

export type Goal = { id: string; text: string; done?: boolean };
export type Goals = {
  week: Goal[];
  semester: Goal[];
  year: Goal[];
  identity: Goal[];
};

export type DistractionLog = { id: string; date: string; note: string; ts: number };

// ── Screen training ────────────────────────────────────────────────────────
// Built for honest awareness, not nags. The system reflects, never lectures.
// Sessions are logged (quick-add or live timer). Daily budget = base +
// bonus×routines-done-today (you EARN screens by doing the routines you'd
// otherwise skip). Optional pre-committed window for "I only play 4–9pm."
// Urges are tracked because resisting them IS the win — not zero screentime.

export type ScreenCategory = "gaming" | "social" | "video" | "browsing" | "creative" | "other";
export const SCREEN_CATEGORIES: ScreenCategory[] = ["gaming", "social", "video", "browsing", "creative", "other"];
export const SCREEN_CATEGORY_LABEL: Record<ScreenCategory, string> = {
  gaming: "Gaming", social: "Social", video: "Video", browsing: "Browsing",
  creative: "Creative", other: "Other",
};

export type ScreenSession = {
  id: string;
  date: string;          // YYYY-MM-DD (the day the session started; sessions don't cross-pollinate days)
  startedAt: number;     // ms
  endedAt?: number;      // ms — undefined while in-progress
  minutes?: number;      // explicit minutes; used when set, otherwise computed from times
  category: ScreenCategory;
  what: string;          // free-text: "Minecraft", "YouTube", "Hypixel Bedwars"
  note?: string;
};

// ── Fitness logging ────────────────────────────────────────────────────────
// The training half of the story, tracked with real numbers instead of a
// bare checkbox. Same quick-log shape as Screens: log it after, or (later)
// run a timer. Distance is optional — only cardio really uses it.
export type FitnessKind = "cardio" | "strength" | "sport" | "flexibility" | "other";
export const FITNESS_KINDS: FitnessKind[] = ["cardio", "strength", "sport", "flexibility", "other"];
export const FITNESS_KIND_LABEL: Record<FitnessKind, string> = {
  cardio: "Cardio", strength: "Strength", sport: "Sport", flexibility: "Flexibility", other: "Other",
};
export type FitnessSession = {
  id: string;
  date: string;          // YYYY-MM-DD
  startedAt: number;     // ms
  kind: FitnessKind;
  what: string;          // free-text: "5k run", "Leg day", "Basketball"
  minutes: number;
  distanceMi?: number;   // optional — cardio mostly
  details?: string;      // free-text: sets/reps/splits/whatever's worth noting
};

export type UrgeResolution = "resisted" | "later" | "did-it";  // honest
export type UrgeLog = {
  id: string;
  date: string;          // YYYY-MM-DD
  ts: number;
  what?: string;         // what was tempting
  resolution: UrgeResolution;
  replacement?: string;  // what you did instead (if resisted)
  note?: string;
};

// A 1- to 10-minute alternative you can pick when the urge hits. Editable.
export type Replacement = { id: string; label: string; minutes: number };

export type ScreenSettings = {
  baseBudgetMinutes: number;      // base daily budget
  bonusPerRoutineMinutes: number; // unlocked per routine you complete that day
  capBudgetMinutes: number;       // ceiling even with bonuses (so it doesn't run away)
  windowStart?: string;           // HH:MM — pre-committed "screens only after this"
  windowEnd?: string;             // HH:MM — pre-committed "screens off by this"
  awardXpPerUrgeResisted: number; // XP credit for an urge you logged + resisted
};

// ── Customization ──────────────────────────────────────────────────────────
// Lets the user rename tabs, hide ones they don't use, override the 20 rank
// names, add their own achievements, and define a third theme palette.
export type CustomTheme = {
  bg: string; elev: string; sunk: string;
  ink: string; inkSoft: string; inkTiny: string; line: string;
  mint: string; mintDeep: string; mintHi: string;
  warn: string; cool: string;
  heroImage?: string;  // optional URL — shown as a faint backdrop on Today
};
export type CustomAchievement = {
  id: string;
  title: string;
  desc: string;
  xp: number;
  claimedAt?: number;   // first claim timestamp; subsequent claims are no-ops
};
export type UserQuote = { id: string; text: string; by: string };

export type Customization = {
  tabLabels: Record<string, string>;     // tabId -> override label ("" or absent = use default)
  hiddenTabs: string[];                   // tabIds hidden from the tab row
  customRanks: (string | undefined)[];   // length 10; undefined = use RANK_NAMES default
  customAchievements: CustomAchievement[];
  customTheme?: CustomTheme;             // when set, "custom" theme becomes selectable
  useCustomTheme: boolean;               // toggle for the picker
  // User-supplied quote bank — the Today banner + quote widget rotate one
  // per day. Empty by default (no seeded quotes); managed in Customize.
  quotes: UserQuote[];
  // ── Dynamic UI (the agent API) ───────────────────────────────────────
  // dynamicTabs are user/agent-created tabs ordered after the built-ins.
  // widgets is a per-tab list, including built-in tab ids (e.g. "today"),
  // so an agent can drop a card onto Today without source edits.
  dynamicTabs: DynamicTab[];
  widgets: Record<string, Widget[]>;
};

// A user/agent-created tab. Each has its own list of widgets (looked up in
// `widgets[id]`). The icon is a plain string (emoji or letter) shown next to
// the label; agent can leave it empty.
export type DynamicTab = {
  id: string;        // stable id, used as a key into `widgets`
  label: string;
  icon?: string;
  notes?: string;    // free-text for the agent / user — never shown
};

// Widgets are the atoms an agent can compose. All keep state inline so a
// JSON dump of `widgets` round-trips losslessly.
export type Widget =
  | { id: string; kind: "text";      title?: string; body: string }
  | { id: string; kind: "counter";   title: string; value: number; step?: number; xpPerStep?: number }
  | { id: string; kind: "note";      title?: string; body: string }
  | { id: string; kind: "checklist"; title: string; items: { id: string; text: string; done: boolean }[] }
  | { id: string; kind: "link";      title: string; url: string }
  | { id: string; kind: "iframe";    title?: string; url: string; height?: number }
  | { id: string; kind: "stat";      title: string; source: StatSource; format?: "minutes" | "number" | "percent" }
  | { id: string; kind: "image";     title?: string; url: string; height?: number }
  | { id: string; kind: "divider" }
  | { id: string; kind: "quote";     title?: string };

// A read-only stat sourced from the live state. The renderer maps the source
// name to a computed value. Agents can ship new dashboards by composing these.
export type StatSource =
  | "screen.todayMinutes"
  | "screen.todayBudget"
  | "screen.urgesResistedToday"
  | "screen.urgesResistedTotal"
  | "xp.total"
  | "xp.level"
  | "xp.streak"
  | "events.todayCompleted"
  | "events.todayTotal"
  | "ventures.mrr"
  | "ventures.lifetime";

export const STAT_SOURCES: StatSource[] = [
  "screen.todayMinutes", "screen.todayBudget", "screen.urgesResistedToday",
  "screen.urgesResistedTotal", "xp.total", "xp.level", "xp.streak",
  "events.todayCompleted", "events.todayTotal", "ventures.mrr", "ventures.lifetime",
];

export type WidgetKind = Widget["kind"];
export const WIDGET_KINDS: WidgetKind[] = ["text", "counter", "note", "checklist", "link", "iframe", "stat", "image", "divider", "quote"];

export type LevelReward = { level: number; reward: string };

// Mount Vernon Upper School context. `grade9Year` is the calendar year you
// START 9th grade (the fall). The current grade is DERIVED from today's date
// vs. that anchor, rolling over each August — so it advances automatically
// every school year with no manual bump. `path` is the Upper School pathway.
export type SchoolPath = "Inquiry" | "Global Impact Diploma" | "Innovation Diploma";
export type School = {
  grade9Year: number;     // e.g. 2026 = you enter Grade 9 in Aug 2026
  path: SchoolPath;
};

// ── Mount Vernon Upper School mod schedule ─────────────────────────────────
// The real structure: 4 "Mods" per year, each with its own 5 rotating
// periods (P1-P5) whose ORDER changes day to day — there's no single fixed
// weekly grid. A fixed 30-min special block sits at 9:30-10:00 every day
// (which one depends on the weekday). Whichever period lands in the
// lunch-adjacent slot on a given day splits around lunch based on that
// period's room floor (1 or 3 -> B Lunch, everything else -> A Lunch; a
// period literally named/labeled GTD gets "GTD Lunch" instead of A/B).
//
// Bell times beyond the special block and the lunch window aren't known
// yet, so this models each weekday as a manually-built ordered list of
// blocks (real times only, never guessed) rather than a fixed slot grid —
// it can absorb the real rotation once you have it, one mod at a time.
export type SchoolBlockKind = "period" | "special" | "lunch";
export type SchoolBlock = {
  id: string;
  kind: SchoolBlockKind;
  label: string;        // "P1", "Advisory", "A Lunch", the subject name…
  teacher?: string;
  room?: string;         // e.g. "N2", "S1", "HQ1", "HQ2", "B", "MAC", "Blackbox"
  start: string;         // HH:MM
  end: string;           // HH:MM
  linkedClassId?: string; // period blocks only — anchors this block's events to Get Ahead
};
// weekday: 1=Mon .. 5=Fri (matches CalEvent recurrence day numbering)
export type SchoolMod = {
  id: string;
  number: number;         // 1-4
  label: string;          // "Module 1"
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
  advisor?: string;
  days: Record<number, SchoolBlock[]>;
};

export type State = {
  schemaVersion: 12;
  customization: Customization;
  school: School;
  schoolMods: SchoolMod[];
  events: CalEvent[];
  // completions keyed by `${eventId}::${YYYY-MM-DD}` -> unlock timestamp.
  completions: Record<string, number>;
  projects: Project[];
  ventures: Venture[];
  inbox: InboxItem[];
  notes: Note[];
  people: Person[];
  classes: Class[];
  goals: Goals;
  distractions: DistractionLog[];
  // Screen training surface — see the screen* types above.
  screenSessions: ScreenSession[];
  urges: UrgeLog[];
  replacements: Replacement[];
  screen: ScreenSettings;
  // Fitness logging + Circle touches — see the types above.
  fitnessSessions: FitnessSession[];
  touches: Touch[];
  rewards: LevelReward[];                        // user-set reward text per level
  unlockedAchievements: Record<string, number>;  // id -> unlocked ts
  startedAt: number;
};

// ── Level economy: fewer levels, much heavier XP per level ────────────────
// 10 levels on a quadratic per-level cost curve — matches the real tier
// count from the original More_Me site (js/xp.js, first commit).
export const MAX_LEVEL = 10;

// The site's actual tier ladder, verbatim from its first commit ("The Davis
// Website") — not the later Rookie..MVP rewrite, the original one, ending
// in Dude Perfect on purpose. Level n ↔ RANK_NAMES[n-1].
export const RANK_NAMES: readonly string[] = [
  "Initiate",           //  1
  "Worker",             //  2
  "Hard Worker",        //  3
  "Dedicated Worker",   //  4
  "Gymnast",            //  5
  "Dedicated Gymnast",  //  6
  "Athlete",            //  7
  "Dedicated Athlete",  //  8
  "Unstoppable",        //  9
  "Dude Perfect",       // 10 — the top, on purpose.
];

// XP required to advance FROM level n TO level n+1.
export function levelStep(n: number): number {
  return 500 * n * n; // L1→L2 = 500, L2→L3 = 2,000, L5→L6 = 12,500 …
}

// Cumulative XP required to *reach* a level (level 1 = 0 XP).
export function cumulativeXp(level: number): number {
  let total = 0;
  for (let k = 1; k < level; k++) total += levelStep(k);
  return total;
}

// Category presentation (label + accent color). Order here drives pickers.
export const CATEGORY_META: Record<Category, { label: string; color: string; glyph: string }> = {
  routine:      { label: "Routine",      color: "#8b95a5", glyph: "◇" },
  class:        { label: "Class",        color: "#33B5FF", glyph: "▤" },
  school:       { label: "School Work",  color: "#3EA0FF", glyph: "✎" },
  business:     { label: "Business",     color: "#FFB23E", glyph: "$" },
  venture:      { label: "Venture",      color: "#FF8A3E", glyph: "▲" },
  project:      { label: "Project",      color: "#A855F7", glyph: "◆" },
  meeting:      { label: "Meeting",      color: "#FF5577", glyph: "●" },
  travel:       { label: "Travel",       color: "#22D3EE", glyph: "✈" },
  announcement: { label: "Announcement", color: "#FFD23E", glyph: "❖" },
  // U+26A1 has Emoji_Presentation=Yes and renders as the yellow emoji bolt on
  // Windows — use a text-presentation zigzag arrow instead (NO EMOJIS rule).
  fitness:      { label: "Fitness",      color: "#4ADE80", glyph: "↯" },
  personal:     { label: "Personal",     color: "#9aa0ad", glyph: "·" },
};

export const CATEGORY_ORDER: Category[] = [
  "routine", "class", "school", "business", "venture",
  "project", "meeting", "travel", "announcement", "fitness", "personal",
];

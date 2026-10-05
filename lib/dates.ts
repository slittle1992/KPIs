import type { Grouping, ISODate } from "./types";

export const TZ = process.env.BUSINESS_TZ || "America/Chicago";

/** Today's date (YYYY-MM-DD) in the business time zone. */
export function todayISO(now: Date = new Date()): ISODate {
  return toISOInTZ(now);
}

export function toISOInTZ(d: Date, tz: string = TZ): ISODate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function parseISO(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatISO(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return formatISO(d);
}

export function isValidISO(s: unknown): s is ISODate {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseISO(s);
  // Round-trip guards against rollover dates such as 2026-13-40.
  return !Number.isNaN(d.getTime()) && formatISO(d) === s;
}

export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard++ < 2000) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/** Monday of the week containing `iso`. */
export function startOfWeek(iso: ISODate): ISODate {
  const d = parseISO(iso);
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0
  return addDays(iso, -dow);
}

export function startOfMonth(iso: ISODate): ISODate {
  return iso.slice(0, 8) + "01";
}

export function endOfMonth(iso: ISODate): ISODate {
  const d = parseISO(startOfMonth(iso));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return formatISO(d);
}

export function periodKey(iso: ISODate, g: Grouping): ISODate {
  if (g === "week") return startOfWeek(iso);
  if (g === "month") return startOfMonth(iso);
  return iso;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function fmtShort(iso: ISODate): string {
  const d = parseISO(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function fmtDay(iso: ISODate): string {
  const d = parseISO(iso);
  return `${DOW[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function fmtMonth(iso: ISODate): string {
  const d = parseISO(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function periodLabel(key: ISODate, g: Grouping, clampTo?: ISODate): string {
  if (g === "day") return fmtDay(key);
  if (g === "month") return fmtMonth(key);
  let end = addDays(key, 6);
  if (clampTo && end > clampTo) end = clampTo;
  return `${fmtShort(key)} – ${fmtShort(end)}`;
}

export type Preset = {
  id: string;
  label: string;
  range: (today: ISODate) => { from: ISODate; to: ISODate };
};

export const PRESETS: Preset[] = [
  { id: "this_week", label: "This week", range: (t) => ({ from: startOfWeek(t), to: t }) },
  {
    id: "last_week",
    label: "Last week",
    range: (t) => {
      const s = addDays(startOfWeek(t), -7);
      return { from: s, to: addDays(s, 6) };
    },
  },
  { id: "this_month", label: "This month", range: (t) => ({ from: startOfMonth(t), to: t }) },
  {
    id: "last_month",
    label: "Last month",
    range: (t) => {
      const s = startOfMonth(addDays(startOfMonth(t), -1));
      return { from: s, to: endOfMonth(s) };
    },
  },
  { id: "last_30", label: "Last 30 days", range: (t) => ({ from: addDays(t, -29), to: t }) },
  { id: "last_90", label: "Last 90 days", range: (t) => ({ from: addDays(t, -89), to: t }) },
];

export function resolveRange(params: { from?: string; to?: string; preset?: string }, today = todayISO()) {
  if (isValidISO(params.from) && isValidISO(params.to) && params.from <= params.to) {
    return { from: params.from, to: params.to, preset: undefined };
  }
  const preset = PRESETS.find((p) => p.id === params.preset) ?? PRESETS.find((p) => p.id === "last_30")!;
  return { ...preset.range(today), preset: preset.id };
}

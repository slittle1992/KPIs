import type { ISODate } from "../types";
import { parseISO } from "../dates";

/** Deterministic sample numbers so the UI can be previewed before any API keys exist. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function demoDay(date: ISODate) {
  const d = parseISO(date);
  const r = rng(d.getTime() / 86400000);
  const dow = d.getUTCDay();
  const weekend = dow === 0 || dow === 6;
  const spend = Math.round((weekend ? 420 : 560) + r() * 160);
  const leads = Math.max(0, Math.round((weekend ? 3 : 6) + r() * 5));
  const appointmentsSet = Math.min(leads, Math.round(leads * (0.35 + r() * 0.25)));
  const demos = Math.min(appointmentsSet, Math.round(appointmentsSet * (0.6 + r() * 0.3)));
  const sold = Math.round(demos * (0.25 + r() * 0.3));
  const revenue = sold * Math.round(6500 + r() * 6000);
  return { spend, leads, appointmentsSet, demos, revenue };
}

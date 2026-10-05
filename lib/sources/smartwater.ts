import type { ISODate } from "../types";

/**
 * SmartWater — demos run (quotes written) and revenue per day.
 *
 * The SmartWater API shape is not confirmed yet, so this adapter is a thin,
 * clearly-marked seam. Until SMARTWATER_API_URL is set, the dashboard uses the
 * demos / revenue typed into the entry page instead.
 *
 * Expected (placeholder) contract — adjust `parse` once the real API is known:
 *   GET {SMARTWATER_API_URL}?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   Authorization: Bearer {SMARTWATER_API_KEY}
 *   -> [{ "date": "YYYY-MM-DD", "demos": 3, "revenue": 12450.00 }, ...]
 */
export type SmartwaterDaily = Record<ISODate, { demos: number; revenue: number }>;
export type SmartwaterResult = { ok: boolean; byDate: SmartwaterDaily; detail: string };

export function smartwaterConfigured(): boolean {
  return Boolean(process.env.SMARTWATER_API_URL);
}

function parse(payload: unknown): SmartwaterDaily {
  const out: SmartwaterDaily = {};
  const rows = Array.isArray(payload) ? payload : (payload as { data?: unknown[] })?.data ?? [];
  for (const r of rows as Record<string, unknown>[]) {
    const date = String(r.date ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const cur = out[date] ?? { demos: 0, revenue: 0 };
    cur.demos += Number(r.demos ?? r.quotes ?? 0) || 0;
    cur.revenue += Number(r.revenue ?? r.sold ?? 0) || 0;
    out[date] = cur;
  }
  return out;
}

export async function fetchSmartwaterDaily(from: ISODate, to: ISODate): Promise<SmartwaterResult> {
  if (!smartwaterConfigured()) return { ok: false, byDate: {}, detail: "SmartWater not configured" };
  const base = process.env.SMARTWATER_API_URL!;
  const url = `${base}${base.includes("?") ? "&" : "?"}from=${from}&to=${to}`;
  try {
    const res = await fetch(url, {
      headers: process.env.SMARTWATER_API_KEY
        ? { Authorization: `Bearer ${process.env.SMARTWATER_API_KEY}`, Accept: "application/json" }
        : { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, byDate: parse(await res.json()), detail: "SmartWater API" };
  } catch (e) {
    return { ok: false, byDate: {}, detail: e instanceof Error ? e.message : String(e) };
  }
}

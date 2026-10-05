import type { ISODate } from "../types";
import type { MetaDaily, MetaResult } from "./meta";

/**
 * Windsor.ai — alternative ad-spend source that needs no Meta developer app.
 * The Homefield ad accounts are already connected in Windsor; this just reads
 * the same daily spend + leads through Windsor's REST API.
 *
 * Env:
 *   WINDSOR_API_KEY       from windsor.ai → API Access (requires a paid plan after the trial)
 *   WINDSOR_ACCOUNT_IDS   optional comma-separated ad account ids; defaults to META_AD_ACCOUNT_IDS,
 *                         and to every connected account when neither is set
 */
export function windsorConfigured(): boolean {
  return Boolean(process.env.WINDSOR_API_KEY);
}

type Row = { account_id?: string; date: string; spend?: number | string; actions_lead?: number | string };

export async function fetchWindsorDaily(from: ISODate, to: ISODate): Promise<MetaResult> {
  if (!windsorConfigured()) return { ok: false, byDate: {}, detail: "Windsor not configured" };
  const accounts = (process.env.WINDSOR_ACCOUNT_IDS || process.env.META_AD_ACCOUNT_IDS || "")
    .split(",")
    .map((s) => s.trim().replace(/^act_/, ""))
    .filter(Boolean);
  const params = new URLSearchParams({
    api_key: process.env.WINDSOR_API_KEY!,
    date_from: from,
    date_to: to,
    fields: "account_id,date,spend,actions_lead",
  });
  if (accounts.length) params.set("select_accounts", accounts.join(","));
  try {
    const res = await fetch(`https://connectors.windsor.ai/facebook?${params}`, { cache: "no-store" });
    const json: { data?: Row[]; error?: string; message?: string } = await res.json();
    if (!res.ok || json.error) throw new Error(json.error || json.message || `HTTP ${res.status}`);
    const byDate: MetaDaily = {};
    for (const r of json.data ?? []) {
      const d = String(r.date).slice(0, 10);
      const cur = byDate[d] ?? { spend: 0, leads: 0 };
      cur.spend += Number(r.spend) || 0;
      cur.leads += Number(r.actions_lead) || 0;
      byDate[d] = cur;
    }
    return { ok: true, byDate, detail: accounts.length ? `${accounts.length} ad account${accounts.length === 1 ? "" : "s"} via Windsor` : "all connected accounts via Windsor" };
  } catch (e) {
    return { ok: false, byDate: {}, detail: e instanceof Error ? e.message : String(e) };
  }
}

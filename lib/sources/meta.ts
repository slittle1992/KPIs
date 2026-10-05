import type { ISODate } from "../types";

/**
 * Meta (Facebook/Instagram) Marketing API — daily spend and leads per ad account.
 *
 * Env:
 *   META_ACCESS_TOKEN   long-lived System User token with ads_read
 *   META_AD_ACCOUNT_IDS comma-separated numeric ids (no "act_" prefix needed)
 *   META_API_VERSION    optional, defaults to v21.0
 */
export type MetaDaily = Record<ISODate, { spend: number; leads: number }>;

export type MetaResult = { ok: boolean; byDate: MetaDaily; detail: string };

const LEAD_ACTIONS = ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"];

export function metaConfigured(): boolean {
  return Boolean(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_IDS);
}

export function metaAccountIds(): string[] {
  return (process.env.META_AD_ACCOUNT_IDS || "")
    .split(",")
    .map((s) => s.trim().replace(/^act_/, ""))
    .filter(Boolean);
}

type InsightRow = {
  date_start: string;
  spend?: string;
  actions?: { action_type: string; value: string }[];
};

function leadsFromActions(actions: InsightRow["actions"]): number {
  if (!actions?.length) return 0;
  const map = new Map(actions.map((a) => [a.action_type, Number(a.value) || 0]));
  // "lead" is Meta's rollup (instant forms + pixel leads). Fall back to summing parts.
  if (map.has("lead")) return map.get("lead")!;
  return LEAD_ACTIONS.slice(1).reduce((s, k) => s + (map.get(k) ?? 0), 0);
}

export async function fetchMetaDaily(from: ISODate, to: ISODate): Promise<MetaResult> {
  if (!metaConfigured()) return { ok: false, byDate: {}, detail: "Meta not configured" };
  const token = process.env.META_ACCESS_TOKEN!;
  const version = process.env.META_API_VERSION || "v21.0";
  const byDate: MetaDaily = {};
  const errors: string[] = [];

  for (const id of metaAccountIds()) {
    const params = new URLSearchParams({
      level: "account",
      fields: "spend,actions",
      time_increment: "1",
      time_range: JSON.stringify({ since: from, until: to }),
      action_attribution_windows: JSON.stringify(["7d_click", "1d_view"]),
      limit: "500",
      access_token: token,
    });
    let url: string | null = `https://graph.facebook.com/${version}/act_${id}/insights?${params}`;
    try {
      while (url) {
        const res: Response = await fetch(url, { cache: "no-store" });
        const json: { data?: InsightRow[]; paging?: { next?: string }; error?: { message: string } } =
          await res.json();
        if (!res.ok || json.error) throw new Error(json.error?.message || `HTTP ${res.status}`);
        for (const row of json.data ?? []) {
          const d = row.date_start;
          const cur = byDate[d] ?? { spend: 0, leads: 0 };
          cur.spend += Number(row.spend) || 0;
          cur.leads += leadsFromActions(row.actions);
          byDate[d] = cur;
        }
        url = json.paging?.next ?? null;
      }
    } catch (e) {
      errors.push(`act_${id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const n = metaAccountIds().length;
  if (errors.length === n) return { ok: false, byDate, detail: errors.join("; ") };
  return {
    ok: true,
    byDate,
    detail: errors.length ? `Partial: ${errors.join("; ")}` : `${n} ad account${n === 1 ? "" : "s"}`,
  };
}

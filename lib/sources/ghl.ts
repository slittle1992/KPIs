import type { ISODate } from "../types";
import { toISOInTZ } from "../dates";

/**
 * GoHighLevel (LeadConnector) — leads created per day.
 * Every funnel submission and Meta instant-form lead lands in GHL as a contact,
 * so "contacts created" is the cleanest single definition of a lead.
 *
 * Env:
 *   GHL_API_KEY       Private Integration token (Settings → Private Integrations)
 *                     with contacts.readonly scope
 *   GHL_LOCATION_ID   the sub-account id
 *   GHL_LEAD_TAG      optional — only count contacts carrying this tag
 */
export type GhlResult = { ok: boolean; byDate: Record<ISODate, number>; detail: string };

export function ghlConfigured(): boolean {
  return Boolean(process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID);
}

type Contact = { id: string; dateAdded: string; tags?: string[] };

export async function fetchGhlLeadsDaily(from: ISODate, to: ISODate): Promise<GhlResult> {
  if (!ghlConfigured()) return { ok: false, byDate: {}, detail: "GoHighLevel not configured" };
  const token = process.env.GHL_API_KEY!;
  const locationId = process.env.GHL_LOCATION_ID!;
  const tag = process.env.GHL_LEAD_TAG?.trim().toLowerCase();
  const byDate: Record<ISODate, number> = {};

  // Range in UTC that fully covers the business-day range; days are bucketed in business TZ below.
  const gte = `${from}T00:00:00.000Z`;
  const lte = `${to}T23:59:59.999Z`;

  let page = 1;
  let total = Infinity;
  let seen = 0;
  try {
    while (seen < total && page <= 50) {
      const res = await fetch("https://services.leadconnectorhq.com/contacts/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          locationId,
          page,
          pageLimit: 100,
          filters: [{ field: "dateAdded", operator: "range", value: { gte, lte } }],
          sort: [{ field: "dateAdded", direction: "asc" }],
        }),
        cache: "no-store",
      });
      const json: { contacts?: Contact[]; total?: number; message?: string } = await res.json();
      if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
      const contacts = json.contacts ?? [];
      total = json.total ?? contacts.length;
      if (!contacts.length) break;
      for (const c of contacts) {
        if (tag && !(c.tags ?? []).map((t) => t.toLowerCase()).includes(tag)) continue;
        const d = toISOInTZ(new Date(c.dateAdded));
        if (d < from || d > to) continue;
        byDate[d] = (byDate[d] ?? 0) + 1;
      }
      seen += contacts.length;
      page++;
    }
    return { ok: true, byDate, detail: tag ? `contacts tagged "${tag}"` : "contacts created" };
  } catch (e) {
    return { ok: false, byDate, detail: e instanceof Error ? e.message : String(e) };
  }
}

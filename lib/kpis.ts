import { cached } from "./cache";
import { eachDay, periodKey, periodLabel } from "./dates";
import { getEntries } from "./store";
import { demoDay } from "./sources/demo";
import { fetchGhlLeadsDaily, ghlConfigured } from "./sources/ghl";
import { fetchMetaDaily, metaConfigured } from "./sources/meta";
import { fetchWindsorDaily, windsorConfigured } from "./sources/windsor";
import { fetchSmartwaterDaily, smartwaterConfigured } from "./sources/smartwater";
import type { DayRow, Grouping, ISODate, KpiResponse, PeriodRow, SourceStatus } from "./types";

export const DEMO = process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true";
const TTL = Number(process.env.SOURCE_CACHE_SECONDS || 600) * 1000;

function ratio(num: number, den: number): number | null {
  return den > 0 ? num / den : null;
}

function emptyPeriod(key: string, label: string, from: ISODate, to: ISODate): PeriodRow {
  return {
    key, label, from, to,
    adSpend: 0, leads: 0, appointmentsSet: 0, demos: 0, revenue: 0,
    costPerLead: null, costPerAppointment: null, setRate: null, demoRate: null, adSpendPct: null, revenuePerDemo: null,
  };
}

function finalize(p: PeriodRow): PeriodRow {
  p.costPerLead = ratio(p.adSpend, p.leads);
  p.costPerAppointment = ratio(p.adSpend, p.appointmentsSet);
  p.setRate = ratio(p.appointmentsSet, p.leads);
  p.demoRate = ratio(p.demos, p.appointmentsSet);
  p.adSpendPct = ratio(p.adSpend, p.revenue);
  p.revenuePerDemo = ratio(p.revenue, p.demos);
  return p;
}

/** Ad spend provider: Meta's own API when a token exists, otherwise Windsor.ai. */
function adsProvider(): "meta" | "windsor" | null {
  if (metaConfigured()) return "meta";
  if (windsorConfigured()) return "windsor";
  return null;
}
const ADS_LABEL = { meta: "Meta Ads", windsor: "Meta Ads via Windsor.ai" } as const;

export function rollup(days: DayRow[], grouping: Grouping, from: ISODate, to: ISODate) {
  const map = new Map<string, PeriodRow>();
  for (const d of days) {
    const k = periodKey(d.date, grouping);
    let p = map.get(k);
    if (!p) {
      p = emptyPeriod(k, periodLabel(k, grouping, to), k < from ? from : k, k);
      map.set(k, p);
    }
    p.to = d.date;
    p.adSpend += d.adSpend;
    p.leads += d.leads;
    p.appointmentsSet += d.appointmentsSet;
    p.demos += d.demos;
    p.revenue += d.revenue;
  }
  const periods = [...map.values()].map(finalize);
  const totals = emptyPeriod("total", "Total", from, to);
  for (const p of periods) {
    totals.adSpend += p.adSpend;
    totals.leads += p.leads;
    totals.appointmentsSet += p.appointmentsSet;
    totals.demos += p.demos;
    totals.revenue += p.revenue;
  }
  return { periods, totals: finalize(totals) };
}

export async function getKpis(from: ISODate, to: ISODate, grouping: Grouping, refresh = false): Promise<KpiResponse> {
  const dates = eachDay(from, to);
  const sources: SourceStatus[] = [];

  const [entries, meta, ghl, sw] = await Promise.all([
    getEntries(from, to),
    DEMO || !adsProvider()
      ? null
      : cached(`${adsProvider()}:${from}:${to}`, TTL, () => (adsProvider() === "meta" ? fetchMetaDaily(from, to) : fetchWindsorDaily(from, to)), refresh),
    DEMO || !ghlConfigured() ? null : cached(`ghl:${from}:${to}`, TTL, () => fetchGhlLeadsDaily(from, to), refresh),
    DEMO || !smartwaterConfigured() ? null : cached(`sw:${from}:${to}`, TTL, () => fetchSmartwaterDaily(from, to), refresh),
  ]);

  // --- source statuses -----------------------------------------------------
  if (DEMO) {
    sources.push({ key: "adSpend", label: "Ad spend", provider: "Sample data", mode: "demo" });
    sources.push({ key: "leads", label: "Leads", provider: "Sample data", mode: "demo" });
  } else {
    const prov = adsProvider();
    const adsLabel = prov ? ADS_LABEL[prov] : "Meta Ads";
    sources.push({
      key: "adSpend", label: "Ad spend", provider: adsLabel,
      mode: !prov ? "off" : meta?.ok ? "live" : "error",
      detail: meta?.detail,
    });
    const leadsLive = ghl?.ok ? "GoHighLevel" : meta?.ok ? `${adsLabel} (lead results)` : null;
    sources.push({
      key: "leads", label: "Leads", provider: leadsLive ?? (ghlConfigured() ? "GoHighLevel" : adsLabel),
      mode: leadsLive ? "live" : ghlConfigured() || prov ? "error" : "off",
      detail: ghlConfigured() ? ghl?.detail : meta?.detail,
    });
  }
  sources.push({
    key: "appointments", label: "Appointments set", provider: "Entered by Jared",
    mode: DEMO ? "demo" : "manual",
  });
  sources.push({
    key: "demos", label: "Demos & revenue",
    provider: DEMO ? "Sample data" : sw?.ok ? "SmartWater" : "Entered manually",
    mode: DEMO ? "demo" : sw?.ok ? "live" : smartwaterConfigured() ? "error" : "manual",
    detail: sw?.detail,
  });

  // --- merge per day -------------------------------------------------------
  const days: DayRow[] = dates.map((date) => {
    const e = entries[date];
    if (DEMO) {
      const d = demoDay(date);
      return {
        date,
        adSpend: d.spend,
        leads: d.leads,
        appointmentsSet: e?.appointmentsSet ?? d.appointmentsSet,
        demos: e?.demos ?? d.demos,
        revenue: e?.revenue ?? d.revenue,
        hasEntry: Boolean(e),
      };
    }
    const m = meta?.byDate[date];
    const leads = ghl?.ok ? ghl.byDate[date] ?? 0 : m?.leads ?? 0;
    const s = sw?.ok ? sw.byDate[date] : undefined;
    return {
      date,
      adSpend: m?.spend ?? 0,
      leads,
      appointmentsSet: e?.appointmentsSet ?? 0,
      demos: s ? s.demos : e?.demos ?? 0,
      revenue: s ? s.revenue : e?.revenue ?? 0,
      hasEntry: Boolean(e),
    };
  });

  const { periods, totals } = rollup(days, grouping, from, to);
  return { from, to, grouping, totals, periods, days, sources, generatedAt: new Date().toISOString() };
}

export function toCsv(k: KpiResponse): string {
  const cols = [
    "period", "from", "to", "ad_spend", "leads", "cost_per_lead", "appointments_set", "set_rate",
    "cost_per_appointment", "demos", "demo_rate", "revenue", "ad_spend_pct_of_revenue", "revenue_per_demo",
  ];
  const row = (p: PeriodRow) =>
    [
      p.label, p.from, p.to, p.adSpend.toFixed(2), p.leads, p.costPerLead?.toFixed(2) ?? "",
      p.appointmentsSet, p.setRate?.toFixed(4) ?? "", p.costPerAppointment?.toFixed(2) ?? "", p.demos,
      p.demoRate?.toFixed(4) ?? "", p.revenue.toFixed(2), p.adSpendPct?.toFixed(4) ?? "", p.revenuePerDemo?.toFixed(2) ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  return [cols.join(","), ...k.periods.map(row), row(k.totals)].join("\n");
}

import Link from "next/link";
import { PRESETS, resolveRange, todayISO } from "@/lib/dates";
import { int, money, pct } from "@/lib/format";
import { DEMO, getKpis } from "@/lib/kpis";
import type { Grouping, PeriodRow, SourceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function qs(base: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...patch })) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/?${s}` : "/";
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const today = todayISO();
  const { from, to, preset } = resolveRange({ from: str(sp.from), to: str(sp.to), preset: str(sp.preset) });
  const g = str(sp.group);
  const grouping: Grouping = g === "day" || g === "month" ? g : "week";
  const data = await getKpis(from, to, grouping, str(sp.refresh) === "1");
  const t = data.totals;

  const base = { from: preset ? undefined : from, to: preset ? undefined : to, preset, group: grouping };
  const offSources = data.sources.filter((s) => s.mode === "off" || s.mode === "error");

  return (
    <>
      <h1>Marketing &amp; sales funnel</h1>
      <p className="sub">
        {from === to ? from : `${from} → ${to}`} · grouped by {grouping} · times in Central
      </p>

      {DEMO && (
        <div className="banner warn">
          <b>Sample data.</b> <code>DEMO_MODE</code> is on, so ad spend, leads, demos and revenue are made up.
          Numbers you enter on the “Enter numbers” page still override the sample values for that day.
        </div>
      )}
      {!DEMO && offSources.length > 0 && (
        <div className="banner warn">
          {offSources.map((s) => (
            <div key={s.key}>
              <b>{s.label}:</b> {s.provider} is {s.mode === "off" ? "not configured" : "returning an error"}
              {s.detail ? <> — {s.detail}</> : null}. See the README for the environment variables to set.
            </div>
          ))}
        </div>
      )}

      <div className="filters">
        <div className="chips">
          {PRESETS.map((p) => (
            <Link key={p.id} className={`chip${preset === p.id ? " on" : ""}`} href={qs(base, { preset: p.id, from: undefined, to: undefined })}>
              {p.label}
            </Link>
          ))}
        </div>
        <form method="get" action="/">
          <input type="hidden" name="group" value={grouping} />
          <input type="date" name="from" defaultValue={from} max={today} aria-label="From" />
          <span className="muted">to</span>
          <input type="date" name="to" defaultValue={to} max={today} aria-label="To" />
          <button className="btn" type="submit">Apply</button>
        </form>
        <span className="spacer" />
        <div className="seg" role="group" aria-label="Group by">
          {(["day", "week", "month"] as Grouping[]).map((x) => (
            <Link key={x} className={grouping === x ? "on" : ""} href={qs(base, { group: x })}>
              {x[0].toUpperCase() + x.slice(1)}
            </Link>
          ))}
        </div>
        <a className="btn" href={`/api/kpis?from=${from}&to=${to}&group=${grouping}&format=csv`}>CSV</a>
        <Link className="btn" href={qs(base, { refresh: "1" })} title="Bypass the 10-minute cache">Refresh</Link>
      </div>

      <section className="tiles" aria-label="Totals for the selected range">
        <Tile k="Ad spend" v={money(t.adSpend)} d={`${money(t.costPerLead, true)} per lead`} />
        <Tile k="Leads" v={int(t.leads)} d={`${(t.leads / Math.max(1, data.days.length)).toFixed(1)} per day`} />
        <Tile k="Appointments set" v={int(t.appointmentsSet)} d={`${money(t.costPerAppointment, true)} per appt`} />
        <Tile k="Set rate" v={pct(t.setRate)} d="appointments ÷ leads" />
        <Tile k="Demos run" v={int(t.demos)} d={`${money(t.revenuePerDemo)} revenue per demo`} />
        <Tile k="Demo rate" v={pct(t.demoRate)} d="demos ÷ appointments" />
        <Tile k="Revenue" v={money(t.revenue)} hero />
        <Tile k="Ad spend % of revenue" v={pct(t.adSpendPct)} d={t.adSpendPct ? `${(1 / t.adSpendPct).toFixed(1)}× return on ad spend` : "no revenue yet"} />
      </section>

      <div className="card">
        <header>
          <h2>By {grouping}</h2>
          <span className="muted" style={{ fontSize: 12 }}>
            {data.periods.length} {grouping}
            {data.periods.length === 1 ? "" : "s"} · updated {new Date(data.generatedAt).toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" })} CT
          </span>
        </header>
        <div className="tablewrap">
          <table className="grid">
            <thead>
              <tr className="grp">
                <th />
                <th colSpan={3}>Marketing</th>
                <th colSpan={3}>Setting</th>
                <th colSpan={2}>Demos</th>
                <th colSpan={2}>Revenue</th>
              </tr>
              <tr>
                <th>{grouping === "day" ? "Day" : grouping === "week" ? "Week (Mon–Sun)" : "Month"}</th>
                <th>Ad spend</th>
                <th>Leads</th>
                <th>$ / lead</th>
                <th>Appts set</th>
                <th>Set rate</th>
                <th>$ / appt</th>
                <th>Demos</th>
                <th>Demo rate</th>
                <th>Revenue</th>
                <th>Ad spend %</th>
              </tr>
            </thead>
            <tbody>
              {data.periods.length === 0 && (
                <tr>
                  <td colSpan={11} className="empty">No days in range.</td>
                </tr>
              )}
              {data.periods.map((p) => (
                <Row key={p.key} p={p} />
              ))}
            </tbody>
            <tfoot>
              <Row p={t} />
            </tfoot>
          </table>
        </div>
      </div>

      <div className="sources" aria-label="Data sources">
        {data.sources.map((s) => (
          <Source key={s.key} s={s} />
        ))}
      </div>
    </>
  );
}

function Tile({ k, v, d, hero }: { k: string; v: string; d?: string; hero?: boolean }) {
  return (
    <div className={`tile${hero ? " hero" : ""}`}>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {d && <div className="d">{d}</div>}
    </div>
  );
}

function Row({ p }: { p: PeriodRow }) {
  const zero = (n: number) => (n === 0 ? "muted" : "");
  return (
    <tr>
      <td>{p.label}</td>
      <td className={zero(p.adSpend)}>{money(p.adSpend)}</td>
      <td className={zero(p.leads)}>{int(p.leads)}</td>
      <td className="rate">{money(p.costPerLead, true)}</td>
      <td className={zero(p.appointmentsSet)}>{int(p.appointmentsSet)}</td>
      <td className="rate">{pct(p.setRate)}</td>
      <td className="rate">{money(p.costPerAppointment, true)}</td>
      <td className={zero(p.demos)}>{int(p.demos)}</td>
      <td className="rate">{pct(p.demoRate)}</td>
      <td className={zero(p.revenue)}>{money(p.revenue)}</td>
      <td className="rate">{pct(p.adSpendPct)}</td>
    </tr>
  );
}

const MODE_LABEL: Record<SourceStatus["mode"], string> = {
  live: "live",
  manual: "manual entry",
  demo: "sample",
  off: "not configured",
  error: "error",
};

function Source({ s }: { s: SourceStatus }) {
  return (
    <span className={`src ${s.mode}`} title={s.detail}>
      <i aria-hidden />
      <b>{s.label}</b> {s.provider} · {MODE_LABEL[s.mode]}
    </span>
  );
}

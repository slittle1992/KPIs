"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Entry, ISODate } from "@/lib/types";

type Props = { today: ISODate; manualDemos: boolean };
type Draft = { appointmentsSet: string; demos: string; revenue: string; note: string };

const empty: Draft = { appointmentsSet: "", demos: "", revenue: "", note: "" };
const toDraft = (e?: Entry): Draft => ({
  appointmentsSet: e?.appointmentsSet == null ? "" : String(e.appointmentsSet),
  demos: e?.demos == null ? "" : String(e.demos),
  revenue: e?.revenue == null ? "" : String(e.revenue),
  note: e?.note ?? "",
});

function addDays(iso: ISODate, n: number): ISODate {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const label = (iso: ISODate) => {
  const d = new Date(iso + "T00:00:00Z");
  return `${DOW[d.getUTCDay()]} ${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};

export function EntryForm({ today, manualDemos }: Props) {
  const [date, setDate] = useState<ISODate>(today);
  const [draft, setDraft] = useState<Draft>(empty);
  const [entries, setEntries] = useState<Record<ISODate, Entry>>({});
  const [rows, setRows] = useState<Record<ISODate, Draft>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const from = useMemo(() => addDays(today, -13), [today]);
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, -i)), [today]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/entries?from=${from}&to=${today}`, { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setEntries(json.entries ?? {});
  }, [from, today]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setDraft(toDraft(entries[date]));
  }, [date, entries]);

  useEffect(() => {
    const next: Record<ISODate, Draft> = {};
    for (const d of days) next[d] = toDraft(entries[d]);
    setRows(next);
  }, [entries, days]);

  async function save(items: (Partial<Entry> & { date: ISODate })[]) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: items }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setMsg({ ok: true, text: `Saved ${items.length === 1 ? items[0].date : items.length + " days"}.` });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const fromDraft = (d: ISODate, v: Draft): Partial<Entry> & { date: ISODate } => ({
    date: d,
    appointmentsSet: v.appointmentsSet === "" ? null : Number(v.appointmentsSet),
    ...(manualDemos
      ? {
          demos: v.demos === "" ? null : Number(v.demos),
          revenue: v.revenue === "" ? null : Number(v.revenue.replace(/[$,\s]/g, "")),
        }
      : {}),
    note: v.note,
  });

  const dirtyDays = days.filter((d) => {
    const a = rows[d];
    const b = toDraft(entries[d]);
    return a && (a.appointmentsSet !== b.appointmentsSet || a.demos !== b.demos || a.revenue !== b.revenue);
  });

  return (
    <div className="entry">
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          save([fromDraft(date, draft)]);
        }}
      >
        <label>
          Date
          <input type="date" value={date} max={addDays(today, 1)} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>
          Appointments set
          <input
            type="number" inputMode="numeric" min={0} step={1} placeholder="0"
            value={draft.appointmentsSet}
            onChange={(e) => setDraft({ ...draft, appointmentsSet: e.target.value })}
            autoFocus
          />
          <span className="hint">New appointments booked on this day (not the appointment date).</span>
        </label>
        {manualDemos && (
          <div className="row">
            <label>
              Demos run
              <input type="number" inputMode="numeric" min={0} step={1} placeholder="0" value={draft.demos} onChange={(e) => setDraft({ ...draft, demos: e.target.value })} />
            </label>
            <label>
              Revenue sold
              <input type="text" inputMode="decimal" placeholder="$0" value={draft.revenue} onChange={(e) => setDraft({ ...draft, revenue: e.target.value })} />
            </label>
          </div>
        )}
        <label>
          Note <span className="hint">(optional)</span>
          <input type="text" maxLength={500} placeholder="e.g. 2 reschedules from last week" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        </label>
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : `Save ${label(date)}`}
        </button>
        {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
      </form>

      <div className="card">
        <header>
          <h2>Last 14 days</h2>
          <button className="btn primary" disabled={busy || dirtyDays.length === 0} onClick={() => save(dirtyDays.map((d) => fromDraft(d, rows[d])))}>
            {dirtyDays.length ? `Save ${dirtyDays.length} changed` : "No changes"}
          </button>
        </header>
        <div className="tablewrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Day</th>
                <th>Appts set</th>
                {manualDemos && <th>Demos</th>}
                {manualDemos && <th>Revenue</th>}
                <th style={{ textAlign: "left" }}>Note</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const r = rows[d] ?? empty;
                const base = toDraft(entries[d]);
                const cell = (field: keyof Draft, wide = false, type: "number" | "text" = "number") => (
                  <input
                    className={`cell${wide ? " wide" : ""}${r[field] !== base[field] ? " dirty" : ""}`}
                    type={type} inputMode={type === "number" ? "numeric" : "decimal"} min={0}
                    value={r[field]}
                    onChange={(e) => setRows({ ...rows, [d]: { ...r, [field]: e.target.value } })}
                    aria-label={`${field} for ${d}`}
                  />
                );
                return (
                  <tr key={d}>
                    <td>{label(d)}{d === today ? <span className="muted"> · today</span> : null}</td>
                    <td>{cell("appointmentsSet")}</td>
                    {manualDemos && <td>{cell("demos")}</td>}
                    {manualDemos && <td>{cell("revenue", true, "text")}</td>}
                    <td style={{ textAlign: "left", whiteSpace: "normal", maxWidth: 260 }} className="muted">{entries[d]?.note || ""}</td>
                    <td className="muted">{entries[d]?.updatedAt ? new Date(entries[d].updatedAt!).toLocaleDateString("en-US", { month: "numeric", day: "numeric" }) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

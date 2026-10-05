import { NextResponse, type NextRequest } from "next/server";
import { addDays, isValidISO, todayISO } from "@/lib/dates";
import { getEntries, storeKind, upsertEntry } from "@/lib/store";
import type { Entry } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const today = todayISO();
  const from = isValidISO(sp.get("from")) ? sp.get("from")! : addDays(today, -13);
  const to = isValidISO(sp.get("to")) ? sp.get("to")! : today;
  const entries = await getEntries(from, to);
  return NextResponse.json({ from, to, entries, store: storeKind() });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }
  const list = Array.isArray((body as { entries?: unknown }).entries)
    ? ((body as { entries: unknown[] }).entries as Partial<Entry>[])
    : [body as Partial<Entry>];

  const saved: Entry[] = [];
  for (const item of list) {
    if (!isValidISO(item?.date)) return NextResponse.json({ error: "Each entry needs a valid date" }, { status: 400 });
    if (item.date > addDays(todayISO(), 1)) return NextResponse.json({ error: "Date is in the future" }, { status: 400 });
    saved.push(await upsertEntry({ ...item, date: item.date }));
  }
  return NextResponse.json({ ok: true, entries: saved, store: storeKind() });
}

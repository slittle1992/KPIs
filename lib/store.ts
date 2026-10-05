import { Redis } from "@upstash/redis";
import { promises as fs } from "fs";
import path from "path";
import type { Entry, ISODate } from "./types";

/**
 * Manual entries (appointments set, and demos/revenue while SmartWater is not
 * wired up) live in one Redis hash: field = YYYY-MM-DD, value = JSON Entry.
 *
 * On Vercel: add the Upstash Redis integration (Marketplace) and the env vars
 * are injected automatically. Locally, with no Redis configured, entries fall
 * back to a JSON file in .data/ so the app still runs.
 */
const HASH = process.env.KPI_REDIS_KEY || "kpi:entries";

function redisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const FILE = path.join(process.cwd(), ".data", "entries.json");

async function readFile(): Promise<Record<ISODate, Entry>> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return {};
  }
}

async function writeFile(all: Record<ISODate, Entry>) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(all, null, 2));
}

export function storeKind(): "redis" | "file" {
  return redisClient() ? "redis" : "file";
}

export async function getAllEntries(): Promise<Record<ISODate, Entry>> {
  const r = redisClient();
  if (!r) return readFile();
  const raw = (await r.hgetall<Record<string, Entry | string>>(HASH)) ?? {};
  const out: Record<ISODate, Entry> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = typeof v === "string" ? (JSON.parse(v) as Entry) : v;
  }
  return out;
}

export async function getEntries(from: ISODate, to: ISODate): Promise<Record<ISODate, Entry>> {
  const all = await getAllEntries();
  const out: Record<ISODate, Entry> = {};
  for (const [k, v] of Object.entries(all)) if (k >= from && k <= to) out[k] = v;
  return out;
}

function cleanNumber(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export async function upsertEntry(patch: Partial<Entry> & { date: ISODate }): Promise<Entry> {
  const existing = (await getAllEntries())[patch.date] ?? { date: patch.date };
  const next: Entry = { ...existing, date: patch.date, updatedAt: new Date().toISOString() };
  for (const f of ["appointmentsSet", "demos", "revenue"] as const) {
    const n = cleanNumber(patch[f]);
    if (n !== undefined) next[f] = n;
  }
  if (typeof patch.note === "string") next.note = patch.note.slice(0, 500);

  const r = redisClient();
  if (r) {
    await r.hset(HASH, { [patch.date]: JSON.stringify(next) });
  } else {
    const all = await readFile();
    all[patch.date] = next;
    await writeFile(all);
  }
  return next;
}

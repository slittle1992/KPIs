# Homefield KPIs

A one-page marketing → sales funnel dashboard for Homefield Turf, built to run on Vercel.

| Metric | Where it comes from |
|---|---|
| Ad spend | Meta Marketing API, pulled automatically per ad account per day |
| Leads | GoHighLevel contacts created per day (falls back to Meta "lead" results if GHL isn't configured) |
| Appointments set | Typed in by Jared on the **Enter numbers** page |
| Demos run, Revenue | SmartWater adapter (see below); typed in manually until that API is connected |
| $ / lead, $ / appointment | ad spend ÷ leads, ad spend ÷ appointments |
| Set rate | appointments set ÷ leads |
| Demo rate | demos ÷ appointments set |
| Ad spend % | ad spend ÷ revenue |

The dashboard shows totals for any date range as KPI tiles plus a spreadsheet-style table grouped by day, week (Mon–Sun) or month, with CSV export. All dates are Central time.

## Deploy to Vercel

1. **Import the repo** at vercel.com/new. Framework is auto-detected (Next.js); no build settings to change.
2. **Add Upstash Redis** from the Vercel Marketplace (Storage tab → Upstash → Redis, free tier is plenty). This injects the `UPSTASH_REDIS_REST_*` / `KV_REST_API_*` variables that store Jared's entries.
3. **Set environment variables** (Settings → Environment Variables). Copy from `.env.example`:
   - `APP_PASSWORD` – one shared password for the team.
   - `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_IDS` – see *Meta token* below.
   - `GHL_API_KEY` + `GHL_LOCATION_ID` – see *GoHighLevel* below.
   - Leave `DEMO_MODE` unset (or `0`) in production.
4. **Deploy.** Share the URL with Jared; he uses **Enter numbers** each day.

### Meta token
In Meta Business Settings → Users → System users: create (or pick) a system user, assign it the Homefield ad accounts, then *Generate new token* with the `ads_read` permission and no expiry. Put the token in `META_ACCESS_TOKEN`. Ad account ids go in `META_AD_ACCOUNT_IDS`, comma-separated. Use both Homefield accounts: `1283686466948265,919742090786204` ("Homefield Turf" and "Spencer Homefield"; as of October 2026 all spend is on the second one).

### Option B: Windsor.ai instead of a Meta app
If you'd rather not create a Meta developer app, leave `META_ACCESS_TOKEN` empty and set `WINDSOR_API_KEY` (windsor.ai → API Access). The Homefield ad accounts are already connected there, and the dashboard reads the same daily spend and lead counts through Windsor. Windsor's API needs a paid plan once the trial ends.

### Privacy policy and terms URLs
Meta's app dashboard asks for these when an app is switched to Live. For reading your own ad accounts the app can stay in **Development** mode and the token still works. If the form insists, the dashboard serves public pages at `/privacy` and `/terms`, so use `https://<your-vercel-domain>/privacy` and `https://<your-vercel-domain>/terms`.

### GoHighLevel
In the Homefield sub-account: Settings → Private Integrations → *Create new integration* with the `contacts.readonly` scope. Copy the token into `GHL_API_KEY`, and the sub-account's Location ID (Settings → Business Profile) into `GHL_LOCATION_ID`. A lead is counted on the day the contact was created. Set `GHL_LEAD_TAG` to count only contacts carrying a specific tag.

If GHL isn't configured, leads fall back to Meta's reported lead results, which only count Meta-attributed leads.

### SmartWater (demos + revenue)
`lib/sources/smartwater.ts` is the seam. It expects `GET $SMARTWATER_API_URL?from=YYYY-MM-DD&to=YYYY-MM-DD` with a bearer token, returning `[{ date, demos, revenue }]`. Adjust `parse()` once the real endpoint/shape is known. Until `SMARTWATER_API_URL` is set, the entry page shows Demos and Revenue fields so the numbers can be typed in.

## Local development

```bash
npm install
cp .env.example .env.local   # DEMO_MODE=1 shows sample data, entries save to .data/
npm run dev                  # http://localhost:3000
```

## API

- `GET /api/kpis?from=2026-09-01&to=2026-09-30&group=week` → JSON. Add `&format=csv` for CSV, `&refresh=1` to bypass the 10‑minute source cache. Presets: `?preset=this_week|last_week|this_month|last_month|last_30|last_90`.
- `GET /api/entries?from=&to=` / `POST /api/entries` `{ date, appointmentsSet, demos?, revenue?, note? }` (or `{ entries: [...] }`).

Both require the session cookie when `APP_PASSWORD` is set.

## Layout

```
app/page.tsx            dashboard (server-rendered)
app/input/page.tsx      Jared's entry page
lib/kpis.ts             merges sources → daily rows → period rollups + rates
lib/sources/meta.ts     Meta insights: spend + lead actions per day
lib/sources/ghl.ts      GoHighLevel: contacts created per day
lib/sources/smartwater.ts  demos + revenue adapter (placeholder contract)
lib/store.ts            manual entries in Upstash Redis (file fallback locally)
middleware.ts           shared-password gate
```

import { EntryForm } from "@/components/EntryForm";
import { todayISO } from "@/lib/dates";
import { DEMO } from "@/lib/kpis";
import { smartwaterConfigured } from "@/lib/sources/smartwater";
import { storeKind } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function InputPage() {
  const manualDemos = !smartwaterConfigured() && !DEMO;
  return (
    <>
      <h1>Enter numbers</h1>
      <p className="sub">
        Appointments set per day{manualDemos ? ", plus demos and revenue until SmartWater is connected" : ""}. Saved instantly; the dashboard
        picks it up on the next load.
      </p>
      {storeKind() === "file" && (
        <div className="banner warn">
          Entries are being saved to a local file because no Redis is configured. On Vercel, add the Upstash Redis integration so entries persist.
        </div>
      )}
      <EntryForm today={todayISO()} manualDemos={manualDemos || DEMO} />
    </>
  );
}

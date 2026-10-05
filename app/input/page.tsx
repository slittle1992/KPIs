import { EntryForm } from "@/components/EntryForm";
import { todayISO } from "@/lib/dates";
import { DEMO } from "@/lib/kpis";
import { smartwaterConfigured } from "@/lib/sources/smartwater";
import { redisEnvHints, resolveRedis, storeKind } from "@/lib/store";

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
          <b>Entries are not being saved to Redis.</b> No Redis credentials were found in the environment, so entries go to a local file
          and will not persist on Vercel.{" "}
          {redisEnvHints().length ? (
            <>
              Redis-looking variables present: <code>{redisEnvHints().join(", ")}</code>. If these were just added, redeploy the project so
              they take effect.
            </>
          ) : (
            <>No Redis-related variables are set at all. Connect the Upstash Redis store to this project (Storage tab), make sure it is
            attached to the Production environment, then redeploy.</>
          )}
        </div>
      )}
      {storeKind() === "redis" && process.env.NODE_ENV !== "production" && (
        <div className="banner">Saving to Redis via <code>{resolveRedis()?.via}</code>.</div>
      )}
      <EntryForm today={todayISO()} manualDemos={manualDemos || DEMO} />
    </>
  );
}

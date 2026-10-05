import { NextResponse, type NextRequest } from "next/server";
import { resolveRange } from "@/lib/dates";
import { getKpis, toCsv } from "@/lib/kpis";
import type { Grouping } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const { from, to } = resolveRange({
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    preset: sp.get("preset") ?? undefined,
  });
  const g = sp.get("group");
  const grouping: Grouping = g === "day" || g === "month" ? g : "week";
  const data = await getKpis(from, to, grouping, sp.get("refresh") === "1");

  if (sp.get("format") === "csv") {
    return new NextResponse(toCsv(data), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="homefield-kpis-${from}-to-${to}.csv"`,
      },
    });
  }
  return NextResponse.json(data);
}

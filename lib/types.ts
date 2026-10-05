export type ISODate = string; // YYYY-MM-DD

/** Numbers Jared (or anyone) types in by hand for a single day. */
export type Entry = {
  date: ISODate;
  appointmentsSet?: number | null;
  /** Manual fallbacks, only used while SmartWater is not connected. */
  demos?: number | null;
  revenue?: number | null;
  note?: string;
  updatedAt?: string;
};

export type DayRow = {
  date: ISODate;
  adSpend: number;
  leads: number;
  appointmentsSet: number;
  demos: number;
  revenue: number;
  /** true when at least one manual field exists for the day */
  hasEntry: boolean;
};

export type Grouping = "day" | "week" | "month";

export type PeriodRow = {
  key: string;
  label: string;
  from: ISODate;
  to: ISODate;
  adSpend: number;
  leads: number;
  appointmentsSet: number;
  demos: number;
  revenue: number;
  costPerLead: number | null;
  costPerAppointment: number | null;
  setRate: number | null;
  demoRate: number | null;
  adSpendPct: number | null;
  revenuePerDemo: number | null;
};

export type SourceMode = "live" | "manual" | "demo" | "off" | "error";

export type SourceStatus = {
  key: "adSpend" | "leads" | "appointments" | "demos";
  label: string;
  provider: string;
  mode: SourceMode;
  detail?: string;
};

export type KpiResponse = {
  from: ISODate;
  to: ISODate;
  grouping: Grouping;
  totals: PeriodRow;
  periods: PeriodRow[];
  days: DayRow[];
  sources: SourceStatus[];
  generatedAt: string;
};

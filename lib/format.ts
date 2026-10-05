export const money = (n: number | null | undefined, cents = false) =>
  n == null
    ? "—"
    : n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: cents ? 2 : 0,
        maximumFractionDigits: cents ? 2 : 0,
      });

export const int = (n: number | null | undefined) => (n == null ? "—" : Math.round(n).toLocaleString("en-US"));

export const pct = (n: number | null | undefined, digits = 1) =>
  n == null ? "—" : `${(n * 100).toFixed(digits)}%`;

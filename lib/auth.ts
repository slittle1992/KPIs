export const COOKIE = "kpi_session";

export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

/** Cookie value = sha256(password + salt); works in both Node and Edge runtimes. */
export async function sessionToken(): Promise<string> {
  const data = new TextEncoder().encode(`${process.env.APP_PASSWORD}::${process.env.APP_SESSION_SALT || "homefield"}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

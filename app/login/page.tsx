export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const error = sp.error === "1";
  return (
    <div className="login">
      <div className="brand" style={{ marginBottom: 16 }}>
        <span className="dot" aria-hidden /> Homefield KPIs
      </div>
      <form className="form" method="post" action="/api/login">
        <input type="hidden" name="next" value={next} />
        <label>
          Password
          <input type="password" name="password" autoFocus required autoComplete="current-password" />
        </label>
        {error && <div className="msg err">That password didn’t match.</div>}
        <button className="btn primary" type="submit">Sign in</button>
      </form>
    </div>
  );
}

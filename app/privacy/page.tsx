export const metadata = { title: "Privacy Policy · Homefield KPIs" };

export default function Privacy() {
  return (
    <article className="legal">
      <h1>Privacy Policy</h1>
      <p className="sub">Last updated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

      <h2>What this is</h2>
      <p>
        Homefield KPIs is an internal reporting dashboard operated by Homefield Turf. It is used only by Homefield Turf staff to
        review the company&apos;s own advertising spend, lead counts, appointments, demos and revenue. It is not offered to the public
        and does not sell or share data with third parties.
      </p>

      <h2>Data we access</h2>
      <ul>
        <li>
          <b>Advertising metrics</b> from Meta (Facebook and Instagram) ad accounts owned by Homefield Turf: daily amount spent and
          aggregate lead counts. We request only the <code>ads_read</code> permission. We do not access or store personal information
          about people who see or interact with ads.
        </li>
        <li>
          <b>Lead counts</b> from the company&apos;s own CRM. The dashboard stores only daily totals, never names, phone numbers or
          other contact details.
        </li>
        <li>
          <b>Numbers typed in by staff</b>, such as appointments set per day, with an optional note.
        </li>
      </ul>

      <h2>How data is used and stored</h2>
      <p>
        Data is used solely to calculate and display business performance metrics for Homefield Turf. Daily totals are stored in a
        database hosted on Vercel and Upstash. Access tokens are stored as encrypted environment variables and are never shown in the
        application. The dashboard is password protected.
      </p>

      <h2>Data deletion</h2>
      <p>
        Because we store only aggregate daily totals, no individual user data is held. Stored metrics can be deleted at any time by
        the business owner. Disconnecting the Meta app from Business Settings revokes all access immediately.
      </p>

      <h2>Contact</h2>
      <p>Questions about this policy can be sent to spencer@homefieldoutdoor.com.</p>
    </article>
  );
}

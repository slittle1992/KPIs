export const metadata = { title: "Terms of Service · Homefield KPIs" };

export default function Terms() {
  return (
    <article className="legal">
      <h1>Terms of Service</h1>
      <p className="sub">Last updated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

      <h2>Use of this application</h2>
      <p>
        Homefield KPIs is a private, internal tool for Homefield Turf and its authorized staff. By signing in you agree to use it only
        for Homefield Turf business purposes and to keep the shared password confidential.
      </p>

      <h2>No warranty</h2>
      <p>
        Figures shown are pulled from third-party services (Meta, the company CRM) and from manual entry, and may be delayed or
        incomplete. The application is provided as is, without warranty of any kind, and is not a system of record for accounting.
      </p>

      <h2>Third-party services</h2>
      <p>
        Use of advertising data is also subject to the{" "}
        <a href="https://www.facebook.com/policies_center/" rel="noopener noreferrer">Meta Platform Terms</a>. Homefield Turf is
        responsible for its own compliance with those terms.
      </p>

      <h2>Changes</h2>
      <p>These terms may be updated at any time. Continued use after an update constitutes acceptance.</p>

      <h2>Contact</h2>
      <p>spencer@homefieldoutdoor.com</p>
    </article>
  );
}

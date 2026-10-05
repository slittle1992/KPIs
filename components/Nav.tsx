"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const path = usePathname();
  if (path === "/login") return null;
  const item = (href: string, label: string) => (
    <Link href={href} aria-current={path === href ? "page" : undefined}>
      {label}
    </Link>
  );
  return (
    <div className="top">
      <div className="brand">
        <span className="dot" aria-hidden />
        Homefield KPIs
      </div>
      <nav className="nav">
        {item("/", "Dashboard")}
        {item("/input", "Enter numbers")}
      </nav>
    </div>
  );
}

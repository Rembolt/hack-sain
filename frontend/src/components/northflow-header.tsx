"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNorthFlow } from "@/state/northflow-context";

export function NorthFlowHeader() {
  const pathname = usePathname();
  const { landingHref, dashboardHref } = useNorthFlow();
  const dashboard = pathname === "/dashboard";

  return (
    <header className="site-header">
      <Link className="brand" href={landingHref} aria-label="NorthFlow home">
        <span className="brand-mark"><span>N</span></span>
        <span><strong>NorthFlow</strong><small>Billing reliability</small></span>
      </Link>
      <nav aria-label="Primary navigation">
        <Link className={!dashboard ? "active" : ""} href={landingHref}>Product</Link>
        {!dashboard ? <a href="#solution">How it works</a> : null}
        {!dashboard ? <a href="#case">Complaint trace</a> : null}
        <Link className={dashboard ? "active" : ""} href={dashboardHref}>Impact dashboard</Link>
      </nav>
      <div className="header-status"><span className="live-dot" /> Local prototype · no external model</div>
    </header>
  );
}

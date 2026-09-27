import type { Metadata } from "next";
import Link from "next/link";
import classes from "./landing.module.css";

export const metadata: Metadata = {
  title: { absolute: "NorthFlow" },
};

export default function Home() {
  return (
    <main className={classes.page}>
      <h1 className={classes.name}>
        <svg viewBox="0 0 1000 220" role="img">
          <title>NorthFlow</title>
          <text x="90" y="176" textLength="820" lengthAdjust="spacing">
            NorthFlow
          </text>
        </svg>
      </h1>
      <Link className={classes.start} href="/account/login">
        Start
      </Link>
    </main>
  );
}

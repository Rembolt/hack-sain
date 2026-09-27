import type { Metadata } from "next";
import Link from "next/link";
import { formCatalog } from "@/lib/contract/record-form";
import sheet from "../search/search.module.css";
import classes from "./form.module.css";

export const metadata: Metadata = {
  title: "Forms",
};

export default function FormIndexPage() {
  return (
    <main className={sheet.page}>
      <div className={sheet.column}>
        <p className={classes.back}>
          <Link href="/home">Home</Link>
        </p>
        <article className={sheet.sheet}>
          <h1 className={sheet.bandTitle}>Forms</h1>
          <div className={sheet.pane}>
            {formCatalog.map((entry) => (
              <div className={sheet.cell} key={entry.href}>
                <Link className={classes.entry} href={entry.href}>
                  <span className={sheet.kicker}>{entry.title}</span>
                  <span className={sheet.value}>{entry.blurb}</span>
                </Link>
              </div>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}

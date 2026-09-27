"use client";

import type { Ref } from "react";
import type { IssueIndex } from "@/lib/contract/issue-index";
import classes from "./form.module.css";

export function IssueSummary({
  index,
  shown,
  ref,
}: {
  index: IssueIndex;
  shown: boolean;
  ref?: Ref<HTMLDivElement>;
}) {
  if (!shown || index.count === 0) return null;

  const marked = Object.keys(index.bySlot).length;

  return (
    <div className={classes.summary} role="status" ref={ref}>
      <p className={classes.summaryLine}>
        {index.count === 1 ? "1 warning" : `${index.count} warnings`}
        {marked > 0
          ? ` on ${marked === 1 ? "1 marked field" : `${marked} marked fields`}`
          : null}
      </p>
      {index.general.length > 0 ? (
        <ul className={classes.summaryList}>
          {index.general.map((message, position) => (
            <li key={`${message}-${position}`}>{message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

import type { ReactNode } from "react";

export function SectionHeading({
  step,
  eyebrow,
  title,
  description,
  action,
}: {
  step: string;
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div className="section-number" aria-hidden="true">
        {step}
      </div>
      <div className="section-heading-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? <div className="section-heading-action">{action}</div> : null}
    </div>
  );
}

"use client";

import { useId, type ReactNode } from "react";
import type { FormField } from "@/lib/contract/schema-fields";
import { emptyMessage, patternMessage } from "@/lib/contract/validate";
import sheet from "../search/search.module.css";
import classes from "./form.module.css";

function inputType(field: FormField) {
  switch (field.control.kind) {
    case "date":
    case "nullable-date":
      return "date";
    case "time":
      return "time";
    case "number":
      return "number";
    case "text":
      return field.control.input;
    default:
      return "text";
  }
}

/** Says what is wrong in the field's own terms: an example beats a printed regex. */
function warningsFor(field: FormField, messages: string[]) {
  // "must be empty" is the other half of an either-or, so it is noise beside a real message.
  const useful =
    messages.length > 1 ? messages.filter((message) => message !== emptyMessage) : messages;
  return useful.map((message) =>
    message === patternMessage && field.placeholder
      ? `must look like ${field.placeholder}`
      : message,
  );
}

export function Control({
  field,
  value,
  onChange,
  onTouch,
  messages = [],
  id,
  prominent = false,
}: {
  field: FormField;
  value: string;
  onChange: (value: string) => void;
  onTouch?: () => void;
  messages?: string[];
  id: string;
  prominent?: boolean;
}) {
  const warnId = useId();
  const warnings = warningsFor(field, messages);
  const invalid = warnings.length > 0;

  const notes = invalid ? (
    <ul className={classes.warn} id={warnId}>
      {warnings.map((warning) => (
        <li key={warning}>{warning}</li>
      ))}
    </ul>
  ) : null;

  if (field.control.kind === "const") {
    return (
      <>
        <p className={sheet.kicker}>{field.label}</p>
        <p className={prominent ? `${sheet.value} ${sheet.name}` : sheet.value}>
          {field.control.value}
        </p>
        {notes}
      </>
    );
  }

  const className = prominent ? `${classes.control} ${classes.name}` : classes.control;
  const flags = {
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? warnId : undefined,
    onBlur: onTouch,
  };

  if (field.control.kind === "boolean") {
    return (
      <>
        <p className={classes.check}>
          <input
            {...flags}
            id={id}
            type="checkbox"
            className={classes.box}
            checked={value === "true"}
            onChange={(event) => onChange(String(event.target.checked))}
          />
          <label className={sheet.kicker} htmlFor={id}>
            {field.label}
          </label>
        </p>
        {notes}
      </>
    );
  }

  const shared = {
    ...flags,
    id,
    className,
    value,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
  };

  let editor: ReactNode;
  if (field.control.kind === "select") {
    editor = (
      <select {...shared}>
        <option value="">—</option>
        {field.control.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  } else if (field.control.kind === "textarea") {
    editor = <textarea {...shared} className={`${className} ${classes.area}`} rows={3} />;
  } else {
    editor = (
      <input
        {...shared}
        type={inputType(field)}
        inputMode={field.control.kind === "number" ? "decimal" : undefined}
        step={field.control.kind === "number" ? (field.control.integer ? "1" : "any") : undefined}
        placeholder={field.placeholder}
        autoComplete="off"
      />
    );
  }

  return (
    <>
      <label className={sheet.kicker} htmlFor={id}>
        {field.label}
      </label>
      {editor}
      {notes}
    </>
  );
}

export function FieldCells({
  fields,
  values,
  prefix,
  slotPrefix,
  messagesFor,
  onTouch,
  onChange,
}: {
  fields: FormField[];
  values: Record<string, string>;
  prefix: string;
  slotPrefix?: string;
  messagesFor: (slot: string) => string[];
  onTouch: (slot: string) => void;
  onChange: (id: string, value: string) => void;
}) {
  return (
    <>
      {fields.map((field) => {
        const slot = slotPrefix ? `${slotPrefix}.${field.id}` : field.id;
        return (
          <div className={sheet.cell} data-wide={field.wide ? "true" : undefined} key={field.id}>
            <Control
              field={field}
              id={`${prefix}-${field.id}`}
              value={values[field.id] ?? ""}
              messages={messagesFor(slot)}
              onTouch={() => onTouch(slot)}
              onChange={(value) => onChange(field.id, value)}
            />
          </div>
        );
      })}
    </>
  );
}

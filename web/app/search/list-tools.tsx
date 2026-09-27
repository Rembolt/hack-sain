"use client";

import { months } from "@/lib/list-filter";
import classes from "./search.module.css";

export function ListTools({
  label,
  query,
  year,
  month,
  years,
  onQuery,
  onYear,
  onMonth,
}: {
  label: string;
  query: string;
  year: string;
  month: string;
  years: string[];
  onQuery: (value: string) => void;
  onYear: (value: string) => void;
  onMonth: (value: string) => void;
}) {
  function keepList(event: { key: string; preventDefault: () => void }) {
    if (event.key === "Enter") event.preventDefault();
  }

  return (
    <div className={classes.tools}>
      <input
        type="search"
        value={query}
        placeholder="Search this list"
        aria-label={`Search ${label}`}
        onChange={(event) => onQuery(event.target.value)}
        onKeyDown={keepList}
      />
      <select aria-label={`${label} year`} value={year} onChange={(event) => onYear(event.target.value)}>
        <option value="">All years</option>
        {years.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select
        aria-label={`${label} month`}
        value={month}
        onChange={(event) => onMonth(event.target.value)}
      >
        <option value="">All months</option>
        {months.map(([value, name]) => (
          <option key={value} value={value}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

export const whole = new Intl.NumberFormat("en-CA", {
  maximumFractionDigits: 0,
});

export const oneDecimal = new Intl.NumberFormat("en-CA", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

export const currencyPrecise = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function percent(value: number, fractionDigits = 0) {
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

export function displayNullable(
  value: string | number | null,
  formatter: (value: number) => string = (number) => String(number),
) {
  if (value === null) return "Unresolved";
  return typeof value === "number" ? formatter(value) : value;
}

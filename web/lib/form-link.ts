/**
 * Signed share links for one form. The email stays in the URL; the token
 * stops anyone swapping the email or the form.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { formCatalog } from "./contract/record-form";

export const formSlugs = ["account", "service-visit", "complaint", "file"] as const;
export type FormSlug = (typeof formSlugs)[number];

const LINK_MS = 7 * 24 * 60 * 60 * 1000;

type Ticket = { email: string; form: FormSlug; until: number };

function secret() {
  return process.env.SESSION_SECRET ?? "hack-sain-dev-secret";
}

export function isFormSlug(value: string): value is FormSlug {
  return (formSlugs as readonly string[]).includes(value);
}

export function formHref(slug: FormSlug) {
  return `/form/${slug}`;
}

export function formTitle(slug: FormSlug) {
  const href = formHref(slug);
  return formCatalog.find((entry) => entry.href === href)?.title ?? slug;
}

export function sealFormLink(email: string, form: FormSlug) {
  const ticket: Ticket = {
    email: email.trim().toLowerCase(),
    form,
    until: Date.now() + LINK_MS,
  };
  const body = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  const mark = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mark}`;
}

export function openFormLink(token: string): Ticket | null {
  const [body, mark] = token.split(".");
  if (!body || !mark) return null;

  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const given = Buffer.from(mark);
  const held = Buffer.from(expected);
  if (given.length !== held.length || !timingSafeEqual(given, held)) return null;

  try {
    const ticket = JSON.parse(Buffer.from(body, "base64url").toString()) as Ticket;
    if (typeof ticket.email !== "string" || !isFormSlug(ticket.form)) return null;
    if (typeof ticket.until !== "number" || ticket.until < Date.now()) return null;
    return ticket;
  } catch {
    return null;
  }
}

export function formLinkPath(email: string, form: FormSlug, token: string) {
  const query = new URLSearchParams({
    email: email.trim().toLowerCase(),
    form,
    s: token,
  });
  return `/form-link?${query}`;
}

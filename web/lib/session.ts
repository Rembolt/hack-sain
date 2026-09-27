/**
 * Signed cookies for the admin area.
 *
 * Two of them: the sign-in session, and a short form pass that the form routes
 * ask for again with the admin's own email and password.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { findAdmin, type Admin } from "./admin";

const SESSION_COOKIE = "hack-sain-admin";
const FORM_COOKIE = "hack-sain-form-pass";
const SESSION_MS = 8 * 60 * 60 * 1000;
const FORM_MS = 15 * 60 * 1000;

type Ticket = { email: string; until: number };

function secret() {
  return process.env.SESSION_SECRET ?? "hack-sain-dev-secret";
}

function seal(ticket: Ticket) {
  const body = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  const mark = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mark}`;
}

function open(token: string | undefined): Ticket | null {
  if (!token) return null;
  const [body, mark] = token.split(".");
  if (!body || !mark) return null;

  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const given = Buffer.from(mark);
  const held = Buffer.from(expected);
  if (given.length !== held.length || !timingSafeEqual(given, held)) return null;

  try {
    const ticket = JSON.parse(Buffer.from(body, "base64url").toString()) as Ticket;
    if (typeof ticket.email !== "string" || typeof ticket.until !== "number") return null;
    if (ticket.until < Date.now()) return null;
    return ticket;
  } catch {
    return null;
  }
}

async function put(name: string, email: string, life: number) {
  const until = Date.now() + life;
  const jar = await cookies();
  jar.set(name, seal({ email: email.toLowerCase(), until }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(until),
    path: "/",
  });
}

export async function startSession(email: string) {
  await put(SESSION_COOKIE, email, SESSION_MS);
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(FORM_COOKIE);
}

/** The signed-in admin, read back from the directory so settings edits show at once. */
export async function readAdmin(): Promise<Admin | null> {
  const jar = await cookies();
  const ticket = open(jar.get(SESSION_COOKIE)?.value);
  return ticket ? findAdmin(ticket.email) : null;
}

export async function passForm(email: string) {
  await put(FORM_COOKIE, email, FORM_MS);
}

export async function formPassed(email: string) {
  const jar = await cookies();
  const ticket = open(jar.get(FORM_COOKIE)?.value);
  return ticket?.email === email.toLowerCase();
}

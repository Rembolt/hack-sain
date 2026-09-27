/**
 * The admin directory. Held in memory for the demo, so a server restart puts
 * the seed admin back and drops any edits made in settings.
 */
import { createHash, timingSafeEqual } from "node:crypto";
// --- DELETE AFTER TEST ---
import { TEST_USER } from "./test-user";
// --- END DELETE AFTER TEST ---

export type Admin = {
  name: string;
  email: string;
  title: string;
  phone: string;
};

type Entry = Admin & { passwordHash: string };

function hash(password: string) {
  return createHash("sha256").update(password).digest();
}

function seed() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@northwind.ca").toLowerCase();
  const entry: Entry = {
    name: process.env.ADMIN_NAME ?? "Admin",
    email,
    title: "Service desk admin",
    phone: "",
    passwordHash: hash(process.env.ADMIN_PASSWORD ?? "northwind").toString("hex"),
  };
  const directory = new Map<string, Entry>([[email, entry]]);

  // --- DELETE AFTER TEST -------------------------------------------------
  directory.set(TEST_USER.email, {
    name: TEST_USER.name,
    email: TEST_USER.email,
    title: TEST_USER.title,
    phone: TEST_USER.phone,
    passwordHash: hash(TEST_USER.password).toString("hex"),
  });
  // --- END DELETE AFTER TEST ---------------------------------------------

  return directory;
}

const store = globalThis as typeof globalThis & { hackSainAdmins?: Map<string, Entry> };
const admins = (store.hackSainAdmins ??= seed());

// --- DELETE AFTER TEST -------------------------------------------------
if (!admins.has(TEST_USER.email)) {
  admins.set(TEST_USER.email, {
    name: TEST_USER.name,
    email: TEST_USER.email,
    title: TEST_USER.title,
    phone: TEST_USER.phone,
    passwordHash: hash(TEST_USER.password).toString("hex"),
  });
}
// --- END DELETE AFTER TEST ---------------------------------------------

function publicFields({ name, email, title, phone }: Entry): Admin {
  return { name, email, title, phone };
}

export function findAdmin(email: string): Admin | null {
  const entry = admins.get(email.trim().toLowerCase());
  return entry ? publicFields(entry) : null;
}

export function checkPassword(email: string, password: string): Admin | null {
  const entry = admins.get(email.trim().toLowerCase());
  if (!entry) return null;

  const held = Buffer.from(entry.passwordHash, "hex");
  const given = hash(password);
  if (held.length !== given.length || !timingSafeEqual(held, given)) return null;

  return publicFields(entry);
}

/** Applies a settings change. Renaming the email moves the directory entry. */
export function saveAdmin(email: string, patch: Partial<Admin>): Admin | null {
  const key = email.trim().toLowerCase();
  const entry = admins.get(key);
  if (!entry) return null;

  const nextEmail = (patch.email ?? entry.email).trim().toLowerCase();
  if (nextEmail !== key && admins.has(nextEmail)) return null;

  const updated: Entry = {
    ...entry,
    name: patch.name?.trim() || entry.name,
    title: patch.title?.trim() ?? entry.title,
    phone: patch.phone?.trim() ?? entry.phone,
    email: nextEmail,
  };

  admins.delete(key);
  admins.set(nextEmail, updated);
  return publicFields(updated);
}

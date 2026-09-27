/**
 * Admin directory. Accounts live in the unified database.
 * Passwords are checked there and are not kept in this process.
 */
import { unifiedFetch } from "./unified-client";

export type Admin = {
  name: string;
  email: string;
  title: string;
  phone: string;
};

function asAdmin(body: unknown): Admin | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const email = typeof record.email === "string" ? record.email : "";
  if (!email) return null;
  return {
    name: typeof record.name === "string" && record.name ? record.name : email,
    email,
    title: typeof record.title === "string" ? record.title : "",
    phone: typeof record.phone === "string" ? record.phone : "",
  };
}

export async function findAdmin(email: string): Promise<Admin | null> {
  const response = await unifiedFetch(
    `/authorization/${encodeURIComponent(email.trim().toLowerCase())}`,
  );
  if (!response.ok) return null;
  try {
    return asAdmin(await response.json());
  } catch {
    return null;
  }
}

export async function checkPassword(email: string, password: string): Promise<Admin | null> {
  const response = await unifiedFetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: email.trim().toLowerCase(), password }),
  });
  if (!response.ok) return null;
  try {
    const body = (await response.json()) as { is_admin?: boolean };
    if (body.is_admin !== true) return null;
    return asAdmin(body);
  } catch {
    return null;
  }
}

/** Applies a settings change. Renaming the email moves the directory entry. */
export async function saveAdmin(email: string, patch: Partial<Admin>): Promise<Admin | null> {
  const response = await unifiedFetch(
    `/authorization/${encodeURIComponent(email.trim().toLowerCase())}/profile`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: patch.name ?? "",
        email: patch.email ?? email,
        title: patch.title ?? "",
        phone: patch.phone ?? "",
      }),
    },
  );
  if (!response.ok) return null;
  try {
    return asAdmin(await response.json());
  } catch {
    return null;
  }
}

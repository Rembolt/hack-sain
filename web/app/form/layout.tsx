import { redirect } from "next/navigation";
import { formPassed, readAdmin } from "@/lib/session";
// --- DELETE AFTER TEST ---
import { isTestUser } from "@/lib/test-user";
// --- END DELETE AFTER TEST ---

export default async function FormLayout({ children }: LayoutProps<"/form">) {
  const admin = await readAdmin();
  if (!admin) redirect("/account/login");
  // --- DELETE AFTER TEST ---
  if (isTestUser(admin.email)) return children;
  // --- END DELETE AFTER TEST ---
  if (!(await formPassed(admin.email))) redirect("/home?open=form");
  return children;
}

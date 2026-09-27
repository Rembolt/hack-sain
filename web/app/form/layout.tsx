import { redirect } from "next/navigation";
import { formPassed, readAdmin } from "@/lib/session";

export default async function FormLayout({ children }: LayoutProps<"/form">) {
  const admin = await readAdmin();
  if (!admin) redirect("/account/login");
  if (!(await formPassed(admin.email))) redirect("/home?open=form");
  return children;
}

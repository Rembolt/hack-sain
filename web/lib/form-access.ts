import { redirect } from "next/navigation";
import { formHref, type FormSlug } from "./form-link";
import { formGrant, readAdmin } from "./session";

/** Full form access, or the single form a share link opened. */
export async function guardForm(slug: FormSlug | null) {
  const admin = await readAdmin();
  if (!admin) redirect("/account/login");
  const grant = await formGrant(admin.email);
  if (!grant) redirect("/home?open=form");
  if (grant !== "*" && grant !== slug) redirect(formHref(grant));
  return grant;
}

export function formBack(grant: "*" | FormSlug) {
  return grant === "*"
    ? { href: "/form", label: "All forms" }
    : { href: "/home", label: "Home" };
}

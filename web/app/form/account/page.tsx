import type { Metadata } from "next";
import { formBack, guardForm } from "@/lib/form-access";
import { FormDesk } from "./form-desk";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function AccountFormPage() {
  const back = formBack(await guardForm("account"));
  return <FormDesk backHref={back.href} backLabel={back.label} />;
}

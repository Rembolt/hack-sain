import type { Metadata } from "next";
import { formBack, guardForm } from "@/lib/form-access";
import { RecordDesk } from "../record-desk";

export const metadata: Metadata = {
  title: "Service visit",
};

export default async function ServiceVisitFormPage() {
  const back = formBack(await guardForm("service-visit"));
  return <RecordDesk slug="service-visit" backHref={back.href} backLabel={back.label} />;
}

import type { Metadata } from "next";
import { formBack, guardForm } from "@/lib/form-access";
import { RecordDesk } from "../record-desk";

export const metadata: Metadata = {
  title: "Complaint",
};

export default async function ComplaintFormPage() {
  const back = formBack(await guardForm("complaint"));
  return <RecordDesk slug="complaint" backHref={back.href} backLabel={back.label} />;
}

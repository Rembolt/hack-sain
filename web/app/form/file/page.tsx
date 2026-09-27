import type { Metadata } from "next";
import { formBack, guardForm } from "@/lib/form-access";
import { RecordDesk } from "../record-desk";

export const metadata: Metadata = {
  title: "File record",
};

export default async function FileFormPage() {
  const back = formBack(await guardForm("file"));
  return <RecordDesk slug="file" backHref={back.href} backLabel={back.label} />;
}

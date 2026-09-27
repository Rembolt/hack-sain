import type { Metadata } from "next";
import { RecordDesk } from "../record-desk";

export const metadata: Metadata = {
  title: "Service visit",
};

export default function ServiceVisitFormPage() {
  return <RecordDesk slug="service-visit" />;
}

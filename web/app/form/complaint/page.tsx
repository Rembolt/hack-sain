import type { Metadata } from "next";
import { RecordDesk } from "../record-desk";

export const metadata: Metadata = {
  title: "Complaint",
};

export default function ComplaintFormPage() {
  return <RecordDesk slug="complaint" />;
}

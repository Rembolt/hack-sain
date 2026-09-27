import type { Metadata } from "next";
import { RecordDesk } from "../record-desk";

export const metadata: Metadata = {
  title: "File record",
};

export default function FileFormPage() {
  return <RecordDesk slug="file" />;
}

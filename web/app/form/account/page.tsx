import type { Metadata } from "next";
import { FormDesk } from "./form-desk";

export const metadata: Metadata = {
  title: "Create account",
};

export default function AccountFormPage() {
  return <FormDesk />;
}

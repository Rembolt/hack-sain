import type { Metadata } from "next";
import { formTitle, isFormSlug, openFormLink } from "@/lib/form-link";
import { FormLinkDesk } from "./desk";
import login from "../account/login/login.module.css";

export const metadata: Metadata = {
  title: "Form link",
};

export default async function FormLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; form?: string; s?: string }>;
}) {
  const { email = "", form = "", s = "" } = await searchParams;
  const ticket = openFormLink(s);
  const given = email.trim().toLowerCase();
  const valid = Boolean(ticket && ticket.email === given && ticket.form === form && isFormSlug(form));

  if (!valid || !ticket) {
    return (
      <main className={login.page}>
        <div className={login.card}>
          <h1>Form link</h1>
          <p>This link is not valid.</p>
        </div>
      </main>
    );
  }

  return <FormLinkDesk email={ticket.email} form={ticket.form} token={s} title={formTitle(ticket.form)} />;
}

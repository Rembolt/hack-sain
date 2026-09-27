import { checkPassword } from "@/lib/admin";
import { formHref, isFormSlug, openFormLink } from "@/lib/form-link";
import { stringFields } from "@/lib/post-body";
import { passForm, startSession } from "@/lib/session";

export async function POST(request: Request) {
  const { email, password, form, s } = await stringFields(request, [
    "email",
    "password",
    "form",
    "s",
  ]);

  const ticket = openFormLink(s);
  const givenEmail = email.trim().toLowerCase();
  if (!ticket || ticket.email !== givenEmail || ticket.form !== form || !isFormSlug(form)) {
    return Response.json({ message: "This link is not valid." }, { status: 403 });
  }

  if (!(await checkPassword(ticket.email, password))) {
    return Response.json({ message: "Those credentials were not accepted." }, { status: 401 });
  }

  await startSession(ticket.email);
  await passForm(ticket.email, ticket.form);
  return Response.json({ href: formHref(ticket.form) });
}

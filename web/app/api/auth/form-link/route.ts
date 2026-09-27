import { findAdmin } from "@/lib/admin";
import { formLinkPath, isFormSlug, sealFormLink } from "@/lib/form-link";
import { stringFields } from "@/lib/post-body";
import { readAdmin } from "@/lib/session";

export async function POST(request: Request) {
  const admin = await readAdmin();
  if (!admin) {
    return Response.json({ message: "Not signed in." }, { status: 401 });
  }

  const { email, form } = await stringFields(request, ["email", "form"]);
  const target = email.trim().toLowerCase();
  if (!findAdmin(target)) {
    return Response.json({ message: "That email is not in the directory." }, { status: 404 });
  }
  if (!isFormSlug(form)) {
    return Response.json({ message: "Pick a form." }, { status: 400 });
  }

  const token = sealFormLink(target, form);
  return Response.json({
    path: formLinkPath(target, form, token),
    email: target,
    form,
  });
}

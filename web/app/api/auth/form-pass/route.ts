/** Re-checks the signed-in admin's own credentials before the forms open. */
import { checkPassword } from "@/lib/admin";
import { stringFields } from "@/lib/post-body";
import { passForm, readAdmin } from "@/lib/session";

export async function POST(request: Request) {
  const admin = await readAdmin();
  if (!admin) {
    return Response.json({ message: "Not signed in." }, { status: 401 });
  }

  const { email, password } = await stringFields(request, ["email", "password"]);
  if (email.trim().toLowerCase() !== admin.email) {
    return Response.json({ message: "Sign in with the account you are using." }, { status: 403 });
  }

  if (!checkPassword(admin.email, password)) {
    return Response.json({ message: "Those credentials were not accepted." }, { status: 401 });
  }

  await passForm(admin.email);
  return Response.json({ passed: true });
}

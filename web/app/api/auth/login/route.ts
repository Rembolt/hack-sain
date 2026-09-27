import { checkPassword } from "@/lib/admin";
import { stringFields } from "@/lib/post-body";
import { startSession } from "@/lib/session";

export async function POST(request: Request) {
  const { email, password } = await stringFields(request, ["email", "password"]);

  const admin = checkPassword(email, password);
  if (!admin) {
    return Response.json({ message: "Those credentials were not accepted." }, { status: 401 });
  }

  await startSession(admin.email);
  return Response.json({ admin });
}

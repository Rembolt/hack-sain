import { saveAdmin } from "@/lib/admin";
import { stringFields } from "@/lib/post-body";
import { readAdmin, startSession } from "@/lib/session";

export async function GET() {
  const admin = await readAdmin();
  if (!admin) {
    return Response.json({ message: "Not signed in." }, { status: 401 });
  }

  return Response.json({ admin });
}

export async function PATCH(request: Request) {
  const admin = await readAdmin();
  if (!admin) {
    return Response.json({ message: "Not signed in." }, { status: 401 });
  }

  const patch = await stringFields(request, ["name", "email", "title", "phone"]);
  if (!patch.name.trim()) {
    return Response.json({ message: "A name is needed." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email.trim())) {
    return Response.json({ message: "That email does not look right." }, { status: 400 });
  }

  const saved = saveAdmin(admin.email, patch);
  if (!saved) {
    return Response.json({ message: "That email is already in use." }, { status: 409 });
  }

  if (saved.email !== admin.email) {
    await startSession(saved.email);
  }

  return Response.json({ admin: saved });
}

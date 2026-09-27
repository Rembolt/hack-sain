import { apiNames } from "@/lib/rest";

export function GET() {
  return Response.json({ ok: true, apis: apiNames });
}

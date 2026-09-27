import { temporaryAccountPreview } from "@/lib/temporary-account-preview";

export async function GET(
  _request: Request,
  context: { params: Promise<{ accountId: string }> },
) {
  const { accountId } = await context.params;
  const account = temporaryAccountPreview(accountId);
  if (!account) {
    return Response.json({ message: "No account with that id." }, { status: 404 });
  }

  return Response.json(account);
}

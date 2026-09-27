import { unifiedFetch } from "@/lib/unified-client";

export async function GET(
  _request: Request,
  context: { params: Promise<{ accountId: string }> },
) {
  const { accountId } = await context.params;
  const response = await unifiedFetch(`/accounts/${encodeURIComponent(accountId)}`);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = { message: "Unified database is not reachable." };
  }

  return Response.json(body, { status: response.status });
}

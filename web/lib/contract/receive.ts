import { issuesFor, type ContractKind } from "./validate";

/** Reads a posted record and answers with the schema errors, or with valid. */
export async function receiveRecord(request: Request, kind: ContractKind) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { errors: [{ path: "", message: "Request body must be JSON." }] },
      { status: 400 },
    );
  }

  const errors = issuesFor(kind, body);
  if (errors.length > 0) {
    return Response.json({ errors }, { status: 400 });
  }

  return Response.json({ valid: true });
}

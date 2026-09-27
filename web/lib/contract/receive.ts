import { formGrant, readAdmin } from "@/lib/session";
import { unifiedFetch } from "@/lib/unified-client";
import { issuesFor, type ContractKind } from "./validate";

const unifiedPath: Record<ContractKind, string> = {
  account: "/accounts",
  complaint: "/complaints",
  file: "/files",
  "service-visit": "/service-visits",
};

function failureMessage(body: unknown) {
  if (!body || typeof body !== "object") return "The record was not saved.";
  if ("message" in body && typeof body.message === "string") return body.message;
  if ("detail" in body && typeof body.detail === "string") return body.detail;
  return "The record was not saved.";
}

/** Reads a posted record, checks the schema, and stores it in the unified database. */
export async function receiveRecord(request: Request, kind: ContractKind) {
  const admin = await readAdmin();
  if (!admin) {
    return Response.json({ message: "Not signed in." }, { status: 401 });
  }
  const grant = await formGrant(admin.email);
  if (!grant || (grant !== "*" && grant !== kind)) {
    return Response.json({ message: "This form is not open." }, { status: 403 });
  }

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

  const saved = await unifiedFetch(unifiedPath[kind], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!saved.ok) {
    let payload: unknown = null;
    try {
      payload = await saved.json();
    } catch {
      payload = null;
    }
    return Response.json({ message: failureMessage(payload) }, { status: saved.status });
  }

  return Response.json({ valid: true });
}

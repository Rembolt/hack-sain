import { receiveRecord } from "@/lib/contract/receive";

export async function POST(request: Request) {
  return receiveRecord(request, "complaint");
}

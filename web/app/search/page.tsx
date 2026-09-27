import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readAdmin } from "@/lib/session";
import { SearchDesk } from "./search-desk";

export const metadata: Metadata = {
  title: "Search",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string }>;
}) {
  if (!(await readAdmin())) redirect("/account/login");
  const { accountId } = await searchParams;
  return <SearchDesk initialId={accountId} />;
}

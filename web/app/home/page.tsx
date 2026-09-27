import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readAdmin } from "@/lib/session";
import { AdminDesk } from "./desk";

export const metadata: Metadata = {
  title: "Home",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  const admin = await readAdmin();
  if (!admin) redirect("/account/login");

  const { open } = await searchParams;
  return <AdminDesk admin={admin} openForm={open === "form"} />;
}

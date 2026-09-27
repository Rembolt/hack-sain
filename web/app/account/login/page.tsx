import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readAdmin } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  if (await readAdmin()) redirect("/home");
  return <LoginForm />;
}

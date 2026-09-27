import { redirect } from "next/navigation";
import Link from "next/link";
import { Brand } from "./brand";
import { readAdmin } from "@/lib/session";

export default async function Home() {
  if (await readAdmin()) redirect("/home");

  return (
    <main className="home">
      <div className="home-lead">
        <Brand kind="lockup" size={56} href={null} className="brand-lockup" />
        <h1>hack-sain</h1>
      </div>
      <p>
        <Link href="/account/login">Sign in</Link>
      </p>
    </main>
  );
}

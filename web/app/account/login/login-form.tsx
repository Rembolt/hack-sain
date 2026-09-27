"use client";

import { Alert, Button, PasswordInput, TextInput } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Brand } from "@/app/brand";
import { apiUrl } from "@/lib/api-url";
import classes from "./login.module.css";

const loginUrl = apiUrl("/auth/login");

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch(loginUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError("Sign-in failed. Check the company email and password.");
        return;
      }

      router.push("/home");
    } catch {
      setError("Could not reach the sign-in service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={classes.page}>
      <form className={classes.card} onSubmit={onSubmit}>
        <div className={classes.lead}>
          <Brand kind="mark" size={36} href={null} />
          <h1>Sign in</h1>
        </div>
        <TextInput
          label="Company email"
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
        />
        <PasswordInput
          label="Password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        {error ? (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        ) : null}
        <Button type="submit" loading={pending}>
          Sign in
        </Button>
      </form>
    </main>
  );
}

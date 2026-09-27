"use client";

import { Alert, Button, PasswordInput, TextInput } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiUrl } from "@/lib/api-url";
import type { FormSlug } from "@/lib/form-link";
import login from "../account/login/login.module.css";

const openUrl = apiUrl("/auth/form-link/open");

export function FormLinkDesk({
  email,
  form,
  token,
  title,
}: {
  email: string;
  form: FormSlug;
  token: string;
  title: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch(openUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password, form, s: token }),
      });

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const message =
          body &&
          typeof body === "object" &&
          "message" in body &&
          typeof body.message === "string"
            ? body.message
            : "Sign-in failed.";
        setError(message);
        return;
      }

      const href =
        body && typeof body === "object" && "href" in body && typeof body.href === "string"
          ? body.href
          : null;
      if (!href) {
        setError("The form could not be opened.");
        return;
      }

      router.push(href);
    } catch {
      setError("Could not reach the sign-in service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={login.page}>
      <form className={login.card} onSubmit={onSubmit}>
        <h1>Sign in</h1>
        <p>Open {title} with this email.</p>
        <TextInput
          label="Company email"
          type="email"
          name="email"
          autoComplete="username"
          readOnly
          value={email}
        />
        <PasswordInput
          label="Password"
          name="password"
          autoComplete="current-password"
          required
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        {error ? (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        ) : null}
        <Button type="submit" loading={pending}>
          Open form
        </Button>
      </form>
    </main>
  );
}

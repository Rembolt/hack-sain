"use client";

import { Alert, Button, PasswordInput, TextInput } from "@mantine/core";
import { useEffect, useState, type FormEvent } from "react";
import { apiUrl } from "@/lib/api-url";
import login from "../account/login/login.module.css";
import classes from "./home.module.css";

const passUrl = apiUrl("/auth/form-pass");

export function FormGate({
  email,
  onClose,
}: {
  email: string;
  onClose: () => void;
}) {
  const [givenEmail, setGivenEmail] = useState(email);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch(passUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: givenEmail, password }),
      });

      if (!response.ok) {
        setError("Those credentials were not accepted.");
        return;
      }

      window.location.assign("/form");
    } catch {
      setError("Could not reach the sign-in service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={classes.veil} onClick={onClose}>
      <form
        className={login.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-gate-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <h1 id="form-gate-title">Sign in</h1>
        <TextInput
          label="Company email"
          type="email"
          name="email"
          autoComplete="username"
          required
          autoFocus
          value={givenEmail}
          onChange={(event) => setGivenEmail(event.currentTarget.value)}
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
          Open forms
        </Button>
      </form>
    </div>
  );
}

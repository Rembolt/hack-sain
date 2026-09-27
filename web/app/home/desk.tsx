"use client";

import { Alert, Button, NativeSelect, TextInput } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiUrl } from "@/lib/api-url";
import type { Admin } from "@/lib/admin";
import { formCatalog } from "@/lib/contract/record-form";
import { formSlugs, isFormSlug, type FormSlug } from "@/lib/form-link";
// --- DELETE AFTER TEST ---
import { isTestUser } from "@/lib/test-user";
// --- END DELETE AFTER TEST ---
import { Brand } from "@/app/brand";
import { FormGate } from "./form-gate";
import classes from "./home.module.css";

const sessionUrl = apiUrl("/auth/session");
const logoutUrl = apiUrl("/auth/logout");
const formLinkUrl = apiUrl("/auth/form-link");

function slugFromHref(href: string): FormSlug {
  const slug = href.replace(/^\/form\//, "");
  return (formSlugs as readonly string[]).includes(slug) ? (slug as FormSlug) : "account";
}

export function AdminDesk({ admin, openForm = false }: { admin: Admin; openForm?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(admin.name);
  const [email, setEmail] = useState(admin.email);
  const [title, setTitle] = useState(admin.title);
  const [phone, setPhone] = useState(admin.phone);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState(admin.email);
  const [shareForm, setShareForm] = useState<FormSlug>("account");
  const [shareLink, setShareLink] = useState("");
  const [shareNotice, setShareNotice] = useState("");
  const [sharePending, setSharePending] = useState(false);
  const [wantGate, setWantGate] = useState(false);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const gate = openForm || wantGate;

  function closeGate() {
    setWantGate(false);
    if (openForm) router.replace("/home");
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setPending(true);

    try {
      const response = await fetch(sessionUrl, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ name, email, title, phone }),
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
            : "The change was not saved.";
        setNotice(message);
        return;
      }

      const saved =
        body && typeof body === "object" && "admin" in body
          ? (body.admin as Admin)
          : null;
      if (!saved) {
        setNotice("The change was not saved.");
        return;
      }

      setName(saved.name);
      setEmail(saved.email);
      setTitle(saved.title);
      setPhone(saved.phone);
      setNotice("Saved.");
    } catch {
      setNotice("Could not reach the account service.");
    } finally {
      setPending(false);
    }
  }

  async function onShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShareNotice("");
    setShareLink("");
    setSharePending(true);

    try {
      const response = await fetch(formLinkUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: shareEmail, form: shareForm }),
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
            : "The link was not created.";
        setShareNotice(message);
        return;
      }

      const path =
        body && typeof body === "object" && "path" in body && typeof body.path === "string"
          ? body.path
          : "";
      if (!path) {
        setShareNotice("The link was not created.");
        return;
      }

      const url = new URL(path, window.location.origin).toString();
      setShareLink(url);
      try {
        await navigator.clipboard.writeText(url);
        setShareNotice("Copied.");
      } catch {
        setShareNotice("Link ready. Copy it from below.");
      }
    } catch {
      setShareNotice("Could not reach the link service.");
    } finally {
      setSharePending(false);
    }
  }

  async function onSignOut() {
    try {
      await fetch(logoutUrl, { method: "POST", credentials: "include" });
    } catch {
      // Still leave the desk; the session cookie may already be gone.
    }
    router.push("/account/login");
    router.refresh();
  }

  return (
    <main className={classes.page}>
      <div className={classes.column}>
        <div className={classes.helloRow}>
          <Brand kind="mark" size={28} href={null} />
          <h1 className={classes.hello}>Hi {name}</h1>
        </div>
        <div className={classes.menu}>
          <button
            type="button"
            className={classes.option}
            onClick={() => {
              // --- DELETE AFTER TEST: skip the form login popup ---
              if (isTestUser(email)) {
                router.push("/form");
                return;
              }
              // --- END DELETE AFTER TEST ---
              setWantGate(true);
            }}
          >
            Create form
          </button>

          <button
            type="button"
            className={classes.option}
            aria-expanded={shareOpen}
            onClick={() => {
              setShareNotice("");
              setShareOpen((open) => !open);
            }}
          >
            Share form link
          </button>
          {shareOpen ? (
            <form className={classes.panel} aria-label="Share a form link" onSubmit={onShare}>
              <div className={classes.fields}>
                <TextInput
                  label="Email"
                  type="email"
                  name="shareEmail"
                  autoComplete="off"
                  required
                  value={shareEmail}
                  onChange={(event) => setShareEmail(event.currentTarget.value)}
                />
                <NativeSelect
                  label="Form"
                  name="form"
                  value={shareForm}
                  data={formCatalog.map((entry) => ({
                    value: slugFromHref(entry.href),
                    label: entry.title,
                  }))}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    if (isFormSlug(value)) setShareForm(value);
                  }}
                />
              </div>
              {shareLink ? <p className={classes.link}>{shareLink}</p> : null}
              {shareNotice ? (
                <Alert color={shareNotice === "Copied." ? "teal" : "red"} role="status">
                  {shareNotice}
                </Alert>
              ) : null}
              <div className={classes.actions}>
                <Button type="submit" loading={sharePending}>
                  Create link
                </Button>
              </div>
            </form>
          ) : null}

          <button type="button" className={classes.option} onClick={() => router.push("/search")}>
            Search
          </button>

          <button
            type="button"
            className={classes.option}
            aria-expanded={settingsOpen}
            onClick={() => {
              setNotice("");
              setSettingsOpen((open) => !open);
            }}
          >
            Settings
          </button>
          {settingsOpen ? (
            <form className={classes.panel} aria-label="Admin settings" onSubmit={onSave}>
              <div className={classes.fields}>
                <TextInput
                  label="Name"
                  name="name"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.currentTarget.value)}
                />
                <TextInput
                  label="Email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                />
                <TextInput
                  label="Title"
                  name="title"
                  value={title}
                  onChange={(event) => setTitle(event.currentTarget.value)}
                />
                <TextInput
                  label="Phone"
                  name="phone"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.currentTarget.value)}
                />
              </div>
              {notice ? (
                <Alert color={notice === "Saved." ? "teal" : "red"} role="status">
                  {notice}
                </Alert>
              ) : null}
              <div className={classes.actions}>
                <Button type="button" onClick={onSignOut}>
                  Sign out
                </Button>
                <Button type="submit" loading={pending}>
                  Save
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
      {gate ? <FormGate email={email} onClose={closeGate} /> : null}
    </main>
  );
}

"use client";

import { ShieldIcon } from "@/components/icons";

export function LoadingState() {
  return (
    <main className="boot-state" aria-busy="true">
      <div className="brand-mark"><span>N</span></div>
      <p className="eyebrow">NorthFlow</p>
      <h1>Connecting observed evidence…</h1>
      <div className="boot-progress"><span /></div>
    </main>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <main className="boot-state error-state">
      <ShieldIcon />
      <p className="eyebrow">Data contract error</p>
      <h1>NorthFlow could not load verified data.</h1>
      <p>{message}</p>
      <button type="button" className="button-primary" onClick={() => window.location.reload()}>Try again</button>
    </main>
  );
}

"use client";

const storageKey = "hack-sain-scheme";
const lightBg = "#ffffff";
const darkBg = "#2e3438";

function apply(next: "dark" | "light") {
  const root = document.documentElement;
  if (next === "dark") root.dataset.scheme = "dark";
  else delete root.dataset.scheme;
  localStorage.setItem(storageKey, next);
}

function prefersReduce() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function wipeFallback(next: "dark" | "light", done: () => void) {
  const sheet = document.createElement("div");
  sheet.className = "scheme-curtain";
  sheet.dataset.to = next;
  sheet.style.background = next === "dark" ? darkBg : lightBg;
  document.body.appendChild(sheet);

  const finish = () => {
    sheet.remove();
    done();
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      sheet.classList.add("scheme-curtain-on");
    });
  });

  sheet.addEventListener(
    "transitionend",
    () => {
      apply(next);
      finish();
    },
    { once: true },
  );
}

export function SchemeSwitch() {
  function toggle() {
    const root = document.documentElement;
    if (root.classList.contains("scheme-wipe")) return;

    const next = root.dataset.scheme === "dark" ? "light" : "dark";
    if (prefersReduce()) {
      apply(next);
      return;
    }

    const run = () => apply(next);
    const view = document.startViewTransition?.bind(document);

    if (view) {
      root.classList.add("scheme-wipe");
      const transition = view(run);
      void transition.finished.finally(() => root.classList.remove("scheme-wipe"));
      return;
    }

    root.classList.add("scheme-wipe");
    wipeFallback(next, () => root.classList.remove("scheme-wipe"));
  }

  return (
    <button type="button" className="scheme-switch" onClick={toggle}>
      <span className="when-light">Dark</span>
      <span className="when-dark">Light</span>
    </button>
  );
}

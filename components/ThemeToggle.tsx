"use client";

// Manual light/dark toggle. The active theme is applied pre-paint by the inline
// script in app/layout.tsx (no flash); this button just flips the `.dark` class,
// persists the choice, and keeps the browser theme-color meta in sync.
// Icons are swapped purely via the `dark:` CSS variant — no React state, so the
// rendered markup matches on server and client regardless of the active theme.
export default function ThemeToggle() {
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", next ? "#1b1916" : "#F0EEE9");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="라이트/다크 모드 전환"
      title="라이트/다크 모드 전환"
      className="grid h-[1.875rem] w-[1.875rem] shrink-0 place-items-center rounded-full border border-line bg-card text-muted transition-colors active:bg-canvas"
    >
      <span className="text-sm leading-none dark:hidden" aria-hidden>
        🌙
      </span>
      <span className="hidden text-sm leading-none dark:inline" aria-hidden>
        ☀️
      </span>
    </button>
  );
}

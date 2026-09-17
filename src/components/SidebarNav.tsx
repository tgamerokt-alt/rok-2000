"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Locale } from "@/lib/i18n/dictionaries";
import { Theme } from "@/lib/theme";

const COLLAPSE_STORAGE_KEY = "rok_sidebar_collapsed";

export type IconName = "home" | "kingdom" | "compare" | "list" | "formula" | "layers";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

function Icon({ name, className }: { name: IconName; className?: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9" />
        </svg>
      );
    case "kingdom":
      return (
        <svg {...common}>
          <path d="M4 20V10l3 2 5-4 5 4 3-2v10z" />
          <path d="M4 20h16" />
        </svg>
      );
    case "compare":
      return (
        <svg {...common}>
          <path d="M7 4v16" />
          <path d="M17 4v16" />
          <path d="M4 8h6M14 8h6" />
          <path d="M4 16h6M14 16h6" />
        </svg>
      );
    case "list":
      return (
        <svg {...common}>
          <path d="M8 6h12M8 12h12M8 18h12" />
          <path d="M4 6h.01M4 12h.01M4 18h.01" />
        </svg>
      );
    case "formula":
      return (
        <svg {...common}>
          <path d="M6 4h12M6 20h12" />
          <path d="M6 4l6 8-6 8M18 4l-6 8 6 8" />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <path d="M12 3 3 8l9 5 9-5-9-5Z" />
          <path d="m3 13 9 5 9-5" />
        </svg>
      );
  }
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function ChevronIcon({ flipped, className }: { flipped?: boolean; className?: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ transform: flipped ? "rotate(180deg)" : undefined }}
    >
      <path d="M14 6l-6 6 6 6" />
    </svg>
  );
}

export default function SidebarNav({
  siteTitle,
  publicItems,
  adminItems,
  adminSectionLabel,
  logoutLabel,
  toggleLabel,
  collapseLabel,
  expandLabel,
  isAdmin,
  locale,
  theme,
  lightModeLabel,
  darkModeLabel,
  logoutAction,
  setLocaleAction,
  setThemeAction,
}: {
  siteTitle: string;
  publicItems: NavItem[];
  adminItems: NavItem[];
  adminSectionLabel: string;
  logoutLabel: string;
  toggleLabel: string;
  collapseLabel: string;
  expandLabel: string;
  isAdmin: boolean;
  locale: Locale;
  theme: Theme;
  lightModeLabel: string;
  darkModeLabel: string;
  logoutAction: () => void;
  setLocaleAction: (locale: string) => void;
  setThemeAction: (theme: string) => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const inAdminSection = pathname.startsWith("/admin");

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
    } catch {
      // localStorage unavailable (private mode, etc.) — just stay expanded
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore — nothing to persist to
      }
      return next;
    });
  }

  function isActive(href: string) {
    // "/" and "/admin" are section indexes, not parents of their siblings —
    // "/admin/formula" must not also light up the "/admin" link.
    if (href === "/" || href === "/admin") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function linkClass(active: boolean, isCollapsed: boolean) {
    return `group flex items-center gap-3 rounded-lg py-2.5 text-sm transition ${
      isCollapsed ? "justify-center px-2" : "px-3"
    } ${
      active
        ? "bg-amber-500 font-semibold text-slate-950 shadow-sm shadow-amber-500/30"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white"
    }`;
  }

  function iconClass(active: boolean) {
    return active
      ? "text-slate-950"
      : "text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400";
  }

  function renderNavContent(isCollapsed: boolean, showCollapseToggle: boolean) {
    return (
      <div className="flex h-full flex-col">
        <div
          className={`flex items-center gap-2 border-b border-slate-200 py-5 dark:border-slate-800/80 ${
            isCollapsed ? "flex-col px-2" : "px-5"
          }`}
        >
          <div className={`flex min-w-0 items-center gap-2 ${isCollapsed ? "" : "flex-1"}`}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Icon name="kingdom" />
            </span>
            {!isCollapsed && (
              <span className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white">
                {siteTitle}
              </span>
            )}
          </div>
          {showCollapseToggle && (
            <button
              onClick={toggleCollapsed}
              aria-label={collapsed ? expandLabel : collapseLabel}
              title={collapsed ? expandLabel : collapseLabel}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-amber-600 dark:hover:bg-slate-800/80 dark:hover:text-amber-400 ${
                isCollapsed ? "mt-1" : ""
              }`}
            >
              <ChevronIcon flipped={collapsed} />
            </button>
          )}
        </div>

        {!isCollapsed && (
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800/80">
            <div className="flex flex-1 gap-1 rounded-full border border-slate-300 bg-slate-100 p-1 text-xs dark:border-slate-700 dark:bg-slate-950/60">
              <button
                onClick={() => setLocaleAction("en")}
                className={`flex-1 rounded-full px-2.5 py-1.5 font-semibold transition ${
                  locale === "en"
                    ? "bg-amber-500 text-slate-950"
                    : "text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLocaleAction("th")}
                className={`flex-1 rounded-full px-2.5 py-1.5 font-semibold transition ${
                  locale === "th"
                    ? "bg-amber-500 text-slate-950"
                    : "text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400"
                }`}
              >
                ไทย
              </button>
            </div>
            <button
              onClick={() => setThemeAction(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? lightModeLabel : darkModeLabel}
              title={theme === "dark" ? lightModeLabel : darkModeLabel}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition hover:border-amber-500 hover:text-amber-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-amber-400 dark:hover:text-amber-400"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        )}

        <div className={`flex flex-1 flex-col gap-6 overflow-y-auto py-5 ${isCollapsed ? "px-2" : "px-3"}`}>
          {!inAdminSection && (
            <nav className="flex flex-col gap-1">
              {publicItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    onClick={() => setOpen(false)}
                    className={linkClass(active, isCollapsed)}
                  >
                    <Icon name={item.icon} className={iconClass(active)} />
                    {!isCollapsed && item.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {isAdmin && (
            <nav className="flex flex-col gap-1">
              {!isCollapsed && (
                <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {adminSectionLabel}
                </div>
              )}
              {adminItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    onClick={() => setOpen(false)}
                    className={linkClass(active, isCollapsed)}
                  >
                    <Icon name={item.icon} className={iconClass(active)} />
                    {!isCollapsed && item.label}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="flex-1" />
        </div>

        {isAdmin && (
          <div className={`border-t border-slate-200 py-4 dark:border-slate-800/80 ${isCollapsed ? "px-2" : "px-3"}`}>
            <form action={logoutAction}>
              <button
                type="submit"
                title={isCollapsed ? logoutLabel : undefined}
                className={`group flex w-full items-center gap-3 rounded-lg py-2.5 text-left text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-400 ${
                  isCollapsed ? "justify-center px-2" : "px-3"
                }`}
              >
                <LogoutIcon className="shrink-0 text-slate-500 group-hover:text-red-400" />
                {!isCollapsed && logoutLabel}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Icon name="kingdom" />
          </span>
          <span className="text-base font-bold text-slate-900 dark:text-white">{siteTitle}</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label={toggleLabel}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Spacer reserves the sidebar's width in the flex layout — the actual <aside> below is
       * `fixed`, so it's pinned to the viewport (always visible top-to-bottom) instead of
       * relying on `sticky`, which can detach/unstick oddly on very tall pages. */}
      <div
        aria-hidden
        className={`hidden shrink-0 transition-[width] duration-200 md:block ${
          collapsed ? "md:w-[68px]" : "md:w-64"
        }`}
      />
      <aside
        className={`hidden shrink-0 border-r border-slate-200 bg-white shadow-[8px_0_24px_-12px_rgba(0,0,0,0.08)] transition-[width] duration-200 dark:border-slate-700/60 dark:bg-slate-900 dark:shadow-[8px_0_24px_-12px_rgba(0,0,0,0.7)] md:fixed md:top-0 md:left-0 md:z-10 md:block md:h-screen ${
          collapsed ? "md:w-[68px]" : "md:w-64"
        }`}
      >
        {renderNavContent(collapsed, true)}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl dark:bg-slate-900">
            {renderNavContent(false, false)}
          </aside>
        </div>
      )}
    </>
  );
}

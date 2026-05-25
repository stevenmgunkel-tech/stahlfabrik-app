"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/arbeitszeiten", label: "Arbeitszeiten" },
    { href: "/urlaub", label: "Urlaub / Krank" },
    { href: "/mitarbeiter", label: "Mitarbeiter" },
    { href: "/chef-dashboard", label: "Chef Dashboard" },
  ];

  return (
    <div className="min-h-screen bg-zinc-100">
      {/* MOBILE HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 md:hidden">
        <Link
          href="/"
          className="text-lg font-extrabold text-zinc-900"
        >
          StahlFabrik
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="w-auto rounded-xl bg-zinc-900 px-4 py-2 text-white"
        >
          ☰
        </button>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 bg-zinc-900 text-white md:block">
        <div className="border-b border-zinc-700 p-5 text-2xl font-extrabold">
          StahlFabrik
        </div>

        <nav className="flex flex-col gap-2 p-4">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-4 py-3 transition ${
                  active
                    ? "bg-white text-zinc-900"
                    : "hover:bg-zinc-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="fixed inset-0 z-[999] md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/50"
          />

          <aside className="absolute left-0 top-0 h-full w-[85%] max-w-xs bg-zinc-900 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-700 p-5">
              <div className="text-xl font-extrabold">
                StahlFabrik
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="w-auto rounded-xl bg-zinc-800 px-3 py-2"
              >
                ✕
              </button>
            </div>

            <nav className="flex flex-col gap-2 p-4">
              {navItems.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-xl px-4 py-3 transition ${
                      active
                        ? "bg-white text-zinc-900"
                        : "hover:bg-zinc-800"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* CONTENT */}
      <main className="pt-16 md:ml-64 md:pt-0">
        <div className="w-full overflow-x-hidden p-3 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
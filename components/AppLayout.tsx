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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/arbeitszeiten", label: "Arbeitszeiten" },
    { href: "/urlaub", label: "Urlaub / Krank" },
    { href: "/mitarbeiter", label: "Mitarbeiter" },
    { href: "/chef-dashboard", label: "Chef Dashboard" },
    { href: "/projekte", label: "Projekte" },
  ];

  return (
    <div className="min-h-screen bg-zinc-100">
      {/* MOBILE HEADER */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center border-b border-zinc-200 bg-white px-5 md:hidden">
        {/* LOGO */}
        <Link
          href="/"
          className="text-[30px] font-black tracking-tight text-zinc-900"
        >
          Stahl
          <span className="text-orange-500">
            Fabrik
          </span>
        </Link>

        {/* MENU BUTTON */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl bg-black text-[22px] font-bold text-white shadow-lg transition active:scale-95"
        >
          ☰
        </button>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 bg-zinc-950 text-white md:block">
        <div className="border-b border-zinc-800 p-5">
          <Link
            href="/"
            className="text-3xl font-black tracking-tight"
          >
            Stahl
            <span className="text-orange-500">
              Fabrik
            </span>
          </Link>
        </div>

        <nav className="flex flex-col gap-2 p-4">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-4 py-3 text-base font-bold transition ${
                  active
                    ? "bg-white text-zinc-950"
                    : "text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[999] md:hidden">
          {/* OVERLAY */}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/60"
          />

          {/* SIDEBAR */}
          <aside className="absolute left-0 top-0 h-full w-[82%] max-w-xs bg-zinc-950 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 p-5">
              <div className="text-2xl font-black">
                Stahl
                <span className="text-orange-500">
                  Fabrik
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-white"
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
                    onClick={() => setSidebarOpen(false)}
                    className={`rounded-xl px-4 py-4 text-lg font-bold transition ${
                      active
                        ? "bg-white text-zinc-950"
                        : "bg-zinc-900 text-white"
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
        <div className="w-full overflow-x-hidden p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
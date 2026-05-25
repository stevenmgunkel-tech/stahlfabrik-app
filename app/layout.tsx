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
    {
      href: "/",
      label: "Dashboard",
      icon: "▦",
    },
    {
      href: "/arbeitszeiten",
      label: "Arbeitszeiten",
      icon: "◷",
    },
    {
      href: "/urlaub",
      label: "Urlaub / Krank",
      icon: "▣",
    },
    {
      href: "/mitarbeiter",
      label: "Mitarbeiter",
      icon: "👥",
    },
    {
      href: "/chef-dashboard",
      label: "Chef Dashboard",
      icon: "▥",
    },
    {
      href: "/projekte",
      label: "Projekte",
      icon: "▤",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-100">
      {/* MOBILE HEADER */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 md:hidden">
        <Link href="/" className="block">
          <div className="flex items-center gap-2">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 via-orange-600 to-orange-800 text-xl font-black text-black shadow-lg shadow-orange-500/40">
              SF
              <span className="absolute -right-1 -top-2 text-sm">
                🔥
              </span>
            </div>

            <div className="text-2xl font-black leading-none">
              <span className="text-zinc-900">Stahl</span>
              <span className="text-orange-500">Fabrik</span>
            </div>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="w-auto rounded-2xl bg-zinc-950 px-10 py-3 text-xl text-white shadow-lg"
        >
          ☰
        </button>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="fixed left-0 top-0 hidden h-screen w-80 overflow-y-auto bg-gradient-to-b from-black via-zinc-950 to-black text-white md:block">
        {/* LOGO */}
        <div className="border-b border-zinc-800 p-5">
          <Link href="/" className="block">
            <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 p-5 shadow-2xl shadow-orange-500/20">
              <div className="flex items-center gap-4">
                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-300 via-orange-500 to-orange-800 text-5xl font-black text-black shadow-2xl shadow-orange-500/40">
                  SF

                  <span className="absolute -right-3 -top-4 text-4xl">
                    🔥
                  </span>
                </div>

                <div>
                  <div className="text-5xl font-black leading-none tracking-tight">
                    <span className="bg-gradient-to-b from-zinc-100 to-zinc-500 bg-clip-text text-transparent">
                      Stahl
                    </span>

                    <span className="bg-gradient-to-b from-orange-300 via-orange-500 to-orange-800 bg-clip-text text-transparent">
                      Fabrik
                    </span>
                  </div>

                  <div className="mt-3 text-xs font-black uppercase tracking-[0.4em] text-orange-400">
                    🔥 Industrial ERP
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* NAVIGATION */}
        <nav className="flex flex-col gap-4 p-4">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-5 rounded-3xl px-5 py-5 text-xl font-bold transition-all duration-300 ${
                  active
                    ? "border border-orange-400 bg-white text-zinc-950 shadow-2xl shadow-orange-500/20"
                    : "border border-transparent text-zinc-200 hover:border-orange-500/30 hover:bg-zinc-900 hover:text-orange-400"
                }`}
              >
                <span
                  className={`text-3xl transition ${
                    active
                      ? "scale-110"
                      : "group-hover:scale-110"
                  }`}
                >
                  {item.icon}
                </span>

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
            className="absolute inset-0 bg-black/70"
          />

          <aside className="absolute left-0 top-0 h-full w-[88%] max-w-sm bg-gradient-to-b from-black via-zinc-950 to-black text-white shadow-2xl">
            {/* MOBILE LOGO */}
            <div className="border-b border-zinc-800 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 via-orange-600 to-orange-800 text-2xl font-black text-black shadow-xl shadow-orange-500/40">
                    SF

                    <span className="absolute -right-2 -top-2 text-xl">
                      🔥
                    </span>
                  </div>

                  <div>
                    <div className="text-3xl font-black leading-none">
                      <span className="text-zinc-100">
                        Stahl
                      </span>

                      <span className="text-orange-500">
                        Fabrik
                      </span>
                    </div>

                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.3em] text-orange-400">
                      Industrial ERP
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="w-auto rounded-xl bg-zinc-800 px-4 py-2 text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* MOBILE NAV */}
            <nav className="flex flex-col gap-3 p-4">
              {navItems.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-4 rounded-2xl px-4 py-4 text-lg font-bold transition ${
                      active
                        ? "bg-white text-zinc-950"
                        : "bg-zinc-900 text-white"
                    }`}
                  >
                    <span className="text-2xl">
                      {item.icon}
                    </span>

                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* CONTENT */}
      <main className="pt-20 md:ml-80 md:pt-0">
        <div className="w-full overflow-x-hidden p-3 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
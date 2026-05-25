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
    { href: "/", label: "Dashboard", icon: "▦" },
    { href: "/arbeitszeiten", label: "Arbeitszeiten", icon: "◷" },
    { href: "/urlaub", label: "Urlaub / Krank", icon: "▣" },
    { href: "/mitarbeiter", label: "Mitarbeiter", icon: "👥" },
    { href: "/chef-dashboard", label: "Chef Dashboard", icon: "▥" },
    { href: "/projekte", label: "Projekte", icon: "▤" },
  ];

  return (
    <div className="min-h-screen bg-zinc-100">
      {/* MOBILE HEADER */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 md:hidden">
        <Link href="/" className="text-2xl font-black text-zinc-900">
          Stahl<span className="text-orange-500">Fabrik</span>
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="w-auto rounded-2xl bg-zinc-950 px-10 py-3 text-xl text-white"
        >
          ☰
        </button>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="fixed left-0 top-0 hidden h-screen w-72 bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white md:block">
        {/* LOGO */}
        <div className="border-b border-zinc-800 p-5">
          <Link href="/" className="block">
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-xl bg-orange-500 px-3 py-2 text-3xl font-black text-zinc-950 shadow-lg shadow-orange-500/30">
                SF
              </div>

              <div className="text-3xl font-black leading-none">
                <span className="text-zinc-200">Stahl</span>
                <span className="text-orange-500">Fabrik</span>
              </div>
            </div>

            <div className="text-xs font-bold uppercase tracking-[0.25em] text-orange-400">
              🔥 Swiss ERP
            </div>
          </Link>
        </div>

        {/* NAV */}
        <nav className="flex flex-col gap-3 p-4">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 rounded-2xl px-4 py-4 text-lg font-bold transition ${
                  active
                    ? "border border-orange-500 bg-white text-zinc-950 shadow-lg shadow-orange-500/20"
                    : "text-zinc-200 hover:bg-zinc-800 hover:text-orange-400"
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
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
            className="absolute inset-0 bg-black/60"
          />

          <aside className="absolute left-0 top-0 h-full w-[85%] max-w-xs bg-zinc-950 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 p-5">
              <div className="text-2xl font-black">
                Stahl<span className="text-orange-500">Fabrik</span> 🔥
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="w-auto rounded-xl bg-zinc-800 px-3 py-2"
              >
                ✕
              </button>
            </div>

            <nav className="flex flex-col gap-3 p-4">
              {navItems.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-4 rounded-2xl px-4 py-4 font-bold ${
                      active
                        ? "bg-white text-zinc-950"
                        : "bg-zinc-900 text-white"
                    }`}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* CONTENT */}
      <main className="pt-20 md:ml-72 md:pt-0">
        <div className="w-full overflow-x-hidden p-3 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
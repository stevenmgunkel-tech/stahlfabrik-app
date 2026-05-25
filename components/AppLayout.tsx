"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");

  const isLoginPage = pathname === "/login";
  const isAdmin = userRole === "Admin";

  const navItems = isAdmin
    ? [
        { href: "/", label: "Dashboard" },
        { href: "/arbeitszeiten", label: "Arbeitszeiten" },
        { href: "/urlaub", label: "Urlaub / Krank" },
        { href: "/monatsansicht", label: "Monatsansicht" },
        { href: "/resturlaub", label: "Resturlaub" },
        { href: "/mitarbeiter", label: "Mitarbeiter" },
        { href: "/chef-dashboard", label: "Chef Dashboard" },
        { href: "/projekte", label: "Projekte" },
        { href: "/admin", label: "Admin" },
      ]
    : [
        { href: "/", label: "Dashboard" },
        { href: "/arbeitszeiten", label: "Arbeitszeiten" },
        { href: "/urlaub", label: "Urlaub / Krank" },
        { href: "/monatsansicht", label: "Monatsansicht" },
        { href: "/resturlaub", label: "Resturlaub" },
      ];

  useEffect(() => {
    async function ladeUser() {
      const userData = await supabase.auth.getUser();
      const user = userData.data.user;

      if (!user) return;

      const { data } = await supabase
        .from("mitarbeiter")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setUserName(data.name || user.email || "");
        setUserRole(data.rolle || "");
      }
    }

    ladeUser();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-100 via-zinc-100 to-orange-50">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-100 via-zinc-100 to-orange-50">
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center border-b border-zinc-200 bg-white/95 px-5 backdrop-blur md:hidden">
        <Link
          href="/"
          className="text-[30px] font-black tracking-tight text-zinc-900"
        >
          Stahl
          <span className="text-orange-500">
            Fabrik
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-orange-400 text-[22px] font-bold text-white shadow-lg shadow-orange-500/30"
        >
          ☰
        </button>
      </header>

      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-orange-500/20 bg-gradient-to-b from-zinc-950 via-black to-zinc-900 text-white shadow-2xl md:flex">
        <div className="border-b border-zinc-800 bg-black/40 p-6">
          <Link
            href="/"
            className="flex flex-col"
          >
            <span className="text-[34px] font-black tracking-tight text-white">
              Stahl
              <span className="text-orange-500">
                Fabrik
              </span>
            </span>

            <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-500">
              Swiss ERP System
            </span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-3 p-4">
          {navItems.map((item) => {
            const active =
              pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative overflow-hidden rounded-2xl border px-4 py-3 text-base font-bold transition-all duration-200 ${
                  active
                    ? "border-orange-500 bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg shadow-orange-500/20"
                    : "border-transparent text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-800 p-4">
          <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-br from-zinc-900 to-black p-5 shadow-xl">
            <p className="text-sm font-bold text-white">
              {userName || "Angemeldet"}
            </p>

            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-orange-400">
              {userRole || "Benutzer"}
            </p>

            <button
              type="button"
              onClick={logout}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.02]"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-[999] md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <aside className="absolute left-0 top-0 flex h-full w-[82%] max-w-xs flex-col border-r border-orange-500/20 bg-gradient-to-b from-zinc-950 via-black to-zinc-900 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 p-5">
              <div className="flex flex-col">
                <span className="text-3xl font-black">
                  Stahl
                  <span className="text-orange-500">
                    Fabrik
                  </span>
                </span>

                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                  Swiss ERP System
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSidebarOpen(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-white"
              >
                ✕
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-3 p-4">
              {navItems.map((item) => {
                const active =
                  pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() =>
                      setSidebarOpen(false)
                    }
                    className={`rounded-2xl border px-4 py-4 text-lg font-bold transition ${
                      active
                        ? "border-orange-500 bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg shadow-orange-500/20"
                        : "border-transparent bg-zinc-900 text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-zinc-800 p-4">
              <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-br from-zinc-900 to-black p-5 shadow-xl">
                <p className="text-sm font-bold text-white">
                  {userName || "Angemeldet"}
                </p>

                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-orange-400">
                  {userRole || "Benutzer"}
                </p>

                <button
                  type="button"
                  onClick={logout}
                  className="mt-4 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20"
                >
                  Logout
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <main className="pt-16 md:ml-64 md:pt-0">
        <div className="w-full overflow-x-hidden p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
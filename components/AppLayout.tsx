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

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/arbeitszeiten", label: "Arbeitszeiten" },
    { href: "/urlaub", label: "Urlaub / Krank" },
    { href: "/mitarbeiter", label: "Mitarbeiter" },
    { href: "/chef-dashboard", label: "Chef Dashboard" },
    { href: "/projekte", label: "Projekte" },
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

  return (
    <div className="min-h-screen bg-zinc-100">
      {/* MOBILE HEADER */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center border-b border-zinc-200 bg-white px-5 md:hidden">
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
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl bg-black text-[22px] font-bold text-white shadow-lg transition active:scale-95"
        >
          ☰
        </button>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col bg-zinc-950 text-white md:flex">
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

        <nav className="flex flex-1 flex-col gap-2 p-4">
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

        <div className="border-t border-zinc-800 p-4">
          <div className="rounded-2xl bg-zinc-900 p-4">
            <p className="text-sm font-bold text-white">
              {userName || "Angemeldet"}
            </p>

            <p className="mt-1 text-xs font-semibold text-orange-400">
              {userRole || "Benutzer"}
            </p>

            <button
              type="button"
              onClick={logout}
              className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-bold text-zinc-950 transition hover:bg-orange-500 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[999] md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/60"
          />

          <aside className="absolute left-0 top-0 flex h-full w-[82%] max-w-xs flex-col bg-zinc-950 text-white shadow-2xl">
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

            <nav className="flex flex-1 flex-col gap-2 p-4">
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

            <div className="border-t border-zinc-800 p-4">
              <div className="rounded-2xl bg-zinc-900 p-4">
                <p className="text-sm font-bold text-white">
                  {userName || "Angemeldet"}
                </p>

                <p className="mt-1 text-xs font-semibold text-orange-400">
                  {userRole || "Benutzer"}
                </p>

                <button
                  type="button"
                  onClick={logout}
                  className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-bold text-zinc-950"
                >
                  Logout
                </button>
              </div>
            </div>
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
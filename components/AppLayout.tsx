"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const navItems = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/arbeitszeiten", label: "Arbeitszeiten", icon: "◷" },
  { href: "/chef-dashboard", label: "Chef Dashboard", icon: "◆" },
  { href: "/abwesenheiten", label: "Abwesenheiten", icon: "◈" },
  { href: "/mitarbeiter", label: "Mitarbeiter", icon: "◇" },
  { href: "/projekte", label: "Projekte", icon: "▣" },
  { href: "/projektanalyse", label: "Projektanalyse", icon: "◫" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState("StahlFabrik");
  const [role, setRole] = useState("ERP");

  const isLogin = pathname === "/login";

  useEffect(() => {
    async function loadUser() {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        if (!isLogin) router.push("/login");
        return;
      }

      const { data: mitarbeiter } = await supabase
        .from("mitarbeiter")
        .select("name, rolle")
        .eq("user_id", authData.user.id)
        .single();

      if (mitarbeiter) {
        setUserName(mitarbeiter.name || "StahlFabrik");
        setRole(mitarbeiter.rolle || "ERP");
      }
    }

    loadUser();
  }, [pathname, router, isLogin]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (isLogin) return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <BrandLogo small />

        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white"
        >
          Menü
        </button>
      </header>

      {/* Mobile Sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          <aside className="fixed bottom-0 left-0 top-0 h-screen w-[280px] bg-white shadow-xl">
            <Sidebar
              pathname={pathname}
              logout={logout}
              userName={userName}
              role={role}
              close={() => setOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[280px] border-r border-slate-200 bg-white lg:block">
        <Sidebar pathname={pathname} logout={logout} userName={userName} role={role} />
      </aside>

      {/* Main */}
      <main className="pt-16 lg:ml-[280px] lg:pt-0">
        <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function Sidebar({
  pathname,
  logout,
  userName,
  role,
  close,
}: {
  pathname: string;
  logout: () => void;
  userName: string;
  role: string;
  close?: () => void;
}) {
  return (
    <div className="flex h-screen flex-col bg-white text-slate-950">
      {/* Logo */}
      <div className="shrink-0 border-b border-slate-200 px-5 py-5">
        <BrandLogo />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${
                  active
                    ? "bg-sky-100 text-sky-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {item.icon}
              </span>

              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Account unten */}
      <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Angemeldet
          </p>

          <p className="mt-2 truncate text-base font-black text-slate-950">
            {userName}
          </p>

          <p className="mt-1 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            {role}
          </p>

          <button
            onClick={logout}
            className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-sm font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Logout
          </button>
        </div>

        <div className="pt-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            © 2026 ODZ.
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}

function BrandLogo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div
          className={`font-black uppercase leading-none tracking-[0.14em] text-slate-950 ${
            small ? "text-xl" : "text-3xl"
          }`}
        >
          ODZ.
        </div>

        <div className="mt-1 inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-sky-700">
          v1.1
        </div>
      </div>

      <div className={`font-black leading-none ${small ? "text-xl" : "text-2xl"}`}>
        <span className="text-slate-950">Stahl</span>
        <span className="text-orange-500">Fabrik</span>
      </div>
    </div>
  );
}
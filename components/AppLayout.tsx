"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const navItems = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/arbeitszeiten", label: "Arbeitszeiten", icon: "⏱️" },
  { href: "/urlaub", label: "Urlaub / Krank", icon: "🌴" },
  { href: "/resturlaub", label: "Resturlaub", icon: "📊" },
  { href: "/projekte", label: "Projekte", icon: "🏗️" },
  { href: "/mitarbeiter", label: "Mitarbeiter", icon: "👥" },
  { href: "/chef-dashboard", label: "Chef Dashboard", icon: "👑" },
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

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-900">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <div>
          <div className="text-lg font-black tracking-tight text-slate-950">
            Stahl<span className="text-orange-500">Fabrik</span>
          </div>
          <div className="text-xs font-medium text-slate-500">
            Swiss ERP System
          </div>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm"
        >
          Menü
        </button>
      </header>

      {/* Mobile Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />

          <aside className="absolute left-0 top-0 h-full w-[285px] bg-slate-950 text-white shadow-2xl">
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
      <aside className="fixed left-0 top-0 hidden h-screen w-[292px] bg-slate-950 text-white lg:block">
        <Sidebar
          pathname={pathname}
          logout={logout}
          userName={userName}
          role={role}
        />
      </aside>

      {/* Main Content */}
      <main className="pt-20 lg:ml-[292px] lg:pt-0">
        <div className="mx-auto min-h-screen w-full max-w-[1450px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="rounded-[28px] border border-slate-200 bg-white/80 p-4 shadow-sm sm:p-6 lg:p-8">
            {children}
          </div>
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
    <div className="flex h-full flex-col px-5 py-6">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black text-white shadow-lg shadow-orange-500/25">
          SF
        </div>

        <div>
          <div className="text-xl font-black leading-tight tracking-tight">
            Stahl<span className="text-orange-400">Fabrik</span>
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Swiss ERP
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={`group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all ${
                active
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Userbox */}
      <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-950">
            {userName?.slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-black text-white">
              {userName}
            </div>
            <div className="text-xs font-semibold text-orange-300">
              {role}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-orange-500 hover:text-white"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
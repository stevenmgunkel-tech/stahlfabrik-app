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
    <div className="min-h-screen overflow-x-hidden bg-[#070a0d] text-slate-100">
      {/* Globaler transparenter Dashboard-Hintergrund */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(148,163,184,0.10),transparent_30%),linear-gradient(135deg,#070a0d,#0d141c_48%,#050608)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:42px_42px]" />

      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#070a0d]/80 px-4 shadow-lg shadow-black/30 backdrop-blur-xl lg:hidden">
        <BrandLogo small />

        <button
          onClick={() => setOpen(true)}
          className="rounded-xl border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-sm font-black text-sky-100"
        >
          Menü
        </button>
      </header>

      {/* Mobile Sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <aside className="fixed bottom-0 left-0 top-0 h-screen w-[286px] border-r border-white/10 bg-[#0b1118]/92 shadow-2xl shadow-black/50 backdrop-blur-xl">
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
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[286px] border-r border-white/10 bg-[#0b1118]/72 shadow-2xl shadow-black/35 backdrop-blur-xl lg:block">
        <Sidebar pathname={pathname} logout={logout} userName={userName} role={role} />
      </aside>

      {/* Main */}
      <main className="relative z-10 pt-16 lg:ml-[286px] lg:pt-0">
        <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <style jsx global>{`
        html,
        body {
          min-height: 100%;
          background: #070a0d;
          scrollbar-width: thin;
          scrollbar-color: rgba(56, 189, 248, 0.75) rgba(7, 10, 13, 0.95);
        }

        body::-webkit-scrollbar {
          width: 10px;
        }

        body::-webkit-scrollbar-track {
          background: #070a0d;
        }

        body::-webkit-scrollbar-thumb {
          background: rgba(56, 189, 248, 0.7);
          border-radius: 999px;
          border: 2px solid #070a0d;
        }
      `}</style>
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
    <div className="flex h-screen min-h-0 flex-col text-slate-100">
      {/* Brand */}
      <div className="shrink-0 border-b border-white/10 px-5 py-5">
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
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black transition ${
                active
                  ? "border border-sky-300/25 bg-sky-300/12 text-white shadow-lg shadow-sky-950/20"
                  : "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.055] hover:text-white"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm ${
                  active
                    ? "border-sky-300/25 bg-sky-300/15 text-sky-100"
                    : "border-white/10 bg-white/[0.045] text-slate-400"
                }`}
              >
                {item.icon}
              </span>

              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* System Block gegen leeren Sidebar-Bereich */}
      <div className="shrink-0 px-4 pb-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 shadow-lg shadow-black/20">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            System
          </p>

          <div className="mt-3 space-y-2 text-xs">
            <SystemLine label="Version" value="ODZ. V1.1" />
            <SystemLine label="Mandant" value="StahlFabrik" />
            <SystemLine label="Status" value="Aktiv" positive />
          </div>
        </div>
      </div>

      {/* Account ganz unten */}
      <div className="shrink-0 border-t border-white/10 bg-black/12 px-4 py-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-lg shadow-black/25">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Angemeldet
          </p>

          <p className="mt-2 truncate text-base font-black text-white">
            {userName}
          </p>

          <p className="mt-2 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-300">
            {role}
          </p>

          <button
            onClick={logout}
            className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-left text-sm font-black text-slate-300 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200"
          >
            Logout
          </button>
        </div>

        <div className="pt-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            © 2026 ODZ.
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
            All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}

function SystemLine({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={`font-black ${positive ? "text-green-300" : "text-slate-200"}`}>
        {value}
      </span>
    </div>
  );
}

function BrandLogo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div
          className={`font-black uppercase leading-none tracking-[0.14em] text-white ${
            small ? "text-xl" : "text-3xl"
          }`}
        >
          ODZ.
        </div>

        <div className="mt-1 inline-flex rounded-full border border-sky-300/20 bg-sky-300/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-sky-100">
          v1.1
        </div>
      </div>

      <div className={`font-black leading-none ${small ? "text-xl" : "text-2xl"}`}>
        <span className="text-white">Stahl</span>
        <span className="text-orange-500">Fabrik</span>
      </div>
    </div>
  );
}

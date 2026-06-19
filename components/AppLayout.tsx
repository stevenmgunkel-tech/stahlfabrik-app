"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const navGroups = [
  {
    title: "Betrieb",
    items: [
      { href: "/", label: "Dashboard", icon: "▦" },
      { href: "/arbeitszeiten", label: "Arbeitszeiten", icon: "◷" },
      { href: "/chef-dashboard", label: "Chef Dashboard", icon: "◆" },
    ],
  },
  {
    title: "Personal",
    items: [
      { href: "/abwesenheiten", label: "Abwesenheiten", icon: "◈" },
      { href: "/mitarbeiter", label: "Mitarbeiter", icon: "◇" },
    ],
  },
  {
    title: "Projekte",
    items: [
      { href: "/projekte", label: "Projekte", icon: "▣" },
      { href: "/projektanalyse", label: "Projektanalyse", icon: "◫" },
    ],
  },
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
    <div className="min-h-screen bg-[#0c0f12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.075),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.13),transparent_38%),linear-gradient(135deg,#11161a,#0d1115_45%,#07090b)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.65)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.65)_1px,transparent_1px)] [background-size:42px_42px]" />

      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/15 bg-[#101418]/90 px-5 shadow-xl shadow-black/30 backdrop-blur-xl lg:hidden">
        <BrandLogo small />

        <button
          onClick={() => setOpen(true)}
          className="rounded-xl border border-slate-300/25 bg-white/[0.07] px-4 py-2 text-sm font-black text-slate-100 transition hover:border-sky-300/30 hover:bg-sky-300/5"
        >
          Menü
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setOpen(false)}
          />

          <aside className="absolute left-0 top-0 h-full w-[320px] border-r border-white/15 bg-[#101418]">
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

      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[320px] border-r border-white/15 bg-[#101418]/92 shadow-2xl shadow-black/60 backdrop-blur-xl lg:block">
        <Sidebar
          pathname={pathname}
          logout={logout}
          userName={userName}
          role={role}
        />
      </aside>

      <main className="relative z-10 pt-16 lg:ml-[320px] lg:pt-0">
        <div className="mx-auto min-h-screen w-full max-w-[1600px] px-5 py-8 lg:px-10">
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
    <div className="flex h-full flex-col px-5 py-7">
      <div className="mb-8 rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.13] via-white/[0.07] to-black/20 p-6 shadow-2xl shadow-black/35">
        <BrandLogo />
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto pr-1">
        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="mb-3 px-3 text-[11px] font-black uppercase tracking-[0.28em] text-slate-300/60">
              {group.title}
            </div>

            <div className="space-y-2">
              {group.items.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className={`group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px] font-black transition-all duration-300 ${
                      active
                        ? "border border-slate-200/35 bg-gradient-to-r from-white/[0.16] via-white/[0.08] to-white/[0.035] text-white shadow-lg shadow-white/5"
                        : "border border-transparent text-slate-200/75 hover:-translate-y-0.5 hover:border-sky-300/25 hover:bg-sky-300/5 hover:text-white hover:shadow-lg hover:shadow-sky-300/10"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition ${
                        active
                          ? "border-slate-200/35 bg-white/[0.12] text-slate-50"
                          : "border-white/10 bg-black/20 text-slate-300/55 group-hover:border-sky-300/25 group-hover:text-sky-100"
                      }`}
                    >
                      {item.icon}
                    </span>

                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-7 rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.11] via-white/[0.055] to-black/20 p-5 shadow-2xl shadow-black/35">
        <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-300/55">
          Angemeldet
        </div>

        <div className="mt-3 text-lg font-black text-white">{userName}</div>

        <div className="mt-2 inline-flex rounded-full border border-slate-200/25 bg-white/[0.08] px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-100">
          {role}
        </div>

        <div className="my-4 h-px bg-white/10" />

        <button
          onClick={logout}
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm font-black text-slate-200/75 transition hover:-translate-y-0.5 hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

function BrandLogo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      {!small && (
        <div className="mb-4 text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">
          ODZ.
        </div>
      )}

      <div
        className={`flex items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.16] via-white/[0.08] to-black/20 font-black text-white shadow-xl shadow-black/30 ${
          small ? "h-11 w-11 text-xl" : "h-20 w-20 text-4xl"
        }`}
      >
        SF
      </div>

      {!small && (
        <>
          <div className="mt-4 text-[38px] font-black leading-none tracking-tight">
            <span className="text-white">Stahl</span>
            <span className="text-orange-400">Fabrik</span>
          </div>

          <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
            Powered by ODZ.
          </div>
        </>
      )}
    </div>
  );
}

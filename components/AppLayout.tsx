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
      { href: "/urlaub", label: "Urlaub / Krank", icon: "◇" },
      { href: "/resturlaub", label: "Resturlaub", icon: "◌" },
      { href: "/mitarbeiter", label: "Mitarbeiter", icon: "●" },
    ],
  },
  {
    title: "Projekte",
    items: [
      { href: "/projekte", label: "Projekte", icon: "▣" },
      { href: "/projektstatistik", label: "Projektstatistik", icon: "▤" },
      { href: "/projektarchiv", label: "Projektarchiv", icon: "▥" },
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
    <div className="min-h-screen bg-[#050607] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(148,163,184,0.08),_transparent_35%),linear-gradient(135deg,_#050607,_#0b0f12_45%,_#030405)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:42px_42px]" />

      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#07090b]/95 px-5 backdrop-blur-xl lg:hidden">
        <BrandLogo small />

        <button
          onClick={() => setOpen(true)}
          className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-black text-orange-400"
        >
          Menü
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setOpen(false)} />

          <aside className="absolute left-0 top-0 h-full w-[320px] border-r border-orange-500/20 bg-[#07090b]">
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

      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[320px] border-r border-orange-500/15 bg-[#07090b]/95 shadow-2xl shadow-black/60 backdrop-blur-xl lg:block">
        <Sidebar pathname={pathname} logout={logout} userName={userName} role={role} />
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
      <div className="mb-8 rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-white/[0.03] p-5 shadow-2xl shadow-orange-500/5">
        <BrandLogo />
      </div>

      <nav className="flex-1 space-y-7 overflow-y-auto pr-1">
        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="mb-3 px-3 text-[11px] font-black uppercase tracking-[0.28em] text-white/35">
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
                    className={`group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px] font-black transition-all ${
                      active
                        ? "border border-orange-500/45 bg-gradient-to-r from-orange-500/30 to-white/[0.04] text-orange-400 shadow-lg shadow-orange-500/10"
                        : "border border-transparent text-white/75 hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm ${
                        active
                          ? "border-orange-500/40 bg-orange-500/15 text-orange-400"
                          : "border-white/10 bg-black/25 text-white/45 group-hover:text-orange-400"
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

      <div className="mt-7 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-5 shadow-2xl shadow-black/30">
        <div className="text-xs font-black uppercase tracking-[0.24em] text-white/35">
          Angemeldet
        </div>

        <div className="mt-3 text-lg font-black text-white">{userName}</div>
        <div className="mt-1 inline-flex rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-orange-400">
          {role}
        </div>

        <div className="my-4 h-px bg-white/10" />

        <button
          onClick={logout}
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm font-black text-white/70 transition hover:border-orange-500/40 hover:text-orange-400"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

function BrandLogo({ small = false }: { small?: boolean }) {
  return (
    <div className={small ? "flex items-center gap-3" : "flex flex-col items-center"}>
      <div
        className={`flex items-center justify-center rounded-2xl border border-orange-500/35 bg-gradient-to-br from-orange-500/25 to-black/30 font-black text-orange-400 shadow-lg shadow-orange-500/10 ${
          small ? "h-10 w-10 text-xl" : "mb-4 h-16 w-16 text-3xl"
        }`}
      >
        SF
      </div>

      <div className={small ? "leading-tight" : "text-center"}>
        <div
          className={`font-black tracking-tight ${
            small ? "text-xl" : "text-[42px] leading-none"
          }`}
        >
          <span className="text-white">Stahl</span>
          <span className="text-orange-500">Fabrik</span>
        </div>

        <div
          className={`mt-2 font-black uppercase text-white/45 ${
            small ? "text-[8px] tracking-[0.18em]" : "text-[10px] tracking-[0.32em]"
          }`}
        >
          Werkstatt · Zeit · Projekte
        </div>
      </div>
    </div>
  );
}
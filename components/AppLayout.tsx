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

      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-300/30 bg-[#eef3f7]/95 px-5 text-slate-950 shadow-xl shadow-black/20 backdrop-blur-xl lg:hidden">
        <BrandLogo small />

        <button
          onClick={() => setOpen(true)}
          className="rounded-xl border border-sky-300/45 bg-sky-100 px-4 py-2 text-sm font-black text-sky-700 transition hover:border-sky-400 hover:bg-sky-200"
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

          <aside className="absolute left-0 top-0 h-full w-[320px] border-r border-slate-300/60 bg-[#eef3f7]">
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

      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[320px] border-r border-slate-300/45 bg-[#eef3f7]/96 shadow-2xl shadow-black/45 backdrop-blur-xl lg:block">
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

      <style jsx global>{`
        .odz-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(56, 189, 248, 0.75) rgba(15, 23, 42, 0.08);
        }

        .odz-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .odz-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.06);
          border-radius: 999px;
        }

        .odz-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(
            180deg,
            rgba(186, 230, 253, 0.95),
            rgba(56, 189, 248, 0.85)
          );
          border-radius: 999px;
          border: 2px solid rgba(238, 243, 247, 0.95);
        }

        .odz-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            180deg,
            rgba(224, 242, 254, 1),
            rgba(14, 165, 233, 0.95)
          );
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
    <div className="flex h-full flex-col px-5 py-6 text-slate-950">
      <div className="mb-7 rounded-[2rem] border border-white/80 bg-gradient-to-br from-white via-slate-100 to-slate-200 p-6 shadow-2xl shadow-slate-950/15 ring-1 ring-slate-300/70">
        <BrandLogo />
      </div>

      <nav className="odz-scrollbar flex-1 space-y-7 overflow-y-auto pr-2">
        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="mb-3 px-3 text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">
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
                        ? "border border-sky-300/70 bg-gradient-to-r from-sky-100 via-white to-slate-100 text-slate-950 shadow-lg shadow-sky-300/25"
                        : "border border-transparent text-slate-700 hover:-translate-y-0.5 hover:border-sky-300/55 hover:bg-sky-50 hover:text-slate-950 hover:shadow-lg hover:shadow-sky-300/15"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition ${
                        active
                          ? "border-sky-300/70 bg-sky-100 text-sky-700"
                          : "border-slate-300/75 bg-white/65 text-slate-500 group-hover:border-sky-300/65 group-hover:text-sky-700"
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

      <div className="mt-7 rounded-3xl border border-white/80 bg-gradient-to-br from-white via-slate-100 to-slate-200 p-5 shadow-2xl shadow-slate-950/15 ring-1 ring-slate-300/70">
        <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
          Angemeldet
        </div>

        <div className="mt-3 text-lg font-black text-slate-950">
          {userName}
        </div>

        <div className="mt-2 inline-flex rounded-full border border-slate-300 bg-slate-200 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-700">
          {role}
        </div>

        <div className="my-4 h-px bg-slate-300/80" />

        <button
          onClick={logout}
          className="w-full rounded-2xl border border-slate-300/80 bg-white/75 px-4 py-3 text-left text-sm font-black text-slate-700 shadow-sm shadow-slate-950/5 transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
        >
          Logout
        </button>

        <div className="mt-4 border-t border-slate-300/80 pt-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
            © 2026 ODZ.
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}

function BrandLogo({ small = false }: { small?: boolean }) {
  if (small) {
    return (
      <div className="flex items-center gap-3">
        <div>
          <div className="text-[22px] font-black uppercase leading-none tracking-[0.18em] text-slate-950">
            ODZ.
          </div>
          <div className="mt-1 inline-flex rounded-full border border-sky-300/70 bg-sky-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-sky-700">
            v1.1
          </div>
        </div>

        <div className="text-2xl font-black leading-none tracking-tight">
          <span className="text-slate-950">Stahl</span>
          <span className="text-orange-500">Fabrik</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[185px] text-slate-950">
      <div className="absolute left-0 top-0">
        <div className="text-[44px] font-black uppercase leading-none tracking-[0.12em] text-slate-950 drop-shadow-[0_8px_22px_rgba(15,23,42,0.16)]">
          ODZ.
        </div>

        <div className="mt-2 inline-flex rounded-full border border-sky-300/80 bg-sky-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-sky-700 shadow-sm shadow-sky-300/25">
          v1.1
        </div>
      </div>

      <div className="flex h-full min-h-[185px] flex-col items-center justify-center pt-8 text-center">
        <div className="text-[40px] font-black leading-none tracking-tight">
          <span className="text-slate-950">Stahl</span>
          <span className="text-orange-500">Fabrik</span>
        </div>

        <div className="mt-3 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">
          Built on ODZ.
        </div>
      </div>
    </div>
  );
}

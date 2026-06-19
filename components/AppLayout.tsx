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

      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/15 bg-[#12171b]/92 px-5 shadow-xl shadow-black/30 backdrop-blur-xl lg:hidden">
        <BrandLogo small />

        <button
          onClick={() => setOpen(true)}
          className="rounded-xl border border-sky-300/30 bg-sky-300/[0.08] px-4 py-2 text-sm font-black text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-300/10"
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

          <aside className="absolute left-0 top-0 h-full w-[320px] border-r border-white/15 bg-[#14191d]">
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

      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[320px] border-r border-white/15 bg-[#14191d]/94 shadow-2xl shadow-black/60 backdrop-blur-xl lg:block">
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
          scrollbar-color: rgba(125, 211, 252, 0.75) rgba(255, 255, 255, 0.06);
        }

        .odz-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .odz-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 999px;
        }

        .odz-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(
            180deg,
            rgba(186, 230, 253, 0.95),
            rgba(56, 189, 248, 0.8)
          );
          border-radius: 999px;
          border: 2px solid rgba(20, 25, 29, 0.95);
        }

        .odz-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            180deg,
            rgba(224, 242, 254, 1),
            rgba(125, 211, 252, 0.95)
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
    <div className="flex h-full flex-col px-5 py-7">
      <div className="mb-8 rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.16] via-white/[0.09] to-black/15 p-6 shadow-2xl shadow-black/35">
        <BrandLogo />
      </div>

      <nav className="odz-scrollbar flex-1 space-y-7 overflow-y-auto pr-2">
        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="mb-3 px-3 text-[11px] font-black uppercase tracking-[0.28em] text-slate-300/65">
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
                        ? "border border-sky-300/55 bg-gradient-to-r from-sky-300/[0.20] via-white/[0.09] to-white/[0.035] text-white shadow-lg shadow-sky-300/15"
                        : "border border-transparent text-slate-200/78 hover:-translate-y-0.5 hover:border-sky-300/25 hover:bg-sky-300/5 hover:text-white hover:shadow-lg hover:shadow-sky-300/10"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm transition ${
                        active
                          ? "border-sky-300/55 bg-sky-300/15 text-sky-50"
                          : "border-white/10 bg-black/18 text-slate-300/60 group-hover:border-sky-300/30 group-hover:text-sky-100"
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

      <div className="mt-7 rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.13] via-white/[0.07] to-black/15 p-5 shadow-2xl shadow-black/35">
        <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-300/60">
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
  if (small) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.18] via-white/[0.09] to-black/20 text-xl font-black text-white shadow-xl shadow-black/30">
          SF
        </div>

        <div>
          <div className="text-[15px] font-black uppercase tracking-[0.26em] text-white">
            ODZ.
          </div>
          <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
            v1.1
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-[34px] font-black uppercase leading-none tracking-[0.16em] text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.18)]">
        ODZ.
      </div>

      <div className="mt-2 inline-flex rounded-full border border-sky-300/25 bg-sky-300/[0.08] px-3 py-1 text-[10px] font-black uppercase tracking-[0.32em] text-sky-100 shadow-lg shadow-sky-300/10">
        v1.1
      </div>

      <div className="mt-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.18] via-white/[0.09] to-black/20 text-4xl font-black text-white shadow-xl shadow-black/30">
        SF
      </div>

      <div className="mt-4 text-[36px] font-black leading-none tracking-tight">
        <span className="text-white">Stahl</span>
        <span className="text-orange-400">Fabrik</span>
      </div>

      <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
        Powered by ODZ.
      </div>
    </div>
  );
}

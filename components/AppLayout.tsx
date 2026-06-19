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
    <div className="min-h-screen bg-[#070a0d] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(226,232,240,0.055),transparent_30%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.045),transparent_28%),linear-gradient(135deg,#070a0d,#0b1014_45%,#030405)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.72)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.72)_1px,transparent_1px)] [background-size:42px_42px]" />

      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-300/40 bg-[#f4f7fa]/95 px-5 text-slate-950 shadow-xl shadow-black/20 backdrop-blur-xl lg:hidden">
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
          <div className="absolute inset-0 bg-black/80" onClick={() => setOpen(false)} />

          <aside className="fixed bottom-0 left-0 top-0 h-screen w-[320px] overflow-hidden border-r border-white bg-[#f4f7fa]">
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

      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden h-screen w-[320px] overflow-hidden border-r border-white bg-[#f4f7fa] shadow-2xl shadow-black/40 lg:block">
        <Sidebar pathname={pathname} logout={logout} userName={userName} role={role} />
      </aside>

      <main className="relative z-10 pt-16 lg:ml-[320px] lg:pt-0">
        <div className="mx-auto min-h-screen w-full max-w-[1600px] px-5 py-8 lg:px-10">
          {children}
        </div>
      </main>

      <style jsx global>{`
        html,
        body {
          min-height: 100%;
          background: #070a0d;
          scrollbar-width: thin;
          scrollbar-color: rgba(56, 189, 248, 0.85) rgba(7, 10, 13, 0.95);
        }

        body::-webkit-scrollbar {
          width: 10px;
        }

        body::-webkit-scrollbar-track {
          background: #070a0d;
        }

        body::-webkit-scrollbar-thumb {
          background: linear-gradient(
            180deg,
            rgba(186, 230, 253, 0.95),
            rgba(56, 189, 248, 0.9)
          );
          border-radius: 999px;
          border: 2px solid #070a0d;
        }

        .hide-sidebar-scrollbar {
          scrollbar-width: none;
        }

        .hide-sidebar-scrollbar::-webkit-scrollbar {
          display: none;
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Betrieb: true,
    Personal: true,
    Projekte: true,
  });

  function toggleGroup(title: string) {
    setOpenGroups((aktuell) => ({
      ...aktuell,
      [title]: !aktuell[title],
    }));
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#f4f7fa] px-4 py-5 text-slate-950">
      <div className="mb-5 shrink-0 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-950/10 ring-1 ring-slate-200">
        <BrandLogo />
      </div>

      <nav className="hide-sidebar-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto">
        {navGroups.map((group) => {
          const groupOpen = openGroups[group.title];
          const activeInGroup = group.items.some((item) => item.href === pathname);

          return (
            <div
              key={group.title}
              className={`rounded-3xl border transition-all duration-300 ${
                activeInGroup
                  ? "border-sky-300/50 bg-white shadow-lg shadow-sky-300/15"
                  : "border-slate-200 bg-white/75 shadow-sm shadow-slate-950/5"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">
                    {group.title}
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-400">
                    {group.items.length} Bereiche
                  </div>
                </div>

                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-black transition ${
                    groupOpen
                      ? "border-sky-300/70 bg-sky-100 text-sky-700"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {groupOpen ? "▲" : "▼"}
                </div>
              </button>

              {groupOpen && (
                <div className="space-y-3 border-t border-slate-200 px-3 pb-4 pt-3">
                  {group.items.map((item) => {
                    const active = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={close}
                        className={`group flex items-center gap-4 rounded-2xl px-3.5 py-3.5 text-[15px] font-black transition-all duration-300 ${
                          active
                            ? "border border-sky-300/75 bg-sky-50 text-slate-950 shadow-md shadow-sky-300/20"
                            : "border border-transparent text-slate-700 hover:-translate-y-0.5 hover:border-sky-300/55 hover:bg-sky-50 hover:text-slate-950"
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm transition ${
                            active
                              ? "border-sky-300/75 bg-sky-100 text-sky-700"
                              : "border-slate-200 bg-white text-slate-500 group-hover:border-sky-300/65 group-hover:text-sky-700"
                          }`}
                        >
                          {item.icon}
                        </span>

                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto shrink-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/10 ring-1 ring-slate-200">
        <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
          Angemeldet
        </div>

        <div className="mt-3 text-lg font-black text-slate-950">{userName}</div>

        <div className="mt-2 inline-flex rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-700">
          {role}
        </div>

        <div className="my-4 h-px bg-slate-200" />

        <button
          onClick={logout}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-700 shadow-sm shadow-slate-950/5 transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
        >
          Logout
        </button>

        <div className="mt-4 border-t border-slate-200 pt-4 text-center">
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
    <div className="relative min-h-[145px] text-slate-950">
      <div className="absolute left-0 top-0">
        <div className="text-[40px] font-black uppercase leading-none tracking-[0.12em] text-slate-950 drop-shadow-[0_8px_22px_rgba(15,23,42,0.14)]">
          ODZ.
        </div>

        <div className="mt-2 inline-flex rounded-full border border-sky-300/80 bg-sky-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-sky-700 shadow-sm shadow-sky-300/25">
          v1.1
        </div>
      </div>

      <div className="flex h-full min-h-[145px] flex-col items-start justify-end pt-8 text-left">
        <div className="text-[32px] font-black leading-none tracking-tight">
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

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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

const restrictedRoutes = [
  "/chef-dashboard",
  "/mitarbeiter",
  "/projekte",
  "/projektanalyse",
  "/admin",
  "/monatsansicht",
];

function isAdminRole(role: string) {
  return String(role || "").trim().toLowerCase() === "admin";
}

function getNavGroupsForRole(role: string) {
  if (isAdminRole(role)) return navGroups;

  return [
    {
      title: "Betrieb",
      items: [
        { href: "/", label: "Dashboard", icon: "▦" },
        { href: "/arbeitszeiten", label: "Arbeitszeiten", icon: "◷" },
      ],
    },
    {
      title: "Personal",
      items: [
        { href: "/abwesenheiten", label: "Abwesenheiten", icon: "◈" },
      ],
    },
  ];
}

function isRestrictedPath(pathname: string) {
  return restrictedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState("StahlFabrik");
  const [role, setRole] = useState("ERP");
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [initialSplash, setInitialSplash] = useState(true);

  const isLogin = pathname === "/login";

  useEffect(() => {
    async function loadUser() {
      setRoleLoaded(false);

      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setRoleLoaded(true);

        if (!isLogin) router.push("/login");
        return;
      }

      const { data: mitarbeiter } = await supabase
        .from("mitarbeiter")
        .select("name, rolle")
        .eq("user_id", authData.user.id)
        .single();

      const currentRole = mitarbeiter?.rolle || "Mitarbeiter";

      if (mitarbeiter) {
        setUserName(mitarbeiter.name || "StahlFabrik");
        setRole(currentRole);
      } else {
        setUserName("StahlFabrik");
        setRole("Mitarbeiter");
      }

      setRoleLoaded(true);

      if (!isAdminRole(currentRole) && isRestrictedPath(pathname)) {
        router.replace("/");
      }
    }

    loadUser();
  }, [pathname, router, isLogin]);

  useEffect(() => {
    if (isLogin || !initialSplash) return;

    const timer = window.setTimeout(() => setInitialSplash(false), 900);

    return () => window.clearTimeout(timer);
  }, [isLogin, initialSplash]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (isLogin) return <>{children}</>;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#070a0d] text-slate-100">
      {/* Globaler Hintergrund */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.10),transparent_32%),radial-gradient(circle_at_top_right,rgba(148,163,184,0.08),transparent_30%),linear-gradient(135deg,#070a0d,#0d141c_48%,#050608)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,.65)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.65)_1px,transparent_1px)] [background-size:42px_42px]" />

      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#0b1118]/95 px-4 shadow-lg shadow-black/30 backdrop-blur-xl lg:hidden">
        <BrandLogo small />

        <button
          onClick={() => setOpen(true)}
          className="rounded-xl border border-sky-300/25 bg-sky-300/10 px-4 py-2 text-sm font-black text-sky-100"
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

          <aside className="fixed bottom-0 left-0 top-0 w-[286px] overflow-hidden border-r border-white/10 bg-[#0b1118]/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <Sidebar
              pathname={pathname}
              logout={logout}
              userName={userName}
              role={role}
              roleLoaded={roleLoaded}
              close={() => setOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Desktop Sidebar: läuft fix von oben bis unten */}
      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-[286px] overflow-hidden rounded-r-3xl border-r border-white/10 bg-[#0b1118]/95 shadow-2xl shadow-black/40 backdrop-blur-xl lg:block">
        <Sidebar
          pathname={pathname}
          logout={logout}
          userName={userName}
          role={role}
          roleLoaded={roleLoaded}
        />
      </aside>

      <ODZInitialSplash active={initialSplash} />

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
          scrollbar-color: rgba(56, 189, 248, 0.9) rgba(7, 10, 13, 0.95);
        }

        body::-webkit-scrollbar {
          width: 10px;
        }

        body::-webkit-scrollbar-track {
          background: rgba(7, 10, 13, 0.95);
        }

        body::-webkit-scrollbar-thumb {
          background: linear-gradient(
            180deg,
            rgba(186, 230, 253, 0.95),
            rgba(56, 189, 248, 0.95)
          );
          border-radius: 999px;
          border: 2px solid rgba(7, 10, 13, 0.95);
          box-shadow: 0 0 18px rgba(56, 189, 248, 0.45);
        }

        body::-webkit-scrollbar-thumb:hover {
          background: rgba(125, 211, 252, 1);
        }

        main {
          transform: translateZ(0);
          backface-visibility: hidden;
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
  roleLoaded,
  close,
}: {
  pathname: string;
  logout: () => void;
  userName: string;
  role: string;
  roleLoaded: boolean;
  close?: () => void;
}) {
  const visibleNavGroups = useMemo(
    () => getNavGroupsForRole(roleLoaded ? role : "Mitarbeiter"),
    [role, roleLoaded]
  );

  const initialOpenGroups = useMemo(() => {
    const groups: Record<string, boolean> = {};
    visibleNavGroups.forEach((group) => {
      groups[group.title] = group.items.some((item) => item.href === pathname);
    });

    return groups;
  }, [pathname, visibleNavGroups]);

  const [openGroups, setOpenGroups] =
    useState<Record<string, boolean>>(initialOpenGroups);

  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };

      visibleNavGroups.forEach((group) => {
        if (group.items.some((item) => item.href === pathname)) {
          next[group.title] = true;
        }
      });

      return next;
    });
  }, [pathname, visibleNavGroups]);

  function toggleGroup(title: string) {
    setOpenGroups((current) => ({
      ...current,
      [title]: !current[title],
    }));
  }

  return (
    <div className="flex h-full min-h-0 flex-col text-slate-100">
      {/* Logo */}
      <div className="shrink-0 border-b border-white/10 px-5 py-5">
        <BrandLogo />
      </div>

      {/* Navigation nimmt den freien Platz */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-3">
          {visibleNavGroups.map((group) => {
            const groupOpen = openGroups[group.title];
            const activeInGroup = group.items.some((item) => item.href === pathname);

            return (
              <div key={group.title}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${
                    activeInGroup
                      ? "border-sky-300/25 bg-sky-300/8"
                      : "border-transparent hover:border-white/10 hover:bg-white/[0.045]"
                  }`}
                >
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                    {group.title}
                  </span>

                  <span
                    className={`text-xs font-black transition ${
                      groupOpen ? "rotate-180 text-sky-200" : "text-slate-500"
                    }`}
                  >
                    ▼
                  </span>
                </button>

                {groupOpen && (
                  <div className="mt-1 space-y-1">
                    {group.items.map((item) => {
                      const active = pathname === item.href;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={close}
                          className={`flex items-center gap-3 rounded-2xl border px-3 py-3.5 text-[15px] font-black transition ${
                            active
                              ? "border-sky-300/45 bg-sky-300/12 text-white shadow-lg shadow-sky-950/20"
                              : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm ${
                              active
                                ? "border-sky-300/35 bg-sky-300/15 text-sky-100"
                                : "border-white/10 bg-white/[0.045] text-slate-400"
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
        </div>
      </nav>

      {/* Account bleibt IMMER unten */}
      <div className="shrink-0 border-t border-white/10 bg-[#0b1118] px-4 py-4">
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

function BrandLogo({ small = false }: { small?: boolean }) {
  if (small) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xl font-black uppercase leading-none tracking-[0.14em] text-white">
            ODZ.
          </div>

          <div className="mt-1 inline-flex rounded-full border border-sky-300/20 bg-white/[0.045] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-sky-100">
            v1.1
          </div>
        </div>

        <div className="text-xl font-black leading-none">
          <span className="text-white">Stahl</span>
          <span className="text-orange-500">Fabrik</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div
  className="
    text-[36px]
    font-black
    uppercase
    leading-none
    tracking-[0.18em]
    bg-gradient-to-b
    from-white
    via-slate-100
    to-slate-400
    bg-clip-text
    text-transparent
    drop-shadow-[0_1px_0_rgba(255,255,255,0.20)]
  "
  style={{
    textShadow:
      "0 2px 8px rgba(255,255,255,0.08), 0 12px 24px rgba(255,255,255,0.06)",
  }}
>
  ODZ.
</div>

        <div className="mt-2 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[8px] font-black uppercase tracking-[0.28em] text-slate-300">
  ODZ SILVER · V1.1
</div>
      </div>

      <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-lg shadow-black/20 text-center">
        <div className="text-center text-[24px] font-black leading-none tracking-tight">
  <span className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-[0_8px_18px_rgba(255,255,255,0.08)]">
    Stahl
  </span>
  <span className="text-orange-500 drop-shadow-[0_0_14px_rgba(249,115,22,0.18)]">
    Fabrik
  </span>
</div>

        <div className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.24em] text-sky-100/55">
          DESIGN NACH MASS
        </div>

        <div className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
          Powered by ODZ.
        </div>
      </div>
    </div>
  );
}



function ODZInitialSplash({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <>
      <div className="odz-initial-splash">
        <div className="odz-initial-splash-card">
          <div className="odz-initial-splash-logo">ODZ.</div>
          <div className="odz-initial-splash-subline">StahlFabrik · V1.1</div>
        </div>
      </div>

      <style jsx global>{`
        .odz-initial-splash {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          display: grid;
          place-items: center;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 20%, rgba(125, 211, 252, 0.08), transparent 34%),
            linear-gradient(135deg, rgba(7, 16, 24, 0.96), rgba(10, 14, 20, 0.95));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          animation: odz-initial-splash-out 900ms ease forwards;
        }

        .odz-initial-splash-card {
          width: min(260px, 70vw);
          border-radius: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.045);
          padding: 1.35rem 1.25rem;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
        }

        .odz-initial-splash-logo {
          text-align: center;
          font-size: 1.8rem;
          font-weight: 900;
          letter-spacing: 0.22em;
          color: rgba(255, 255, 255, 0.94);
        }

        .odz-initial-splash-subline {
          margin-top: 0.65rem;
          text-align: center;
          font-size: 0.58rem;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(148, 163, 184, 0.72);
        }

        @keyframes odz-initial-splash-out {
          0% {
            opacity: 1;
          }

          70% {
            opacity: 1;
          }

          100% {
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .odz-initial-splash {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}

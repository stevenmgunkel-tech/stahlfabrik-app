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
      { href: "/profil", label: "Profil", icon: "●" },
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
        { href: "/profil", label: "Profil", icon: "●" },
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
    <div className="min-h-screen overflow-x-hidden bg-[#ede7dc] text-slate-950">
      {/* ODZ V1.2 Warm Steel Hintergrund */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(249,115,22,0.16),transparent_30%),radial-gradient(circle_at_82%_8%,rgba(59,130,246,0.12),transparent_32%),linear-gradient(135deg,#f2ece2_0%,#ded6c9_42%,#b6ad9f_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.11] [background-image:linear-gradient(rgba(15,23,42,.20)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.16)_1px,transparent_1px)] [background-size:46px_46px]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.44),transparent_28%,transparent_72%,rgba(15,23,42,0.10))]" />

      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-[4.25rem] items-center gap-3 border-b border-white/50 bg-[#1a1b1d]/92 px-3 shadow-[0_18px_55px_rgba(15,23,42,0.22)] backdrop-blur-2xl lg:hidden">
        <div className="min-w-0 flex-1">
          <BrandLogo small />
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-2xl border border-orange-300/40 bg-orange-400/20 px-4 py-2 text-sm font-black text-orange-50 shadow-lg shadow-black/20 transition hover:border-orange-200/50 hover:bg-orange-400/20"
        >
          Menü
        </button>
      </header>

      {/* Mobile Sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />

          <aside className="fixed bottom-0 left-0 top-0 w-[292px] overflow-hidden border-r border-white/10 bg-[#171819]/95 shadow-2xl shadow-slate-950/50 backdrop-blur-2xl">
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

      {/* Desktop Sidebar */}
      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-[292px] overflow-hidden rounded-r-[2rem] border-r border-white/10 bg-[#171819]/95 shadow-[22px_0_70px_rgba(15,23,42,0.30)] backdrop-blur-2xl lg:block">
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
      <main className="relative z-10 pt-[4.25rem] lg:ml-[292px] lg:pt-0">
        <div className="mx-auto min-h-screen w-full max-w-[1520px] px-4 py-5 md:px-6 lg:px-8 lg:py-7">
          {children}
        </div>
      </main>

      <style jsx global>{`
        html,
        body {
          min-height: 100%;
          background: #ede7dc;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        *,
        *::before,
        *::after {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        html::-webkit-scrollbar,
        body::-webkit-scrollbar,
        *::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
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
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_26%_0%,rgba(249,115,22,0.13),transparent_34%),radial-gradient(circle_at_100%_18%,rgba(96,165,250,0.10),transparent_34%),linear-gradient(180deg,#202124_0%,#171819_46%,#101112_100%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-orange-200/30 to-transparent" />

      {/* Logo */}
      <div className="relative shrink-0 border-b border-white/10 px-5 py-5">
        <BrandLogo />
      </div>

      {/* Navigation */}
      <nav className="relative min-h-0 flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-3">
          {visibleNavGroups.map((group) => {
            const groupOpen = openGroups[group.title];
            const activeInGroup = group.items.some((item) => item.href === pathname);

            return (
              <div key={group.title}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition ${
                    activeInGroup
                      ? "border-orange-200/25 bg-orange-400/10 shadow-lg shadow-black/10"
                      : "border-transparent hover:border-white/10 hover:bg-white/[0.045]"
                  }`}
                >
                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.24em] ${
                      activeInGroup ? "text-orange-100/80" : "text-slate-500"
                    }`}
                  >
                    {group.title}
                  </span>

                  <span
                    className={`text-xs font-black transition ${
                      groupOpen ? "rotate-180 text-orange-100" : "text-slate-500"
                    }`}
                  >
                    ▼
                  </span>
                </button>

                {groupOpen && (
                  <div className="mt-1.5 space-y-1.5">
                    {group.items.map((item) => {
                      const active = pathname === item.href;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={close}
                          className={`group flex items-center gap-3 rounded-[1.15rem] border px-3 py-3 text-[14px] font-black transition ${
                            active
                              ? "border-orange-200/50 bg-gradient-to-r from-orange-400/20 via-white/[0.065] to-sky-400/10 text-white shadow-[0_16px_34px_rgba(0,0,0,0.18)]"
                              : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] border text-sm transition ${
                              active
                                ? "border-orange-200/50 bg-orange-300/20 text-orange-50 shadow-inner shadow-white/10"
                                : "border-white/10 bg-white/[0.045] text-white/75 group-hover:border-orange-200/20 group-hover:text-orange-100"
                            }`}
                          >
                            {item.icon}
                          </span>

                          <span className="truncate">{item.label}</span>
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

      {/* Account */}
      <div className="relative shrink-0 border-t border-white/10 bg-black/10 px-4 py-4">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.085] to-white/[0.035] p-4 shadow-[0_20px_45px_rgba(0,0,0,0.20)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                Angemeldet
              </p>

              <p className="mt-2 truncate text-base font-black text-white">
                {userName}
              </p>
            </div>

            <span className="rounded-full border border-orange-200/25 bg-orange-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-orange-100">
              {role}
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-left text-sm font-black text-slate-300 transition hover:border-red-300/40 hover:bg-red-500/10 hover:text-red-100"
          >
            Logout
          </button>
        </div>

        <div className="pt-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            © 2026 ODZ.
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
            Swiss Business System
          </p>
        </div>
      </div>
    </div>
  );
}

function BrandLogo({ small = false }: { small?: boolean }) {
  if (small) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0">
          <div className="text-lg font-black uppercase leading-none tracking-[0.14em] text-white sm:text-xl">
            ODZ.
          </div>

          <div className="mt-1 inline-flex rounded-full border border-orange-200/25 bg-white/[0.06] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-orange-100 sm:text-[9px]">
            v1.2
          </div>
        </div>

        <div className="min-w-0 truncate text-lg font-black leading-none sm:text-xl">
          <span className="text-white">Stahl</span>
          <span className="text-orange-400">Fabrik</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div
          className="bg-gradient-to-b from-white via-[#f7f3eb] to-slate-400 bg-clip-text text-[36px] font-black uppercase leading-none tracking-[0.18em] text-transparent drop-shadow-[0_1px_0_rgba(255,255,255,0.22)]"
          style={{
            textShadow:
              "0 2px 8px rgba(255,255,255,0.08), 0 14px 28px rgba(249,115,22,0.07)",
          }}
        >
          ODZ.
        </div>

        <div className="mt-2 inline-flex rounded-full border border-orange-200/20 bg-white/[0.055] px-3 py-1 text-[8px] font-black uppercase tracking-[0.28em] text-orange-100/80">
          Warm Steel · V1.2
        </div>
      </div>

      <div className="rounded-[1.7rem] border border-white/10 bg-gradient-to-br from-white/[0.085] via-white/[0.045] to-black/10 p-4 text-center shadow-[0_20px_45px_rgba(0,0,0,0.18)]">
        <div className="text-center text-[24px] font-black leading-none tracking-tight">
          <span className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-[0_8px_18px_rgba(255,255,255,0.08)]">
            Stahl
          </span>
          <span className="text-orange-400 drop-shadow-[0_0_16px_rgba(251,146,60,0.25)]">
            Fabrik
          </span>
        </div>

        <div className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.24em] text-orange-100/60">
          DESIGN NACH MASS
        </div>

        <div className="mt-3 inline-flex rounded-full border border-white/10 bg-black/10 px-3 py-1 text-center text-[9px] font-black uppercase tracking-[0.20em] text-slate-400">
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
          <div className="odz-initial-splash-subline">StahlFabrik · V1.2</div>
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
            radial-gradient(circle at 42% 18%, rgba(249, 115, 22, 0.16), transparent 34%),
            radial-gradient(circle at 70% 12%, rgba(96, 165, 250, 0.10), transparent 34%),
            linear-gradient(135deg, rgba(34, 35, 37, 0.96), rgba(17, 18, 20, 0.95));
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          animation: odz-initial-splash-out 900ms ease forwards;
        }

        .odz-initial-splash-card {
          width: min(276px, 72vw);
          border-radius: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.045));
          padding: 1.35rem 1.25rem;
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.45), 0 0 40px rgba(249, 115, 22, 0.08);
        }

        .odz-initial-splash-logo {
          text-align: center;
          font-size: 1.85rem;
          font-weight: 900;
          letter-spacing: 0.22em;
          color: rgba(255, 255, 255, 0.95);
        }

        .odz-initial-splash-subline {
          margin-top: 0.65rem;
          text-align: center;
          font-size: 0.58rem;
          font-weight: 900;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(254, 215, 170, 0.74);
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

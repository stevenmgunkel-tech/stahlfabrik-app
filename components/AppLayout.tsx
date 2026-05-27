"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  LayoutDashboard,
  Clock3,
  CalendarDays,
  CalendarClock,
  Plane,
  Users,
  FolderKanban,
  Shield,
  Menu,
  X,
  LogOut,
} from "lucide-react";

import { supabase } from "../lib/supabase";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [userName, setUserName] =
    useState("");

  const [userRole, setUserRole] =
    useState("");

  const isLoginPage =
    pathname === "/login";

  const isAdmin =
    userRole === "Admin";

  const navItems = isAdmin
    ? [
        {
          href: "/",
          label: "Dashboard",
          icon: LayoutDashboard,
        },
        {
          href: "/arbeitszeiten",
          label: "Arbeitszeiten",
          icon: Clock3,
        },
        {
          href: "/urlaub",
          label: "Urlaub / Krank",
          icon: Plane,
        },
        {
          href: "/monatsansicht",
          label: "Monatsansicht",
          icon: CalendarClock,
        },
        {
          href: "/resturlaub",
          label: "Resturlaub",
          icon: CalendarDays,
        },
        {
          href: "/mitarbeiter",
          label: "Mitarbeiter",
          icon: Users,
        },
        {
          href: "/chef-dashboard",
          label: "Chef Dashboard",
          icon: LayoutDashboard,
        },
        {
          href: "/projekte",
          label: "Projekte",
          icon: FolderKanban,
        },
        {
          href: "/admin",
          label: "Admin",
          icon: Shield,
        },
      ]
    : [
        {
          href: "/",
          label: "Dashboard",
          icon: LayoutDashboard,
        },
        {
          href: "/arbeitszeiten",
          label: "Arbeitszeiten",
          icon: Clock3,
        },
        {
          href: "/urlaub",
          label: "Urlaub / Krank",
          icon: Plane,
        },
        {
          href: "/monatsansicht",
          label: "Monatsansicht",
          icon: CalendarClock,
        },
        {
          href: "/resturlaub",
          label: "Resturlaub",
          icon: CalendarDays,
        },
      ];

  useEffect(() => {
    async function ladeUser() {
      const userData =
        await supabase.auth.getUser();

      const user =
        userData.data.user;

      if (!user) return;

      const { data } =
        await supabase
          .from("mitarbeiter")
          .select("*")
          .eq("user_id", user.id)
          .single();

      if (data) {
        setUserName(
          data.name ||
            user.email ||
            ""
        );

        setUserRole(
          data.rolle || ""
        );
      }
    }

    ladeUser();
  }, []);

  async function logout() {
    await supabase.auth.signOut();

    window.location.href =
      "/login";
  }

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-zinc-100">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100">

      {/* MOBILE HEADER */}

      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center border-b border-zinc-900 bg-black px-5 md:hidden">

        <Link
          href="/"
          className="text-[28px] font-black tracking-tight text-white"
        >
          Stahl
          <span className="text-orange-500">
            Fabrik
          </span>
        </Link>

        <button
          type="button"
          onClick={() =>
            setSidebarOpen(true)
          }
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-white"
        >
          <Menu size={22} />
        </button>

      </header>

      {/* DESKTOP SIDEBAR */}

      <aside className="fixed left-0 top-0 z-40 hidden h-[100dvh] w-64 flex-col overflow-hidden border-r border-zinc-900 bg-black md:flex">

        {/* LOGO */}

        <div className="shrink-0 border-b border-zinc-900 px-6 py-6">

          <Link
            href="/"
            className="flex flex-col"
          >

            <span className="text-[34px] font-black tracking-tight text-white">
              Stahl
              <span className="text-orange-500">
                Fabrik
              </span>
            </span>

            <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-zinc-600">
              Swiss ERP System
            </span>

          </Link>

        </div>

        {/* NAVIGATION */}

        <nav className="min-h-0 flex-1 overflow-y-auto p-3">

          <div className="flex flex-col gap-2">

            {navItems.map((item) => {
              const active =
                pathname === item.href;

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-4 rounded-2xl px-4 py-3 text-[14px] font-semibold transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg shadow-orange-500/20"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <Icon
                    size={18}
                    className={`transition-all ${
                      active
                        ? "text-white"
                        : "text-zinc-500 group-hover:text-orange-400"
                    }`}
                  />

                  {item.label}

                </Link>
              );
            })}

          </div>

        </nav>

        {/* USER CARD */}

        <div className="shrink-0 border-t border-zinc-900 p-3">

          <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-4">

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-lg font-black text-white shadow-lg shadow-orange-500/20">
                {userName?.charAt(0) || "S"}
              </div>

              <div>

                <p className="text-sm font-semibold text-white">
                  {userName ||
                    "Angemeldet"}
                </p>

                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">
                  {userRole ||
                    "Benutzer"}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={logout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-400"
            >

              <LogOut size={15} />

              Logout

            </button>

          </div>

        </div>

      </aside>

      {/* MOBILE SIDEBAR */}

      {sidebarOpen && (
        <div className="fixed inset-0 z-[999] md:hidden">

          <button
            type="button"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <aside className="absolute left-0 top-0 flex h-full w-[85%] max-w-xs flex-col overflow-hidden bg-black shadow-2xl">

            <div className="shrink-0 flex items-center justify-between border-b border-zinc-900 px-5 py-6">

              <div className="flex flex-col">

                <span className="text-3xl font-black tracking-tight text-white">
                  Stahl
                  <span className="text-orange-500">
                    Fabrik
                  </span>
                </span>

                <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-600">
                  Swiss ERP
                </span>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSidebarOpen(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-white"
              >
                <X size={18} />
              </button>

            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto p-4">

              <div className="flex flex-col gap-2">

                {navItems.map((item) => {
                  const active =
                    pathname === item.href;

                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() =>
                        setSidebarOpen(false)
                      }
                      className={`group flex items-center gap-4 rounded-2xl px-5 py-4 text-[15px] font-semibold transition-all duration-200 ${
                        active
                          ? "bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg shadow-orange-500/20"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                      }`}
                    >
                      <Icon
                        size={20}
                        className={`transition-all ${
                          active
                            ? "text-white"
                            : "text-zinc-500 group-hover:text-orange-400"
                        }`}
                      />

                      {item.label}

                    </Link>
                  );
                })}

              </div>

            </nav>

          </aside>

        </div>
      )}

      {/* CONTENT */}

      <main className="pt-16 md:ml-64 md:pt-0">

        <div className="mx-auto w-full max-w-[1250px] overflow-x-hidden p-4 md:p-6">

          {children}

        </div>

      </main>

    </div>
  );
}
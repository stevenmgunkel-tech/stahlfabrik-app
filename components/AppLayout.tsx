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
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center border-b border-zinc-200 bg-white px-5 md:hidden">
        <Link
          href="/"
          className="text-[28px] font-black tracking-tight text-zinc-900"
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
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-sm"
        >
          <Menu size={22} />
        </button>
      </header>

      <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="border-b border-zinc-200 px-7 py-7">
          <Link
            href="/"
            className="flex flex-col"
          >
            <span className="text-[36px] font-black tracking-tight text-zinc-900">
              Stahl
              <span className="text-orange-500">
                Fabrik
              </span>
            </span>

            <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Swiss ERP System
            </span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-4">
          {navItems.map((item) => {
            const active =
              pathname === item.href;

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold transition-all duration-150 ${
                  active
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <Icon size={18} />

                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-200 p-4">
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-lg font-bold text-white">
                {userName?.charAt(0)}
              </div>

              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  {userName ||
                    "Angemeldet"}
                </p>

                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-orange-500">
                  {userRole ||
                    "Benutzer"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              <LogOut size={16} />

              Logout
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-[999] md:hidden">
          <button
            type="button"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <aside className="absolute left-0 top-0 flex h-full w-[85%] max-w-xs flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-6">
              <div className="flex flex-col">
                <span className="text-3xl font-black tracking-tight text-zinc-900">
                  Stahl
                  <span className="text-orange-500">
                    Fabrik
                  </span>
                </span>

                <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Swiss ERP
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSidebarOpen(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-900"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 p-4">
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
                    className={`flex items-center gap-3 rounded-2xl px-4 py-4 text-[15px] font-semibold transition-all duration-150 ${
                      active
                        ? "bg-zinc-900 text-white shadow-sm"
                        : "text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    <Icon size={18} />

                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-zinc-200 p-4">
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-lg font-bold text-white">
                    {userName?.charAt(0)}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {userName ||
                        "Angemeldet"}
                    </p>

                    <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-orange-500">
                      {userRole ||
                        "Benutzer"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
                >
                  <LogOut size={16} />

                  Logout
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <main className="pt-16 md:ml-72 md:pt-0">
        <div className="w-full overflow-x-hidden p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
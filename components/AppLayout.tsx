"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/arbeitszeiten", label: "Arbeitszeiten" },
  { href: "/urlaub", label: "Urlaub / Krank" },
  { href: "/resturlaub", label: "Resturlaub" },
  { href: "/projekte", label: "Projekte" },
  { href: "/mitarbeiter", label: "Mitarbeiter" },
  { href: "/chef-dashboard", label: "Chef Dashboard" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState("Steven Gunkel");
  const [role, setRole] = useState("Admin");

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
    <div className="min-h-screen bg-[#07090b] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,106,0,0.10),_transparent_32%),linear-gradient(135deg,_#07090b,_#101214_45%,_#050607)]" />

      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#080a0c]/95 px-5 backdrop-blur lg:hidden">
        <BrandLogo small />

        <button
          onClick={() => setOpen(true)}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold"
        >
          Menü
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
          />

          <aside className="absolute left-0 top-0 h-full w-[300px] border-r border-white/10 bg-[#090b0d]">
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

      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[300px] border-r border-white/10 bg-[#090b0d]/95 backdrop-blur-xl lg:block">
        <Sidebar
          pathname={pathname}
          logout={logout}
          userName={userName}
          role={role}
        />
      </aside>

      <main className="relative z-10 pt-16 lg:ml-[300px] lg:pt-0">
        <div className="mx-auto min-h-screen w-full max-w-[1500px] px-5 py-8 lg:px-10">
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
    <div className="flex h-full flex-col px-4 py-8">
      <div className="mb-10">
        <BrandLogo />
      </div>

      <nav className="flex-1 space-y-3">
        {navItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={`block rounded-xl px-6 py-4 text-lg font-medium transition-all ${
                active
                  ? "border border-orange-500/50 bg-gradient-to-r from-orange-500/35 to-white/[0.03] text-orange-400 shadow-lg shadow-orange-500/10"
                  : "text-white/85 hover:bg-white/[0.06] hover:text-orange-400"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl">
        <div className="text-base font-bold">{userName}</div>
        <div className="mt-1 text-sm font-bold text-orange-500">{role}</div>

        <div className="my-4 h-px bg-white/10" />

        <button
          onClick={logout}
          className="w-full rounded-xl py-3 text-left text-base font-medium text-white transition hover:text-orange-400"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

function BrandLogo({ small = false }: { small?: boolean }) {
  return (
    <div className={small ? "flex flex-col items-start" : "flex flex-col items-center"}>
      <div
        className={`leading-none font-black tracking-tight ${
          small ? "text-2xl" : "text-[48px]"
        }`}
      >
        <span className="text-white">Stahl</span>
        <span className="text-orange-500">Fabrik</span>
      </div>

      <div className="mt-2 flex items-center justify-center gap-3">
        {!small && <div className="h-[2px] w-8 rounded-full bg-orange-500/70" />}

        <div
          className={`whitespace-nowrap font-bold uppercase ${
            small ? "text-[8px] tracking-[0.2em]" : "text-[11px] tracking-[0.24em]"
          }`}
        >
          <span className="text-orange-500">Swiss</span>{" "}
          <span className="text-white/90">ERP System</span>
        </div>

        {!small && <div className="h-[2px] w-8 rounded-full bg-orange-500/70" />}
      </div>
    </div>
  );
}
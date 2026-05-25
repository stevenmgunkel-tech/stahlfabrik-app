"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [name, setName] = useState("");
  const [rolle, setRolle] = useState("");

  useEffect(() => {
    ladeBenutzer();
  }, []);

  async function ladeBenutzer() {
    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) return;

    const { data } = await supabase
      .from("mitarbeiter")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setName(data.name || "Benutzer");
      setRolle(data.rolle || "Mitarbeiter");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const navigation = [
    {
      href: "/",
      label: "Dashboard",
    },
    {
      href: "/arbeitszeiten",
      label: "Arbeitszeiten",
    },
    {
      href: "/urlaub",
      label: "Urlaub / Krank",
    },
    {
      href: "/monatsansicht",
      label: "Monatsansicht",
    },
    {
      href: "/resturlaub",
      label: "Resturlaub",
    },
  ];

  if (rolle === "Admin") {
    navigation.push(
      {
        href: "/mitarbeiter",
        label: "Mitarbeiter",
      },
      {
        href: "/chef-dashboard",
        label: "Chef Dashboard",
      },
      {
        href: "/projekte",
        label: "Projekte",
      },
      {
        href: "/admin",
        label: "Admin",
      }
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-100">
      <aside className="flex w-[320px] flex-col justify-between border-r border-zinc-800 bg-black">
        <div>
          <div className="border-b border-zinc-800 p-6">
            <h1 className="text-5xl font-black tracking-tight">
              <span className="text-white">Stahl</span>
              <span className="text-orange-500">Fabrik</span>
            </h1>
          </div>

          <nav className="flex flex-col gap-3 p-4">
            {navigation.map((item) => {
              const aktiv =
                pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl px-6 py-5 text-2xl font-bold transition ${
                    aktiv
                      ? "border-2 border-blue-500 bg-white text-black"
                      : "text-white hover:bg-zinc-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4">
          <div className="rounded-3xl bg-zinc-900 p-6">
            <div className="mb-2 text-3xl font-bold text-white">
              {name}
            </div>

            <div className="mb-6 text-xl font-bold text-orange-500">
              {rolle}
            </div>

            <button
              onClick={logout}
              className="w-full rounded-2xl bg-orange-500 py-4 text-2xl font-bold text-white transition hover:bg-orange-600"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
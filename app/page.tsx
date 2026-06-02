"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Users,
  Clock3,
  Plane,
  AlertTriangle,
  Activity,
  Briefcase,
  CalendarDays,
  UserRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    mitarbeiter: 0,
    stunden: 0,
    offeneUrlaube: 0,
    krank: 0,
    projekte: 0,
    letzterMitarbeiter: "Keine Daten",
    letzteZeit: "Werkstatt",
    letzteStunden: 0,
    heuteSoll: 0,
    heuteIst: 0,
    heuteDifferenz: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: mitarbeiter } = await supabase.from("mitarbeiter").select("*");
    const { data: arbeitszeiten } = await supabase.from("arbeitszeiten").select("*");
    const { data: urlaub } = await supabase.from("urlaub").select("*");
    const { data: projekte } = await supabase.from("projekte").select("*");

    const heute = new Date().toISOString().split("T")[0];

    const eigeneZeiten =
      arbeitszeiten?.filter(
        (item) => item.user_id === user.id && item.datum === heute
      ) || [];

    const heuteIst = eigeneZeiten.reduce(
      (sum, item) => sum + Number(item.stunden || 0),
      0
    );

    const { data: eigenerMitarbeiter } = await supabase
      .from("mitarbeiter")
      .select("wochenstunden, name")
      .eq("user_id", user.id)
      .single();

    const heuteSoll = Number(eigenerMitarbeiter?.wochenstunden || 42.5) / 5;
    const heuteDifferenz = heuteIst - heuteSoll;

    const totalStunden =
      arbeitszeiten?.reduce((sum, item) => sum + Number(item.stunden || 0), 0) || 0;

    const offeneUrlaube =
      urlaub?.filter(
        (item) => item.typ === "Urlaub" && item.status === "Beantragt"
      ).length || 0;

    const krank = urlaub?.filter((item) => item.typ === "Krank").length || 0;
    const lastTime = arbeitszeiten?.[arbeitszeiten.length - 1];

    setStats({
      mitarbeiter: mitarbeiter?.length || 0,
      stunden: totalStunden,
      offeneUrlaube,
      krank,
      projekte: projekte?.length || 0,
      letzterMitarbeiter:
        eigenerMitarbeiter?.name || mitarbeiter?.[0]?.name || "Keine Daten",
      letzteZeit: lastTime?.projekt || "Werkstatt",
      letzteStunden: Number(lastTime?.stunden || 0),
      heuteSoll,
      heuteIst,
      heuteDifferenz,
    });
  }

  const today = new Date().toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const month = new Date().toISOString().slice(0, 7);

  const progress =
    stats.heuteSoll > 0
      ? Math.min((stats.heuteIst / stats.heuteSoll) * 100, 100)
      : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <div className="mb-4 text-sm font-medium uppercase tracking-widest text-white/70">
            Willkommen zurück,{" "}
            <span className="font-black text-orange-500">
              {stats.letzterMitarbeiter}
            </span>{" "}
            👋
          </div>

          <h1 className="text-5xl font-black tracking-tight text-white lg:text-6xl">
            Dashboard
          </h1>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-bold text-white shadow-xl shadow-black/30">
          {today}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Teammitglieder"
          value={stats.mitarbeiter}
          text="Aktive Mitarbeiter"
          icon={<Users size={28} />}
        />

        <StatCard
          title="Arbeitsstunden"
          value={`${stats.stunden.toFixed(1)}h`}
          text="Gesamt erfasst"
          icon={<Clock3 size={28} />}
        />

        <StatCard
          title="Offene Urlaube"
          value={stats.offeneUrlaube}
          text="Genehmigung ausstehend"
          icon={<Plane size={28} />}
        />

        <StatCard
          title="Krankmeldungen"
          value={stats.krank}
          text="Aktuell erfasst"
          icon={<AlertTriangle size={28} />}
        />
      </div>

      <section className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-white/[0.025] p-7 shadow-2xl shadow-orange-500/10">
        <div className="mb-6 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-black uppercase tracking-widest text-orange-500">
              Heute
            </div>

            <h2 className="mt-2 text-3xl font-black text-white">
              Tagesarbeitszeit
            </h2>

            <p className="mt-1 text-white/55">
              Persönliche Sollzeit, gebuchte Stunden und Tagesdifferenz
            </p>
          </div>

          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-orange-500">
            <Clock3 size={34} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <DailyValue label="Sollzeit" value={`${stats.heuteSoll.toFixed(1)}h`} />
          <DailyValue label="Gebucht" value={`${stats.heuteIst.toFixed(1)}h`} orange />
          <DailyValue
            label="Differenz"
            value={`${stats.heuteDifferenz >= 0 ? "+" : ""}${stats.heuteDifferenz.toFixed(1)}h`}
            green={stats.heuteDifferenz >= 0}
            red={stats.heuteDifferenz < 0}
          />
        </div>

        <div className="mt-7 overflow-hidden rounded-full border border-white/10 bg-black/40 p-1">
          <div
            className="h-4 rounded-full bg-orange-500 shadow-lg shadow-orange-500/30 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.95fr]">
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-black/30">
          <div className="mb-8 flex items-center gap-4">
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-orange-500">
              <Activity size={26} />
            </div>

            <div>
              <h2 className="text-2xl font-black">Letzte Aktivitäten</h2>
              <p className="text-white/60">Aktuelle Übersicht</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-6 transition hover:border-orange-500/30">
            <div className="mb-4 text-sm font-black uppercase tracking-widest text-orange-500">
              Arbeitszeit
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xl font-black">{stats.letzteZeit}</div>
                <div className="mt-2 text-white/60">Letzter Eintrag</div>
              </div>

              <div className="rounded-lg bg-orange-600 px-4 py-2 font-black text-white shadow-lg shadow-orange-600/25">
                {stats.letzteStunden.toFixed(2)}h
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-black/30">
          <div className="mb-8">
            <h2 className="text-2xl font-black">Schnellübersicht</h2>
            <p className="text-white/60">Live Infos</p>
          </div>

          <InfoRow label="Projekte" value={stats.projekte} icon={<Briefcase size={24} />} />
          <InfoRow label="Monat" value={month} icon={<CalendarDays size={24} />} />
          <InfoRow
            label="Mitarbeiter"
            value={stats.letzterMitarbeiter}
            orange
            icon={<UserRound size={24} />}
          />
        </section>
      </div>
    </div>
  );
}

function DailyValue({
  label,
  value,
  orange,
  green,
  red,
}: {
  label: string;
  value: string | number;
  orange?: boolean;
  green?: boolean;
  red?: boolean;
}) {
  const color = orange
    ? "text-orange-500"
    : green
    ? "text-green-400"
    : red
    ? "text-red-400"
    : "text-white";

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-5">
      <div className="text-sm font-bold text-white/50">{label}</div>
      <div className={`mt-3 text-4xl font-black ${color}`}>{value}</div>
    </div>
  );
}

function StatCard({
  title,
  value,
  text,
  icon,
}: {
  title: string;
  value: string | number;
  text: string;
  icon: ReactNode;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.025] p-7 shadow-2xl shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/50 hover:shadow-orange-500/10">
      <div className="mb-6 flex items-center justify-between">
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-orange-500 shadow-lg shadow-orange-500/10 transition group-hover:bg-orange-500 group-hover:text-white">
          {icon}
        </div>
      </div>

      <div className="text-base text-white/80">{title}</div>
      <div className="mt-3 text-4xl font-black text-white">{value}</div>
      <div className="mt-4 text-white/50">{text}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  orange,
  icon,
}: {
  label: string;
  value: string | number;
  orange?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/25 p-5 transition hover:border-orange-500/30 hover:bg-black/35">
      <div>
        <div className="text-white/55">{label}</div>
        <div
          className={`mt-2 text-2xl font-black ${
            orange ? "text-orange-500" : "text-white"
          }`}
        >
          {value}
        </div>
      </div>

      {icon && (
        <div className="rounded-xl bg-orange-500/10 p-3 text-orange-500">
          {icon}
        </div>
      )}
    </div>
  );
}
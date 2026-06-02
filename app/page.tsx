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

    wocheSoll: 0,
    wocheIst: 0,
    wocheDifferenz: 0,
    wocheTage: 0,

    monatSoll: 0,
    monatIst: 0,
    monatDifferenz: 0,
    monatTage: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  function formatDateLocal(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getMontagDieserWoche() {
    const heute = new Date();
    const tag = heute.getDay();
    const diff = tag === 0 ? -6 : 1 - tag;

    const montag = new Date(heute);
    montag.setDate(heute.getDate() + diff);
    montag.setHours(0, 0, 0, 0);

    return montag;
  }

  function getErsterTagDieserMonat() {
    const heute = new Date();
    return new Date(heute.getFullYear(), heute.getMonth(), 1);
  }

  function zaehleArbeitstage(startDatum: Date, endDatum: Date) {
    let tage = 0;
    const aktuell = new Date(startDatum);
    aktuell.setHours(0, 0, 0, 0);

    const ende = new Date(endDatum);
    ende.setHours(0, 0, 0, 0);

    while (aktuell <= ende) {
      const wochentag = aktuell.getDay();

      if (wochentag !== 0 && wochentag !== 6) {
        tage++;
      }

      aktuell.setDate(aktuell.getDate() + 1);
    }

    return tage;
  }

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

    const heuteDate = new Date();
    const heute = formatDateLocal(heuteDate);
    const montagDate = getMontagDieserWoche();
    const montag = formatDateLocal(montagDate);
    const monatsStartDate = getErsterTagDieserMonat();
    const monatsStart = formatDateLocal(monatsStartDate);

    const { data: eigenerMitarbeiter } = await supabase
      .from("mitarbeiter")
      .select("wochenstunden, name")
      .eq("user_id", user.id)
      .single();

    const tagesSoll = Number(eigenerMitarbeiter?.wochenstunden || 42.5) / 5;

    const eigeneZeitenHeute =
      arbeitszeiten?.filter(
        (item) => item.user_id === user.id && item.datum === heute
      ) || [];

    const heuteIst = eigeneZeitenHeute.reduce(
      (sum, item) => sum + Number(item.stunden || 0),
      0
    );

    const heuteSoll = tagesSoll;
    const heuteDifferenz = heuteIst - heuteSoll;

    const eigeneZeitenWoche =
      arbeitszeiten?.filter(
        (item) =>
          item.user_id === user.id &&
          item.datum >= montag &&
          item.datum <= heute
      ) || [];

    const wocheIst = eigeneZeitenWoche.reduce(
      (sum, item) => sum + Number(item.stunden || 0),
      0
    );

    const wocheTage = zaehleArbeitstage(montagDate, heuteDate);
    const wocheSoll = tagesSoll * wocheTage;
    const wocheDifferenz = wocheIst - wocheSoll;

    const eigeneZeitenMonat =
      arbeitszeiten?.filter(
        (item) =>
          item.user_id === user.id &&
          item.datum >= monatsStart &&
          item.datum <= heute
      ) || [];

    const monatIst = eigeneZeitenMonat.reduce(
      (sum, item) => sum + Number(item.stunden || 0),
      0
    );

    const monatTage = zaehleArbeitstage(monatsStartDate, heuteDate);
    const monatSoll = tagesSoll * monatTage;
    const monatDifferenz = monatIst - monatSoll;

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

      wocheSoll,
      wocheIst,
      wocheDifferenz,
      wocheTage,

      monatSoll,
      monatIst,
      monatDifferenz,
      monatTage,
    });
  }

  const today = new Date().toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const month = new Date().toISOString().slice(0, 7);

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
        <StatCard title="Teammitglieder" value={stats.mitarbeiter} text="Aktive Mitarbeiter" icon={<Users size={28} />} />
        <StatCard title="Arbeitsstunden" value={`${stats.stunden.toFixed(1)}h`} text="Gesamt erfasst" icon={<Clock3 size={28} />} />
        <StatCard title="Offene Urlaube" value={stats.offeneUrlaube} text="Genehmigung ausstehend" icon={<Plane size={28} />} />
        <StatCard title="Krankmeldungen" value={stats.krank} text="Aktuell erfasst" icon={<AlertTriangle size={28} />} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <WorkTimeCard
          eyebrow="Heute"
          title="Tagesarbeitszeit"
          description="Persönliche Tagesübersicht"
          soll={stats.heuteSoll}
          ist={stats.heuteIst}
          differenz={stats.heuteDifferenz}
        />

        <WorkTimeCard
          eyebrow="Diese Woche"
          title="Wochenarbeitszeit"
          description={`Montag bis heute · ${stats.wocheTage} Arbeitstage`}
          soll={stats.wocheSoll}
          ist={stats.wocheIst}
          differenz={stats.wocheDifferenz}
        />

        <WorkTimeCard
          eyebrow="Dieser Monat"
          title="Monatsarbeitszeit"
          description={`1. bis heute · ${stats.monatTage} Arbeitstage`}
          soll={stats.monatSoll}
          ist={stats.monatIst}
          differenz={stats.monatDifferenz}
        />
      </div>

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
          <InfoRow label="Mitarbeiter" value={stats.letzterMitarbeiter} orange icon={<UserRound size={24} />} />
        </section>
      </div>
    </div>
  );
}

function WorkTimeCard({
  eyebrow,
  title,
  description,
  soll,
  ist,
  differenz,
}: {
  eyebrow: string;
  title: string;
  description: string;
  soll: number;
  ist: number;
  differenz: number;
}) {
  return (
    <section className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-white/[0.025] p-6 shadow-2xl shadow-orange-500/10">
      <div className="mb-6 flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <div className="text-sm font-black uppercase tracking-widest text-orange-500">
            {eyebrow}
          </div>

          <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>

          <p className="mt-1 text-sm text-white/55">{description}</p>
        </div>

        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-orange-500">
          <Clock3 size={30} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <DailyValue label="Sollzeit" value={`${soll.toFixed(1)}h`} />
        <DailyValue label="Gebucht" value={`${ist.toFixed(1)}h`} orange />
        <DailyValue
          label="Differenz"
          value={`${differenz >= 0 ? "+" : ""}${differenz.toFixed(1)}h`}
          green={differenz >= 0}
          red={differenz < 0}
        />
      </div>
    </section>
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
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <div className="text-sm font-bold text-white/50">{label}</div>
      <div className={`mt-2 text-3xl font-black ${color}`}>{value}</div>
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
        <div className={`mt-2 text-2xl font-black ${orange ? "text-orange-500" : "text-white"}`}>
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
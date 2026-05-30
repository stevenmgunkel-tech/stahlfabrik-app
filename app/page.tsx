"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    mitarbeiter: 0,
    stunden: 0,
    offeneUrlaube: 0,
    krank: 0,
    projekte: 0,
    letzterMitarbeiter: "Keine Daten",
    letzteZeit: "Keine Einträge",
    letzteStunden: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const { data: mitarbeiter } = await supabase.from("mitarbeiter").select("*");
    const { data: arbeitszeiten } = await supabase.from("arbeitszeiten").select("*");
    const { data: urlaub } = await supabase.from("urlaub").select("*");
    const { data: projekte } = await supabase.from("projekte").select("*");

    const totalStunden =
      arbeitszeiten?.reduce((sum, item) => sum + Number(item.stunden || 0), 0) || 0;

    const offeneUrlaube =
      urlaub?.filter((item) => item.typ === "Urlaub" && item.status === "Beantragt").length || 0;

    const krank =
      urlaub?.filter((item) => item.typ === "Krank").length || 0;

    const lastTime = arbeitszeiten?.[arbeitszeiten.length - 1];

    setStats({
      mitarbeiter: mitarbeiter?.length || 0,
      stunden: totalStunden,
      offeneUrlaube,
      krank,
      projekte: projekte?.length || 0,
      letzterMitarbeiter: mitarbeiter?.[0]?.name || "Keine Daten",
      letzteZeit: lastTime?.projekt || "Werkstatt",
      letzteStunden: Number(lastTime?.stunden || 0),
    });
  }

  const today = new Date().toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <div className="mb-4 text-sm font-medium uppercase tracking-widest text-white/70">
            Willkommen zurück,{" "}
            <span className="font-black text-orange-500">Steven Gunkel</span> 👋
          </div>

          <h1 className="text-5xl font-black tracking-tight text-white lg:text-6xl">
            Dashboard
          </h1>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-bold text-white shadow-xl">
          {today}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Teammitglieder" value={stats.mitarbeiter} text="Aktive Mitarbeiter" />
        <StatCard title="Arbeitsstunden" value={`${stats.stunden.toFixed(1)}h`} text="Diese Woche" />
        <StatCard title="Offene Urlaube" value={stats.offeneUrlaube} text="Genehmigung ausstehend" />
        <StatCard title="Krankmeldungen" value={stats.krank} text="Aktuell gemeldet" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.95fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-2xl font-black">Letzte Aktivitäten</h2>
            <p className="text-white/60">Aktuelle Übersicht</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
            <div className="mb-4 text-sm font-black uppercase tracking-widest text-orange-500">
              Arbeitszeit
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xl font-black">{stats.letzteZeit}</div>
                <div className="mt-2 text-white/60">Letzter Eintrag</div>
              </div>

              <div className="rounded-lg bg-orange-600 px-4 py-2 font-black text-white">
                {stats.letzteStunden.toFixed(2)}h
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-2xl font-black">Schnellübersicht</h2>
            <p className="text-white/60">Live Infos</p>
          </div>

          <InfoRow label="Projekte" value={stats.projekte} />
          <InfoRow label="Monat" value="2026-05" />
          <InfoRow label="Letzter Mitarbeiter" value={stats.letzterMitarbeiter} orange />
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black">Letzte Einträge</h2>
            <p className="text-white/60">Neueste Aktivitäten im System</p>
          </div>

          <button className="rounded-xl border border-orange-500/50 px-5 py-3 font-bold text-orange-500 transition hover:bg-orange-500 hover:text-white">
            Alle anzeigen
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="grid grid-cols-5 border-b border-white/10 px-5 py-4 text-white/70">
            <div>Typ</div>
            <div>Beschreibung</div>
            <div>Mitarbeiter</div>
            <div>Datum</div>
            <div>Zeit</div>
          </div>

          <div className="grid grid-cols-5 px-5 py-5 font-medium">
            <div>
              <span className="rounded-md bg-orange-500/20 px-3 py-1 text-xs font-black uppercase text-orange-500">
                Arbeitszeit
              </span>
            </div>
            <div>Werkstatt</div>
            <div>{stats.letzterMitarbeiter}</div>
            <div>21.05.2026</div>
            <div>{stats.letzteStunden.toFixed(2)}h</div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  text,
}: {
  title: string;
  value: string | number;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl">
      <div className="text-base text-white/85">{title}</div>
      <div className="mt-4 text-4xl font-black text-white">{value}</div>
      <div className="mt-4 text-white/60">{text}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  orange,
}: {
  label: string;
  value: string | number;
  orange?: boolean;
}) {
  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-5">
      <div className="text-white/60">{label}</div>
      <div className={`mt-2 text-2xl font-black ${orange ? "text-orange-500" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}
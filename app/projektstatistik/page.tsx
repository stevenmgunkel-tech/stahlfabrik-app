"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type BereichStat = {
  bereich: string;
  stunden: number;
};

type ProjektStat = {
  projekt: string;
  stunden: number;
  bereiche: BereichStat[];
};

type ArbeitszeitEintrag = {
  projekt: string | null;
  bereich: string | null;
  stunden: number | string | null;
};

function formatStunden(value: number) {
  const totalMinuten = Math.round(value * 60);
  const stunden = Math.floor(totalMinuten / 60);
  const minuten = totalMinuten % 60;

  if (stunden <= 0) return `${minuten} min`;
  if (minuten === 0) return `${stunden} h`;

  return `${stunden} h ${minuten} min`;
}

function formatDezimal(value: number) {
  return `${value.toFixed(2)} h`;
}

function prozent(wert: number, total: number) {
  if (!total || total <= 0) return 0;
  return Math.min((wert / total) * 100, 100);
}

export default function ProjektstatistikPage() {
  const [daten, setDaten] = useState<ProjektStat[]>([]);
  const [bereichDaten, setBereichDaten] = useState<BereichStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const [projektSeite, setProjektSeite] = useState(1);

  const PROJEKTE_PRO_SEITE = 10;

  useEffect(() => {
    ladeDaten();
  }, []);

  async function ladeDaten() {
    setLoading(true);
    setFehler(null);

    const { data, error } = await supabase
      .from("arbeitszeiten")
      .select("projekt, bereich, stunden");

    if (error) {
      console.error(error);
      setFehler("Projektstatistik konnte nicht geladen werden.");
      setLoading(false);
      return;
    }

    const projektMap: Record<
      string,
      {
        stunden: number;
        bereiche: Record<string, number>;
      }
    > = {};

    const bereichMap: Record<string, number> = {};

    (data as ArbeitszeitEintrag[] | null)?.forEach((eintrag) => {
      const projekt = eintrag.projekt?.trim() || "Unbekannt";
      const bereich = eintrag.bereich?.trim() || "Ohne Bereich";
      const stunden = Number(eintrag.stunden || 0);

      if (!Number.isFinite(stunden) || stunden <= 0) return;

      if (!projektMap[projekt]) {
        projektMap[projekt] = {
          stunden: 0,
          bereiche: {},
        };
      }

      projektMap[projekt].stunden += stunden;
      projektMap[projekt].bereiche[bereich] =
        (projektMap[projekt].bereiche[bereich] || 0) + stunden;

      bereichMap[bereich] = (bereichMap[bereich] || 0) + stunden;
    });

    const projektResult = Object.entries(projektMap)
      .map(([projekt, wert]) => ({
        projekt,
        stunden: wert.stunden,
        bereiche: Object.entries(wert.bereiche)
          .map(([bereich, stunden]) => ({
            bereich,
            stunden,
          }))
          .sort((a, b) => b.stunden - a.stunden),
      }))
      .sort((a, b) => b.stunden - a.stunden);

    const bereichResult = Object.entries(bereichMap)
      .map(([bereich, stunden]) => ({
        bereich,
        stunden,
      }))
      .sort((a, b) => b.stunden - a.stunden);

    setDaten(projektResult);
    setBereichDaten(bereichResult);
    setProjektSeite(1);
    setLoading(false);
  }

  const gesamtStunden = useMemo(
    () => daten.reduce((sum, projekt) => sum + projekt.stunden, 0),
    [daten]
  );

  const topProjekt = daten[0];
  const topBereich = bereichDaten[0];

  const gesamtProjektSeiten = Math.max(
    1,
    Math.ceil(daten.length / PROJEKTE_PRO_SEITE)
  );

  const sichtbareProjekte = useMemo(() => {
    const start = (projektSeite - 1) * PROJEKTE_PRO_SEITE;
    return daten.slice(start, start + PROJEKTE_PRO_SEITE);
  }, [daten, projektSeite]);

  const ersterProjektIndex =
    daten.length === 0 ? 0 : (projektSeite - 1) * PROJEKTE_PRO_SEITE + 1;

  const letzterProjektIndex = Math.min(
    projektSeite * PROJEKTE_PRO_SEITE,
    daten.length
  );

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(148,163,184,0.10),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="relative p-6 sm:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-300/10 via-transparent to-slate-400/5" />

            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <div className="inline-flex rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-sky-100">
                  ODZ Analyse
                </div>

                <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Projektstatistik
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
                  Zeigt, wo die Zeit im Unternehmen wirklich hingeht: Projekte,
                  Bereiche und gebuchte Stunden sauber ausgewertet.
                </p>
              </div>

              <button
                onClick={ladeDaten}
                disabled={loading}
                className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-sky-300/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Lädt..." : "Daten aktualisieren"}
              </button>
            </div>
          </div>
        </section>

        {fehler && (
          <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-5 text-sm font-bold text-red-100">
            {fehler}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Projekte" value={daten.length} subvalue="mit Buchungen" />
          <KpiCard
            label="Gebuchte Stunden"
            value={formatStunden(gesamtStunden)}
            subvalue={formatDezimal(gesamtStunden)}
          />
          <KpiCard
            label="Top Projekt"
            value={topProjekt?.projekt || "-"}
            subvalue={topProjekt ? formatStunden(topProjekt.stunden) : "0 h"}
          />
          <KpiCard
            label="Top Bereich"
            value={topBereich?.bereich || "-"}
            subvalue={topBereich ? formatStunden(topBereich.stunden) : "0 h"}
          />
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-xl shadow-black/20 backdrop-blur-xl">
          <SectionHeader
            title="Bereichsauswertung Gesamt"
            description="Alle gebuchten Stunden nach Werkstatt, Montage, Planung, Logistik und weiteren Bereichen."
          />

          {loading ? (
            <EmptyState text="Lade Bereichsdaten..." />
          ) : bereichDaten.length === 0 ? (
            <EmptyState text="Noch keine Bereichsdaten vorhanden." />
          ) : (
            <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-4">
              {bereichDaten.map((bereich, index) => (
                <div
                  key={bereich.bereich}
                  className="rounded-3xl border border-white/10 bg-black/25 p-5 transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-black text-white">
                        {bereich.bereich}
                      </p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-white/35">
                        Rang {index + 1}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-200">
                      {prozent(bereich.stunden, gesamtStunden).toFixed(0)}%
                    </div>
                  </div>

                  <div className="mt-5 text-3xl font-black text-sky-100">
                    {formatStunden(bereich.stunden)}
                  </div>

                  <div className="mt-2 text-sm font-bold text-white/40">
                    {formatDezimal(bereich.stunden)}
                  </div>

                  <div className="mt-5 overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-sky-200 to-emerald-300"
                      style={{
                        width: `${prozent(bereich.stunden, gesamtStunden)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-white">
                Projektstunden nach Bereich
              </h2>
              <p className="mt-1 text-sm leading-6 text-white/50">
                Maximal 10 Projekte pro Seite, damit die Auswertung sauber und
                übersichtlich bleibt.
              </p>
            </div>

            {!loading && daten.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-2 text-xs font-black text-white/55">
                  {ersterProjektIndex}–{letzterProjektIndex} von {daten.length}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setProjektSeite((seite) => Math.max(1, seite - 1))
                    }
                    disabled={projektSeite === 1}
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/10 text-lg font-black text-white transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Vorherige Seite"
                  >
                    ‹
                  </button>

                  <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-xs font-black text-sky-100">
                    Seite {projektSeite} / {gesamtProjektSeiten}
                  </div>

                  <button
                    onClick={() =>
                      setProjektSeite((seite) =>
                        Math.min(gesamtProjektSeiten, seite + 1)
                      )
                    }
                    disabled={projektSeite === gesamtProjektSeiten}
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/10 text-lg font-black text-white transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Nächste Seite"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <EmptyState text="Lade Projektstunden..." />
          ) : daten.length === 0 ? (
            <EmptyState text="Noch keine Arbeitszeiten vorhanden." />
          ) : (
            <div className="divide-y divide-white/10">
              {sichtbareProjekte.map((projekt, index) => (
                <article
                  key={projekt.projekt}
                  className="p-5 transition hover:bg-sky-300/[0.03] sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white/60">
                          #{(projektSeite - 1) * PROJEKTE_PRO_SEITE + index + 1}
                        </div>

                        <h2 className="truncate text-2xl font-black text-white">
                          {projekt.projekt}
                        </h2>
                      </div>

                      <p className="mt-3 text-sm text-white/45">
                        {projekt.bereiche.length} Bereiche ·{" "}
                        {prozent(projekt.stunden, gesamtStunden).toFixed(0)}%
                        der Gesamtzeit
                      </p>
                    </div>

                    <div className="lg:text-right">
                      <div className="text-3xl font-black text-sky-100">
                        {formatStunden(projekt.stunden)}
                      </div>
                      <div className="mt-1 text-sm font-bold text-white/40">
                        {formatDezimal(projekt.stunden)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-sky-200 to-emerald-300"
                      style={{
                        width: `${prozent(projekt.stunden, gesamtStunden)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {projekt.bereiche.map((bereich) => (
                      <div
                        key={`${projekt.projekt}-${bereich.bereich}`}
                        className="rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
                      >
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                          {bereich.bereich}
                        </div>

                        <div className="mt-3 text-2xl font-black text-white">
                          {formatStunden(bereich.stunden)}
                        </div>

                        <div className="mt-1 text-sm font-bold text-white/40">
                          {formatDezimal(bereich.stunden)}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-white/10 px-5 py-5 sm:px-6">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-white/50">{description}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="p-6 text-sm font-bold text-white/55">{text}</div>;
}

function KpiCard({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: string | number;
  subvalue?: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-sky-300/10">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
        {label}
      </div>

      <div className="mt-4 break-words text-3xl font-black leading-tight text-sky-100">
        {value}
      </div>

      {subvalue && (
        <div className="mt-2 break-words text-sm font-bold text-white/45">
          {subvalue}
        </div>
      )}
    </div>
  );
}

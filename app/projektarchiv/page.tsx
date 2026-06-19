"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Projekt = {
  id: number | string;
  kunde: string | null;
  kommission: string | null;
  projektname?: string | null;
  name?: string | null;
  status?: string | null;
};

type Arbeitszeit = {
  id: number | string;
  datum: string | null;
  projekt: string | null;
  bereich?: string | null;
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

export default function ProjektarchivPage() {
  const [projekte, setProjekte] = useState<Projekt[]>([]);
  const [zeiten, setZeiten] = useState<Arbeitszeit[]>([]);
  const [offen, setOffen] = useState<number | string | null>(null);
  const [meldung, setMeldung] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ladeArchiv();
  }, []);

  async function ladeArchiv() {
    setLoading(true);
    setMeldung("");

    const { data: projektData, error: projektError } = await supabase
      .from("projekte")
      .select("*")
      .eq("status", "Abgeschlossen")
      .order("kunde", { ascending: true })
      .order("kommission", { ascending: true });

    const { data: zeitenData, error: zeitenError } = await supabase
      .from("arbeitszeiten")
      .select("*")
      .order("datum", { ascending: false });

    if (projektError) {
      setMeldung(projektError.message);
      setLoading(false);
      return;
    }

    if (zeitenError) {
      setMeldung(zeitenError.message);
      setLoading(false);
      return;
    }

    setProjekte((projektData || []) as Projekt[]);
    setZeiten((zeitenData || []) as Arbeitszeit[]);
    setLoading(false);
  }

  function projektAnzeige(projekt: Projekt) {
    if (projekt.name) return projekt.name;
    if (projekt.projektname) return projekt.projektname;
    if (projekt.kunde === "Intern") return projekt.kommission || "Intern";
    return `${projekt.kunde || "-"} - ${projekt.kommission || "-"}`;
  }

  function zeitenFuerProjekt(projekt: Projekt) {
    const moeglicheNamen = [
      projektAnzeige(projekt),
      projekt.name,
      projekt.projektname,
      projekt.kommission,
      projekt.kunde && projekt.kommission
        ? `${projekt.kunde} - ${projekt.kommission}`
        : null,
    ].filter(Boolean);

    return zeiten.filter((zeit) => zeit.projekt && moeglicheNamen.includes(zeit.projekt));
  }

  function stundenFuerProjekt(projekt: Projekt) {
    return zeitenFuerProjekt(projekt).reduce(
      (sum, zeit) => sum + Number(zeit.stunden || 0),
      0
    );
  }

  const gesamtStunden = useMemo(
    () => projekte.reduce((sum, projekt) => sum + stundenFuerProjekt(projekt), 0),
    [projekte, zeiten]
  );

  const gesamtBuchungen = useMemo(
    () => projekte.reduce((sum, projekt) => sum + zeitenFuerProjekt(projekt).length, 0),
    [projekte, zeiten]
  );

  const topProjekt = useMemo(() => {
    return [...projekte].sort(
      (a, b) => stundenFuerProjekt(b) - stundenFuerProjekt(a)
    )[0];
  }, [projekte, zeiten]);

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
                  Archiv
                </div>

                <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Projektarchiv
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
                  Abgeschlossene Projekte mit Stunden, Buchungen und Detailübersicht
                  für spätere Folgeaufträge.
                </p>
              </div>

              <button
                type="button"
                onClick={ladeArchiv}
                disabled={loading}
                className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-sky-300/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Lädt..." : "Archiv aktualisieren"}
              </button>
            </div>
          </div>
        </section>

        {meldung && (
          <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-5 text-sm font-bold text-red-100">
            {meldung}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Archivierte Projekte" value={projekte.length} />
          <KpiCard
            label="Archivstunden"
            value={formatStunden(gesamtStunden)}
            subvalue={formatDezimal(gesamtStunden)}
          />
          <KpiCard label="Buchungen" value={gesamtBuchungen} />
          <KpiCard
            label="Top Archivprojekt"
            value={topProjekt ? projektAnzeige(topProjekt) : "-"}
            subvalue={topProjekt ? formatStunden(stundenFuerProjekt(topProjekt)) : "0 h"}
          />
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="border-b border-white/10 px-5 py-5 sm:px-6">
            <h2 className="text-xl font-black text-white">Abgeschlossene Projekte</h2>
            <p className="mt-1 text-sm leading-6 text-white/50">
              Projektübersicht mit Stunden und Detailbuchungen.
            </p>
          </div>

          {loading ? (
            <EmptyState text="Lade Projektarchiv..." />
          ) : projekte.length === 0 ? (
            <EmptyState text="Keine abgeschlossenen Projekte im Archiv." />
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs font-black uppercase tracking-[0.2em] text-white/35">
                      <th className="p-5">Kunde</th>
                      <th className="p-5">Projekt</th>
                      <th className="p-5 text-right">Stunden</th>
                      <th className="p-5 text-center">Buchungen</th>
                      <th className="p-5 text-right">Aktion</th>
                    </tr>
                  </thead>

                  <tbody>
                    {projekte.map((projekt) => (
                      <ProjektZeile
                        key={projekt.id}
                        projekt={projekt}
                        istOffen={offen === projekt.id}
                        projektAnzeige={projektAnzeige}
                        projektZeiten={zeitenFuerProjekt(projekt)}
                        gesamtstunden={stundenFuerProjekt(projekt)}
                        onToggle={() => setOffen(offen === projekt.id ? null : projekt.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4 p-5 lg:hidden">
                {projekte.map((projekt) => {
                  const projektZeiten = zeitenFuerProjekt(projekt);
                  const gesamtstunden = stundenFuerProjekt(projekt);
                  const istOffen = offen === projekt.id;

                  return (
                    <div
                      key={projekt.id}
                      className="rounded-3xl border border-white/10 bg-black/25 p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                            {projekt.kunde || "-"}
                          </p>
                          <h3 className="mt-2 break-words text-xl font-black text-white">
                            {projekt.projektname || projekt.kommission || "-"}
                          </h3>
                        </div>

                        <span className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-200">
                          Archiv
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <MiniStat label="Stunden" value={formatStunden(gesamtstunden)} />
                        <MiniStat label="Buchungen" value={projektZeiten.length} />
                      </div>

                      <button
                        type="button"
                        onClick={() => setOffen(istOffen ? null : projekt.id)}
                        className="mt-5 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
                      >
                        {istOffen ? "Details schließen" : "Details öffnen"}
                      </button>

                      {istOffen && (
                        <DetailsBlock
                          projektZeiten={projektZeiten}
                          gesamtstunden={gesamtstunden}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function ProjektZeile({
  projekt,
  istOffen,
  projektAnzeige,
  projektZeiten,
  gesamtstunden,
  onToggle,
}: {
  projekt: Projekt;
  istOffen: boolean;
  projektAnzeige: (projekt: Projekt) => string;
  projektZeiten: Arbeitszeit[];
  gesamtstunden: number;
  onToggle: () => void;
}) {
  return (
    <Fragment>
      <tr className="border-b border-white/10 transition hover:bg-sky-300/[0.03]">
        <td className="p-5 font-black text-white">{projekt.kunde || "-"}</td>

        <td className="p-5 text-white/75">
          {projekt.projektname || projekt.kommission || projektAnzeige(projekt)}
        </td>

        <td className="p-5 text-right">
          <div className="text-xl font-black text-sky-100">
            {formatStunden(gesamtstunden)}
          </div>
          <div className="mt-1 text-xs font-bold text-white/35">
            {formatDezimal(gesamtstunden)}
          </div>
        </td>

        <td className="p-5 text-center">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-black text-white/80">
            {projektZeiten.length}
          </span>
        </td>

        <td className="p-5 text-right">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-sky-300/10"
          >
            {istOffen ? "Schließen" : "Details"}
          </button>
        </td>
      </tr>

      {istOffen && (
        <tr>
          <td colSpan={5} className="border-b border-white/10 bg-black/20 p-5">
            <DetailsBlock
              projektZeiten={projektZeiten}
              gesamtstunden={gesamtstunden}
            />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function DetailsBlock({
  projektZeiten,
  gesamtstunden,
}: {
  projektZeiten: Arbeitszeit[];
  gesamtstunden: number;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h3 className="text-xl font-black text-white">Arbeitszeiten</h3>
          <p className="mt-1 text-sm text-white/50">
            {projektZeiten.length} Buchungen auf diesem Projekt
          </p>
        </div>

        <div className="md:text-right">
          <div className="text-3xl font-black text-sky-100">
            {formatStunden(gesamtstunden)}
          </div>
          <div className="mt-1 text-sm font-bold text-white/40">
            {formatDezimal(gesamtstunden)}
          </div>
        </div>
      </div>

      {projektZeiten.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-white/55">
          Keine Arbeitszeiten zu diesem Projekt gefunden.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {projektZeiten.map((zeit) => (
            <div
              key={zeit.id}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-black text-white">{zeit.datum || "-"}</div>
                  <div className="mt-1 text-sm text-white/45">
                    {zeit.bereich || "Ohne Bereich"}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-sky-100">
                    {formatStunden(Number(zeit.stunden || 0))}
                  </div>
                  <div className="mt-1 text-xs font-bold text-white/35">
                    {formatDezimal(Number(zeit.stunden || 0))}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs font-bold text-white/35">
                {zeit.projekt || "-"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
        {label}
      </div>
      <div className="mt-2 break-words text-lg font-black text-sky-100">
        {value}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="p-6 text-sm font-bold text-white/55">{text}</div>;
}

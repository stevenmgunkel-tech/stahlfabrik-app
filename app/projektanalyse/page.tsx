"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Ansicht = "aktiv" | "archiv";

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

type BereichStat = {
  bereich: string;
  stunden: number;
};

type ProjektStat = {
  projekt: Projekt;
  titel: string;
  kunde: string;
  status: string;
  stunden: number;
  buchungen: Arbeitszeit[];
  bereiche: BereichStat[];
};

const PROJEKTE_PRO_SEITE = 10;

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

export default function ProjektanalysePage() {
  const [ansicht, setAnsicht] = useState<Ansicht>("aktiv");
  const [projekte, setProjekte] = useState<Projekt[]>([]);
  const [zeiten, setZeiten] = useState<Arbeitszeit[]>([]);
  const [loading, setLoading] = useState(true);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [offen, setOffen] = useState<number | string | null>(null);
  const [projektSeite, setProjektSeite] = useState(1);
  const [bereichOffen, setBereichOffen] = useState(true);
  const [projektOffen, setProjektOffen] = useState(true);

  useEffect(() => {
    ladeDaten();
  }, []);

  useEffect(() => {
    setProjektSeite(1);
    setOffen(null);
  }, [ansicht]);

  async function ladeDaten() {
    setLoading(true);
    setMeldung(null);

    const { data: projektData, error: projektError } = await supabase
      .from("projekte")
      .select("*")
      .order("kunde", { ascending: true })
      .order("kommission", { ascending: true });

    if (projektError) {
      setMeldung(projektError.message);
      setLoading(false);
      return;
    }

    const { data: zeitenData, error: zeitenError } = await supabase
      .from("arbeitszeiten")
      .select("*")
      .order("datum", { ascending: false });

    if (zeitenError) {
      setMeldung(zeitenError.message);
      setLoading(false);
      return;
    }

    setProjekte((projektData || []) as Projekt[]);
    setZeiten((zeitenData || []) as Arbeitszeit[]);
    setProjektSeite(1);
    setOffen(null);
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
    ].filter(Boolean) as string[];

    return zeiten.filter(
      (zeit) => zeit.projekt && moeglicheNamen.includes(zeit.projekt),
    );
  }

  const gefilterteProjekte = useMemo(() => {
    return projekte.filter((projekt) => {
      const status = projekt.status || "Aktiv";
      if (ansicht === "archiv") return status === "Abgeschlossen";
      return status !== "Abgeschlossen";
    });
  }, [projekte, ansicht]);

  const projektDaten = useMemo<ProjektStat[]>(() => {
    return gefilterteProjekte
      .map((projekt) => {
        const buchungen = zeitenFuerProjekt(projekt);
        const bereichMap: Record<string, number> = {};
        const stunden = buchungen.reduce((sum, zeit) => {
          const wert = Number(zeit.stunden || 0);
          const bereich = zeit.bereich?.trim() || "Ohne Bereich";
          if (Number.isFinite(wert) && wert > 0) {
            bereichMap[bereich] = (bereichMap[bereich] || 0) + wert;
            return sum + wert;
          }
          return sum;
        }, 0);

        return {
          projekt,
          titel: projektAnzeige(projekt),
          kunde: projekt.kunde || "-",
          status: projekt.status || "Aktiv",
          stunden,
          buchungen,
          bereiche: Object.entries(bereichMap)
            .map(([bereich, wert]) => ({ bereich, stunden: wert }))
            .sort((a, b) => b.stunden - a.stunden),
        };
      })
      .sort((a, b) => b.stunden - a.stunden);
  }, [gefilterteProjekte, zeiten]);

  const bereichDaten = useMemo<BereichStat[]>(() => {
    const bereichMap: Record<string, number> = {};

    projektDaten.forEach((projekt) => {
      projekt.bereiche.forEach((bereich) => {
        bereichMap[bereich.bereich] =
          (bereichMap[bereich.bereich] || 0) + bereich.stunden;
      });
    });

    return Object.entries(bereichMap)
      .map(([bereich, wert]) => ({ bereich, stunden: wert }))
      .sort((a, b) => b.stunden - a.stunden);
  }, [projektDaten]);

  const gesamtStunden = useMemo(
    () => projektDaten.reduce((sum, projekt) => sum + projekt.stunden, 0),
    [projektDaten],
  );

  const gesamtBuchungen = useMemo(
    () =>
      projektDaten.reduce((sum, projekt) => sum + projekt.buchungen.length, 0),
    [projektDaten],
  );

  const aktiveProjekte = useMemo(
    () =>
      projekte.filter((projekt) => projekt.status !== "Abgeschlossen").length,
    [projekte],
  );

  const archivProjekte = useMemo(
    () =>
      projekte.filter((projekt) => projekt.status === "Abgeschlossen").length,
    [projekte],
  );

  const topProjekt = projektDaten[0];
  const topBereich = bereichDaten[0];

  const gesamtProjektSeiten = Math.max(
    1,
    Math.ceil(projektDaten.length / PROJEKTE_PRO_SEITE),
  );

  const sichtbareProjekte = useMemo(() => {
    const start = (projektSeite - 1) * PROJEKTE_PRO_SEITE;
    return projektDaten.slice(start, start + PROJEKTE_PRO_SEITE);
  }, [projektDaten, projektSeite]);

  const ersterProjektIndex =
    projektDaten.length === 0 ? 0 : (projektSeite - 1) * PROJEKTE_PRO_SEITE + 1;

  const letzterProjektIndex = Math.min(
    projektSeite * PROJEKTE_PRO_SEITE,
    projektDaten.length,
  );

  return (
    <main className="space-y-8 text-slate-100">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-black/20 p-7 shadow-2xl shadow-black/30 lg:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-[0.34]">
          <div
            className="h-full w-full bg-cover bg-[center_20%]"
            style={{
              backgroundImage: "url('/berg.png')",
              filter: "brightness(1.55) contrast(1.05)",
            }}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />

        <div className="relative z-10 flex flex-col justify-between gap-8 xl:flex-row xl:items-end">
          <div>
            <div className="inline-flex rounded-full border border-slate-400/25 bg-slate-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-slate-200">
              ODZ SILVER · Projekte
            </div>

            <h1 className="mt-5 text-5xl font-black tracking-tight text-white lg:text-7xl">
              Projektanalyse
            </h1>

            <p className="mt-4 max-w-2xl text-lg font-medium text-white/65">
              Statistik und Archiv in einer Kommandozentrale. Zeigt, wo die Zeit im Unternehmen wirklich hingeht.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <AnsichtButton
                active={ansicht === "aktiv"}
                label="Aktive Projekte"
                count={aktiveProjekte}
                onClick={() => setAnsicht("aktiv")}
              />
              <AnsichtButton
                active={ansicht === "archiv"}
                label="Archiv"
                count={archivProjekte}
                onClick={() => setAnsicht("archiv")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-black/25 p-4 text-center backdrop-blur-xl sm:grid-cols-4 xl:grid-cols-2">
            <HeroMini label="Ansicht" value={ansicht === "aktiv" ? "Aktiv" : "Archiv"} blue />
            <HeroMini label="Projekte" value={projektDaten.length} />
            <HeroMini label="Stunden" value={formatStunden(gesamtStunden)} blue />
            <HeroMini label="Buchungen" value={gesamtBuchungen} green />
          </div>
        </div>

        <button
          onClick={ladeDaten}
          disabled={loading}
          className="relative z-10 mt-7 rounded-2xl border border-slate-200/30 bg-slate-200/10 px-5 py-3 text-sm font-black text-slate-100 shadow-lg shadow-slate-200/10 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:bg-sky-300/10 hover:shadow-sky-300/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Lädt..." : "Daten aktualisieren"}
        </button>
      </section>

        {meldung && (
          <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-5 text-sm font-bold text-red-100">
            {meldung}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={
              ansicht === "aktiv" ? "Aktive Projekte" : "Archivierte Projekte"
            }
            value={projektDaten.length}
            subvalue="in dieser Ansicht"
          />
          <KpiCard
            label="Gebuchte Stunden"
            value={formatStunden(gesamtStunden)}
            subvalue={formatDezimal(gesamtStunden)}
          />
          <KpiCard label="Buchungen" value={gesamtBuchungen} />
          <KpiCard
            label={topProjekt ? "Top Projekt" : "Top Projekt"}
            value={topProjekt?.titel || "-"}
            subvalue={topProjekt ? formatStunden(topProjekt.stunden) : "0 h"}
          />
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] shadow-2xl shadow-black/30 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setBereichOffen(!bereichOffen)}
            className="flex w-full flex-col gap-3 border-b border-white/10 px-5 py-5 text-left transition hover:bg-sky-300/[0.03] sm:px-6 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <h2 className="text-xl font-black text-white">
                Bereichsauswertung
              </h2>
              <p className="mt-1 text-sm leading-6 text-white/50">
                Werkstatt, Montage, Planung, Logistik und weitere Bereiche nach
                Stunden.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white">
              {bereichOffen ? "▲ Schließen" : "▼ Öffnen"}
            </div>
          </button>

          {bereichOffen && (
            <>
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
            </>
          )}
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] shadow-2xl shadow-black/30 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setProjektOffen(!projektOffen)}
            className="flex w-full flex-col gap-4 border-b border-white/10 px-5 py-5 text-left transition hover:bg-sky-300/[0.03] sm:px-6 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <h2 className="text-xl font-black text-white">
                {ansicht === "aktiv"
                  ? "Aktive Projekte"
                  : "Archivierte Projekte"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-white/50">
                Maximal 10 Projekte pro Seite, inklusive Bereichsstunden und
                Detailbuchungen.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!loading && projektDaten.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-2 text-xs font-black text-white/55">
                  {ersterProjektIndex}–{letzterProjektIndex} von{" "}
                  {projektDaten.length}
                </div>
              )}
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white">
                {projektOffen ? "▲ Schließen" : "▼ Öffnen"}
              </div>
            </div>
          </button>

          {projektOffen && (
            <>
              {!loading && projektDaten.length > PROJEKTE_PRO_SEITE && (
                <Pagination
                  seite={projektSeite}
                  gesamtSeiten={gesamtProjektSeiten}
                  onZurueck={() =>
                    setProjektSeite((seite) => Math.max(1, seite - 1))
                  }
                  onWeiter={() =>
                    setProjektSeite((seite) =>
                      Math.min(gesamtProjektSeiten, seite + 1),
                    )
                  }
                />
              )}

              {loading ? (
                <EmptyState text="Lade Projekte..." />
              ) : projektDaten.length === 0 ? (
                <EmptyState
                  text={
                    ansicht === "aktiv"
                      ? "Keine aktiven Projekte gefunden."
                      : "Keine abgeschlossenen Projekte im Archiv."
                  }
                />
              ) : (
                <div className="divide-y divide-white/10">
                  {sichtbareProjekte.map((projekt, index) => (
                    <ProjektBlock
                      key={projekt.projekt.id}
                      projekt={projekt}
                      rang={(projektSeite - 1) * PROJEKTE_PRO_SEITE + index + 1}
                      gesamtStunden={gesamtStunden}
                      istOffen={offen === projekt.projekt.id}
                      onToggle={() =>
                        setOffen(
                          offen === projekt.projekt.id
                            ? null
                            : projekt.projekt.id,
                        )
                      }
                    />
                  ))}
                </div>
              )}

              {!loading && projektDaten.length > PROJEKTE_PRO_SEITE && (
                <Pagination
                  seite={projektSeite}
                  gesamtSeiten={gesamtProjektSeiten}
                  onZurueck={() =>
                    setProjektSeite((seite) => Math.max(1, seite - 1))
                  }
                  onWeiter={() =>
                    setProjektSeite((seite) =>
                      Math.min(gesamtProjektSeiten, seite + 1),
                    )
                  }
                />
              )}
            </>
          )}
        </section>
    </main>
  );
}

function HeroMini({
  label,
  value,
  blue,
  green,
}: {
  label: string;
  value: string | number;
  blue?: boolean;
  green?: boolean;
}) {
  const color = blue ? "text-sky-200" : green ? "text-green-400" : "text-slate-100";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-sky-300/25 hover:bg-sky-300/5">
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
        {label}
      </div>
    </div>
  );
}

function AnsichtButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-sm font-black transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10 ${
        active
          ? "border-sky-300/25 bg-sky-300/10 text-sky-100"
          : "border-white/10 bg-white/10 text-white/65"
      }`}
    >
      {label} · {count}
    </button>
  );
}

function ProjektBlock({
  projekt,
  rang,
  gesamtStunden,
  istOffen,
  onToggle,
}: {
  projekt: ProjektStat;
  rang: number;
  gesamtStunden: number;
  istOffen: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="p-5 transition hover:bg-sky-300/[0.03] sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white/60">
              #{rang}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2 text-xs font-black text-white/45">
              {projekt.status}
            </div>

            <h2 className="break-words text-2xl font-black text-white">
              {projekt.titel}
            </h2>
          </div>

          <p className="mt-3 text-sm text-white/45">
            {projekt.kunde} · {projekt.buchungen.length} Buchungen ·{" "}
            {projekt.bereiche.length} Bereiche ·{" "}
            {prozent(projekt.stunden, gesamtStunden).toFixed(0)}% der Ansicht
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
          style={{ width: `${prozent(projekt.stunden, gesamtStunden)}%` }}
        />
      </div>

      {projekt.bereiche.length > 0 && (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {projekt.bereiche.map((bereich) => (
            <div
              key={`${projekt.titel}-${bereich.bereich}`}
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
      )}

      <button
        type="button"
        onClick={onToggle}
        className="mt-5 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white shadow-lg shadow-black/20 transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-sky-300/10"
      >
        {istOffen ? "▲ Schließen" : "▼ Öffnen"}
      </button>

      {istOffen && <DetailsBlock buchungen={projekt.buchungen} />}
    </article>
  );
}

function DetailsBlock({ buchungen }: { buchungen: Arbeitszeit[] }) {
  return (
    <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-5">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h3 className="text-xl font-black text-white">Detailbuchungen</h3>
          <p className="mt-1 text-sm text-white/50">
            {buchungen.length} Arbeitszeiten auf diesem Projekt
          </p>
        </div>
      </div>

      {buchungen.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-white/55">
          Keine Arbeitszeiten zu diesem Projekt gefunden.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {buchungen.map((zeit) => (
            <div
              key={zeit.id}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-black text-white">
                    {zeit.datum || "-"}
                  </div>
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

function Pagination({
  seite,
  gesamtSeiten,
  onZurueck,
  onWeiter,
}: {
  seite: number;
  gesamtSeiten: number;
  onZurueck: () => void;
  onWeiter: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
      <button
        type="button"
        onClick={onZurueck}
        disabled={seite === 1}
        className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ◀ Zurück
      </button>

      <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-xs font-black text-sky-100">
        Seite {seite} / {gesamtSeiten}
      </div>

      <button
        type="button"
        onClick={onWeiter}
        disabled={seite === gesamtSeiten}
        className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Weiter ▶
      </button>
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
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-sky-300/10">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
        {label}
      </div>

      <div className="mt-4 break-words text-4xl font-black leading-tight text-slate-100">
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

function EmptyState({ text }: { text: string }) {
  return <div className="p-6 text-sm font-bold text-white/55">{text}</div>;
}

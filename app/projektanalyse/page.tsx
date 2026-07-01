"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  startzeit?: string | null;
  endzeit?: string | null;
  user_id?: string | null;
};

type Mitarbeiter = {
  id: number | string;
  user_id: string | null;
  name: string | null;
  rolle?: string | null;
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

function formatDatum(wert?: string | null) {
  if (!wert) return "-";

  const [jahr, monat, tag] = String(wert).slice(0, 10).split("-");

  if (!jahr || !monat || !tag) return wert;

  return `${tag}.${monat}.${jahr}`;
}

function formatZeit(wert?: string | null) {
  if (!wert) return "--:--";
  return String(wert).slice(0, 5);
}

function formatVonBis(startzeit?: string | null, endzeit?: string | null) {
  const start = formatZeit(startzeit);
  const ende = formatZeit(endzeit);

  if (start === "--:--" && ende === "--:--") return "Keine Zeit";
  return `${start} - ${ende}`;
}

export default function ProjektanalysePage() {
  const [ansicht, setAnsicht] = useState<Ansicht>("aktiv");
  const [projekte, setProjekte] = useState<Projekt[]>([]);
  const [zeiten, setZeiten] = useState<Arbeitszeit[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
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

    const { data: mitarbeiterData, error: mitarbeiterError } = await supabase
      .from("mitarbeiter")
      .select("id, user_id, name, rolle")
      .order("name", { ascending: true });

    if (mitarbeiterError) {
      setMeldung(mitarbeiterError.message);
      setLoading(false);
      return;
    }

    setProjekte((projektData || []) as Projekt[]);
    setZeiten((zeitenData || []) as Arbeitszeit[]);
    setMitarbeiter((mitarbeiterData || []) as Mitarbeiter[]);
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

  const mitarbeiterMap = useMemo(() => {
    const map: Record<string, string> = {};

    mitarbeiter.forEach((person) => {
      if (person.user_id) {
        map[String(person.user_id)] = person.name || "Unbekannt";
      }
    });

    return map;
  }, [mitarbeiter]);

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
    <main className="projektanalyse-v12 space-y-6 text-slate-950">
      <section className="v12-hero relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-[#302720]/90 via-[#26272a]/90 to-[#161719]/95 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.16)] lg:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-[0.46]">
          <div
            className="h-full w-full bg-cover bg-[center_20%]"
            style={{
              backgroundImage: "url('/berg.png')",
              filter: "brightness(1.45) contrast(1.04) saturate(0.92)",
            }}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#1a1512]/90 via-[#26231f]/60 to-[#f4eee5]/10" />

        <div className="relative z-10 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <div className="inline-flex rounded-full border border-orange-200/30 bg-orange-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-orange-100">
              ODZ V1.2 · Projektanalyse
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Projektanalyse
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/65 sm:text-base">
              Statistik und Archiv in einer Kommandozentrale. Zeigt, wo die Zeit im Unternehmen wirklich hingeht.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-xl">
                <span className="h-3 w-3 rounded-full bg-green-400 shadow-lg shadow-green-400/40" />
                <span className="text-xs font-black uppercase tracking-widest text-white/70">
                  {ansicht === "aktiv" ? "Aktive Projekte" : "Archiv"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-3xl border border-white/10 bg-black/25 p-2 text-center backdrop-blur-xl sm:p-3 md:grid-cols-4">
            <HeroMini label="Ansicht" value={ansicht === "aktiv" ? "Aktiv" : "Archiv"} blue />
            <HeroMini label="Projekte" value={String(projektDaten.length).padStart(2, "0")} />
            <HeroMini label="Bereiche" value={String(bereichDaten.length).padStart(2, "0")} />
            <HeroMini label="Seite" value={`${projektSeite}/${gesamtProjektSeiten}`} green />
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-white/60 bg-white/35 p-2 shadow-[0_14px_44px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <ActionCard href="#projekte" label="Ansicht" title="📋 Aktiv" onClick={() => setAnsicht("aktiv")} />
          <ActionCard href="#projekte" label="Archiv" title="🗄️ Archiv" onClick={() => setAnsicht("archiv")} />
          <ActionCard href="#bereiche" label="Bereiche" title="📊 Auswertung" onClick={() => setBereichOffen(true)} />
          <ActionCard href="#analyse" label="Refresh" title={loading ? "⏳ Lädt" : "↻ Aktualisieren"} onClick={ladeDaten} />
        </div>
      </section>

      {meldung && (
        <div className="rounded-xl border border-orange-200/40 bg-orange-100/60 p-4 text-sm font-bold text-slate-950">
          {meldung}
        </div>
      )}

      <DropdownPanel
        id="analyse"
        title="Kennzahlen"
        eyebrow="Stunden · Buchungen · Top Projekt"
        description="Große variable Werte bleiben bewusst im Inhaltsbereich, damit der Hero ruhig bleibt."
        open={true}
        onToggle={() => {}}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={ansicht === "aktiv" ? "Aktive Projekte" : "Archivierte Projekte"}
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
            label="Top Projekt"
            value={topProjekt?.titel || "-"}
            subvalue={topProjekt ? formatStunden(topProjekt.stunden) : "0 h"}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setAnsicht("aktiv")}
            className={`rounded-2xl border px-4 py-3 text-sm font-black transition hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-300/5 hover:shadow-lg hover:shadow-orange-900/10 ${
              ansicht === "aktiv"
                ? "border-orange-300/50 bg-orange-100/60 text-slate-950 shadow-lg shadow-orange-900/10"
                : "border-white/70 bg-white/55 text-slate-500"
            }`}
          >
            Aktive Projekte · {aktiveProjekte}
          </button>

          <button
            type="button"
            onClick={() => setAnsicht("archiv")}
            className={`rounded-2xl border px-4 py-3 text-sm font-black transition hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-300/5 hover:shadow-lg hover:shadow-orange-900/10 ${
              ansicht === "archiv"
                ? "border-orange-300/50 bg-orange-100/60 text-slate-950 shadow-lg shadow-orange-900/10"
                : "border-white/70 bg-white/55 text-slate-500"
            }`}
          >
            Archiv · {archivProjekte}
          </button>

          <button
            type="button"
            onClick={ladeDaten}
            disabled={loading}
            className="rounded-2xl border border-orange-200/50 bg-orange-100/60 px-4 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-1 hover:border-orange-300/50 hover:bg-orange-100/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Lädt..." : "Daten aktualisieren"}
          </button>
        </div>
      </DropdownPanel>

      <DropdownPanel
        id="bereiche"
        title="Bereichsauswertung"
        eyebrow="Werkstatt · Montage · Planung"
        description="Bereiche nach Stunden in der aktuellen Projektansicht."
        open={bereichOffen}
        onToggle={() => setBereichOffen(!bereichOffen)}
      >
        {loading ? (
          <EmptyState text="Lade Bereichsdaten..." />
        ) : bereichDaten.length === 0 ? (
          <EmptyState text="Noch keine Bereichsdaten vorhanden." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {bereichDaten.map((bereich, index) => (
              <div
                key={bereich.bereich}
                className="rounded-3xl border border-white/70 bg-white/60 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-50/80 hover:shadow-lg hover:shadow-orange-900/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-slate-950">
                      {bereich.bereich}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                      Rang {index + 1}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-300/50 bg-emerald-100/70 px-3 py-2 text-xs font-black text-emerald-800">
                    {prozent(bereich.stunden, gesamtStunden).toFixed(0)}%
                  </div>
                </div>

                <div className="mt-5 text-3xl font-black text-orange-800">
                  {formatStunden(bereich.stunden)}
                </div>

                <div className="mt-2 text-sm font-bold text-slate-500">
                  {formatDezimal(bereich.stunden)}
                </div>

                <div className="mt-5 overflow-hidden rounded-full bg-stone-900/10">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-orange-300 to-emerald-300"
                    style={{
                      width: `${prozent(bereich.stunden, gesamtStunden)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownPanel>

      <DropdownPanel
        id="projekte"
        title={ansicht === "aktiv" ? "Aktive Projekte" : "Archivierte Projekte"}
        eyebrow="Projektstunden · Bereiche · Details"
        description="Maximal 10 Projekte pro Seite, inklusive Bereichsstunden und Detailbuchungen."
        open={projektOffen}
        onToggle={() => setProjektOffen(!projektOffen)}
      >
        {!loading && projektDaten.length > 0 && (
          <div className="rounded-2xl border border-white/70 bg-white/55 px-4 py-3 text-xs font-black text-slate-500">
            {ersterProjektIndex}–{letzterProjektIndex} von {projektDaten.length}
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
          <div className="divide-y divide-white/70 overflow-hidden rounded-2xl border border-white/70 bg-white/55 shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
            {sichtbareProjekte.map((projekt, index) => (
              <ProjektBlock
                key={projekt.projekt.id}
                projekt={projekt}
                rang={(projektSeite - 1) * PROJEKTE_PRO_SEITE + index + 1}
                gesamtStunden={gesamtStunden}
                mitarbeiterMap={mitarbeiterMap}
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
      </DropdownPanel>
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
  const color = blue ? "text-orange-200" : green ? "text-emerald-300" : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-center transition hover:border-orange-200/40 hover:bg-orange-300/10">
      <div className={`text-xl font-black leading-tight md:text-2xl ${color}`}>{value}</div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/50">{label}</div>
    </div>
  );
}


function ActionCard({
  href,
  label,
  title,
  onClick,
}: {
  href: string;
  label: string;
  title: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="group block w-full rounded-2xl border border-white/70 bg-white/55 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-50/80 hover:shadow-lg hover:shadow-orange-900/10"
    >
      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 text-base font-black text-slate-950">{title}</div>
    </a>
  );
}


function DropdownPanel({
  id,
  title,
  eyebrow,
  description,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section id={id} className="overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white/[0.08] to-white/[0.025] shadow-2xl shadow-slate-900/10">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col justify-between gap-4 p-6 text-left transition hover:bg-orange-300/5 lg:flex-row lg:items-center lg:p-7"
      >
        <div>
          <div className="text-xs font-black uppercase tracking-[0.24em] text-orange-800">{eyebrow}</div>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-slate-500">{description}</p>
        </div>

        <div className="rounded-2xl border border-orange-200/50 bg-orange-100/60 px-5 py-3 text-sm font-black text-slate-950 transition hover:border-orange-300/40 hover:bg-orange-300/10 hover:text-orange-700">
          {open ? "Schließen ▲" : "Öffnen ▼"}
        </div>
      </button>

      {open && <div className="space-y-6 border-t border-white/70 p-6 lg:p-7">{children}</div>}
    </section>
  );
}


function ProjektBlock({
  projekt,
  rang,
  gesamtStunden,
  mitarbeiterMap,
  istOffen,
  onToggle,
}: {
  projekt: ProjektStat;
  rang: number;
  gesamtStunden: number;
  mitarbeiterMap: Record<string, string>;
  istOffen: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="p-5 transition hover:bg-orange-300/[0.03] sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-xs font-black text-slate-600">
              #{rang}
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/55 px-3 py-2 text-xs font-black text-slate-500">
              {projekt.status}
            </div>

            <h2 className="break-words text-2xl font-black text-slate-950">
              {projekt.titel}
            </h2>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            {projekt.kunde} · {projekt.buchungen.length} Buchungen ·{" "}
            {projekt.bereiche.length} Bereiche ·{" "}
            {prozent(projekt.stunden, gesamtStunden).toFixed(0)}% der Ansicht
          </p>
        </div>

        <div className="lg:text-right">
          <div className="text-3xl font-black text-orange-800">
            {formatStunden(projekt.stunden)}
          </div>
          <div className="mt-1 text-sm font-bold text-slate-500">
            {formatDezimal(projekt.stunden)}
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-full bg-stone-900/10">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-orange-300 to-emerald-300"
          style={{ width: `${prozent(projekt.stunden, gesamtStunden)}%` }}
        />
      </div>

      {projekt.bereiche.length > 0 && (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {projekt.bereiche.map((bereich) => (
            <div
              key={`${projekt.titel}-${bereich.bereich}`}
              className="rounded-2xl border border-white/70 bg-white/55 p-4 transition hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-50/80 hover:shadow-lg hover:shadow-orange-900/10"
            >
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                {bereich.bereich}
              </div>

              <div className="mt-3 text-2xl font-black text-slate-950">
                {formatStunden(bereich.stunden)}
              </div>

              <div className="mt-1 text-sm font-bold text-slate-500">
                {formatDezimal(bereich.stunden)}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onToggle}
        className="mt-5 rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm font-black text-slate-950 shadow-lg shadow-slate-900/10 transition hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-50/80 hover:shadow-orange-900/10"
      >
        {istOffen ? "▲ Schließen" : "▼ Öffnen"}
      </button>

      {istOffen && (
        <DetailsBlock
          buchungen={projekt.buchungen}
          mitarbeiterMap={mitarbeiterMap}
        />
      )}
    </article>
  );
}


function DetailsBlock({
  buchungen,
  mitarbeiterMap,
}: {
  buchungen: Arbeitszeit[];
  mitarbeiterMap: Record<string, string>;
}) {
  const sortierteBuchungen = [...buchungen].sort((a, b) => {
    const datumA = `${a.datum || ""} ${a.startzeit || ""}`;
    const datumB = `${b.datum || ""} ${b.startzeit || ""}`;
    return datumB.localeCompare(datumA);
  });

  const mitarbeiterAnzahl = new Set(
    sortierteBuchungen
      .map((zeit) => (zeit.user_id ? String(zeit.user_id) : ""))
      .filter(Boolean),
  ).size;

  return (
    <div className="mt-5 rounded-3xl border border-white/70 bg-white/55 p-5">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h3 className="text-xl font-black text-slate-950">Detailbuchungen</h3>
          <p className="mt-1 text-sm text-slate-500">
            {buchungen.length} Arbeitszeiten · {mitarbeiterAnzahl} Mitarbeiter · mit Von-Bis Übersicht
          </p>
        </div>
      </div>

      {buchungen.length === 0 ? (
        <div className="rounded-2xl border border-white/70 bg-white/55 p-4 text-slate-500">
          Keine Arbeitszeiten zu diesem Projekt gefunden.
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-white/70 lg:block">
            <div className="grid grid-cols-[1fr_1.2fr_1.3fr_1fr_0.8fr] border-b border-white/70 bg-stone-900/5 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              <div>Datum</div>
              <div>Mitarbeiter</div>
              <div>Auftrag / Bereich</div>
              <div>Von - Bis</div>
              <div className="text-right">Stunden</div>
            </div>

            {sortierteBuchungen.map((zeit) => {
              const mitarbeiterName = zeit.user_id
                ? mitarbeiterMap[String(zeit.user_id)] || "Unbekannt"
                : "Unbekannt";

              return (
                <div
                  key={zeit.id}
                  className="grid grid-cols-[1fr_1.2fr_1.3fr_1fr_0.8fr] items-center border-b border-white/70 px-4 py-4 text-sm text-slate-700 transition last:border-b-0 hover:bg-orange-300/5"
                >
                  <div className="font-black text-slate-950">
                    {formatDatum(zeit.datum)}
                  </div>

                  <div className="font-bold text-slate-700">
                    {mitarbeiterName}
                  </div>

                  <div>
                    <div className="font-black text-slate-950">
                      {zeit.projekt || "-"}
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-500">
                      {zeit.bereich || "Ohne Bereich"}
                    </div>
                  </div>

                  <div className="font-black text-orange-800">
                    {formatVonBis(zeit.startzeit, zeit.endzeit)}
                  </div>

                  <div className="text-right">
                    <div className="font-black text-slate-950">
                      {formatStunden(Number(zeit.stunden || 0))}
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-500">
                      {formatDezimal(Number(zeit.stunden || 0))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-3 lg:hidden">
            {sortierteBuchungen.map((zeit) => {
              const mitarbeiterName = zeit.user_id
                ? mitarbeiterMap[String(zeit.user_id)] || "Unbekannt"
                : "Unbekannt";

              return (
                <div
                  key={zeit.id}
                  className="rounded-2xl border border-white/70 bg-white/60 p-4 transition hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-50/80 hover:shadow-lg hover:shadow-orange-900/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-black text-slate-950">
                        {formatDatum(zeit.datum)}
                      </div>
                      <div className="mt-1 text-sm font-bold text-slate-500">
                        {mitarbeiterName}
                      </div>
                      <div className="mt-3 rounded-xl border border-orange-200/50 bg-orange-100/60 px-3 py-2 text-sm font-black text-orange-800">
                        {formatVonBis(zeit.startzeit, zeit.endzeit)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-black text-orange-800">
                        {formatStunden(Number(zeit.stunden || 0))}
                      </div>
                      <div className="mt-1 text-xs font-bold text-slate-500">
                        {formatDezimal(Number(zeit.stunden || 0))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/70 bg-white/55 p-3">
                    <div className="text-sm font-black text-slate-950">
                      {zeit.projekt || "-"}
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-500">
                      {zeit.bereich || "Ohne Bereich"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
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
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/70 px-5 py-4 sm:px-6">
      <button
        type="button"
        onClick={onZurueck}
        disabled={seite === 1}
        className="rounded-2xl border border-white/70 bg-white/60 px-4 py-2 text-sm font-black text-slate-950 transition hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-50/80 hover:shadow-lg hover:shadow-orange-900/10 disabled:cursor-not-allowed disabled:opacity-30"
      >
        ◀ Zurück
      </button>

      <div className="rounded-2xl border border-orange-200/50 bg-orange-100/60 px-4 py-2 text-xs font-black text-orange-800">
        Seite {seite} / {gesamtSeiten}
      </div>

      <button
        type="button"
        onClick={onWeiter}
        disabled={seite === gesamtSeiten}
        className="rounded-2xl border border-white/70 bg-white/60 px-4 py-2 text-sm font-black text-slate-950 transition hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-50/80 hover:shadow-lg hover:shadow-orange-900/10 disabled:cursor-not-allowed disabled:opacity-30"
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
    <div className="rounded-3xl border border-white/70 bg-white/60 p-6 shadow-[0_16px_42px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-50/80 hover:shadow-orange-900/10">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
        {label}
      </div>

      <div className="mt-4 break-words text-4xl font-black leading-tight text-slate-950">
        {value}
      </div>

      {subvalue && (
        <div className="mt-2 break-words text-sm font-bold text-slate-500">
          {subvalue}
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="p-6 text-sm font-bold text-slate-500">{text}</div>;
}

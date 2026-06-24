"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

type BereichStat = {
  bereich: string;
  stunden: number;
  anzahl: number;
};

type DetailEintrag = {
  id: number | string;
  datum: string | null;
  user_id: string | null;
  mitarbeiter: string;
  bereich: string;
  stunden: number;
  startzeit: string | null;
  endzeit: string | null;
  auto_generiert?: boolean | null;
};

type ProjektStat = {
  projekt: string;
  stunden: number;
  anzahl: number;
  bereiche: BereichStat[];
  eintraege: DetailEintrag[];
};

type ArbeitszeitEintrag = {
  id?: number | string | null;
  datum: string | null;
  user_id: string | null;
  projekt: string | null;
  bereich: string | null;
  stunden: number | string | null;
  startzeit?: string | null;
  endzeit?: string | null;
  auto_generiert?: boolean | null;
};

type Mitarbeiter = {
  user_id: string | null;
  name: string | null;
};

const PROJEKTE_PRO_SEITE = 10;

function formatDateLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getErsterTagDieserMonat() {
  const heute = new Date();
  return new Date(heute.getFullYear(), heute.getMonth(), 1);
}

function formatStunden(value: number) {
  if (!Number.isFinite(value)) return "0 min";

  const totalMinuten = Math.round(Math.abs(value) * 60);
  const stunden = Math.floor(totalMinuten / 60);
  const minuten = totalMinuten % 60;
  const prefix = value < 0 ? "-" : "";

  if (stunden <= 0) return `${prefix}${minuten} min`;
  if (minuten === 0) return `${prefix}${stunden} h`;

  return `${prefix}${stunden} h ${minuten} min`;
}

function formatDezimal(value: number) {
  if (!Number.isFinite(value)) return "0.00 h";
  return `${value.toFixed(2)} h`;
}

function prozent(wert: number, total: number) {
  if (!total || total <= 0) return 0;
  return Math.min((wert / total) * 100, 100);
}

function parseDatumLokal(wert?: string | null) {
  if (!wert) return null;

  const [jahr, monat, tag] = String(wert)
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!jahr || !monat || !tag) return null;

  return new Date(jahr, monat - 1, tag);
}

function formatDatum(wert?: string | null) {
  const datum = parseDatumLokal(wert);
  if (!datum) return "-";

  return datum.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function zeitVonBis(startzeit?: string | null, endzeit?: string | null) {
  const start = String(startzeit || "").slice(0, 5);
  const ende = String(endzeit || "").slice(0, 5);

  if (start && ende) return `${start} - ${ende}`;
  if (start) return `ab ${start}`;
  if (ende) return `bis ${ende}`;

  return "ohne Von/Bis";
}

function istInternesProjekt(name: string) {
  const sauber = name.trim().toLowerCase();
  return sauber === "betriebsunterhalt" || sauber === "intern";
}

export default function ProjektstatistikPage() {
  const [daten, setDaten] = useState<ProjektStat[]>([]);
  const [bereichDaten, setBereichDaten] = useState<BereichStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [zugriffGeprueft, setZugriffGeprueft] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [meldung, setMeldung] = useState("");
  const [projektSeite, setProjektSeite] = useState(1);
  const [suche, setSuche] = useState("");

  const [von, setVon] = useState(formatDateLocal(getErsterTagDieserMonat()));
  const [bis, setBis] = useState(formatDateLocal(new Date()));

  const [filterOffen, setFilterOffen] = useState(true);
  const [bereicheOffen, setBereicheOffen] = useState(true);
  const [projekteOffen, setProjekteOffen] = useState(true);

  useEffect(() => {
    ladeDaten(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setProjektSeite(1);
  }, [suche, von, bis]);

  async function pruefeAdmin() {
    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      window.location.href = "/login";
      return false;
    }

    const { data, error } = await supabase
      .from("mitarbeiter")
      .select("rolle")
      .eq("user_id", user.id)
      .single();

    if (error || String(data?.rolle || "").trim().toLowerCase() !== "admin") {
      window.location.href = "/";
      return false;
    }

    setIsAdmin(true);
    return true;
  }

  async function ladeDaten(initial = false) {
    if (initial) setInitialLoading(true);

    setLoading(true);
    setMeldung("");

    const erlaubt = await pruefeAdmin();

    if (!erlaubt) {
      setZugriffGeprueft(true);
      setLoading(false);
      if (initial) setInitialLoading(false);
      return;
    }

    setZugriffGeprueft(true);

    const start = von || formatDateLocal(getErsterTagDieserMonat());
    const ende = bis || formatDateLocal(new Date());

    const { data: mitarbeiterData, error: mitarbeiterError } = await supabase
      .from("mitarbeiter")
      .select("user_id, name");

    const { data, error } = await supabase
      .from("arbeitszeiten")
      .select("id, datum, user_id, projekt, bereich, stunden, startzeit, endzeit, auto_generiert")
      .gte("datum", start)
      .lte("datum", ende)
      .order("datum", { ascending: false });

    if (mitarbeiterError) {
      console.log(mitarbeiterError);
    }

    if (error) {
      console.error(error);
      setMeldung(error.message || "Projektstatistik konnte nicht geladen werden.");
      setLoading(false);
      if (initial) setInitialLoading(false);
      return;
    }

    const mitarbeiterMap = new Map<string, string>();

    ((mitarbeiterData || []) as Mitarbeiter[]).forEach((person) => {
      if (person.user_id) {
        mitarbeiterMap.set(person.user_id, person.name || "Unbekannt");
      }
    });

    const projektMap: Record<
      string,
      {
        stunden: number;
        anzahl: number;
        bereiche: Record<string, { stunden: number; anzahl: number }>;
        eintraege: DetailEintrag[];
      }
    > = {};

    const bereichMap: Record<string, { stunden: number; anzahl: number }> = {};

    ((data || []) as ArbeitszeitEintrag[]).forEach((eintrag) => {
      const projekt = String(eintrag.projekt || "").trim() || "Unbekannt";
      const bereich = String(eintrag.bereich || "").trim() || "Ohne Bereich";
      const stunden = Number(eintrag.stunden || 0);

      if (!Number.isFinite(stunden) || stunden <= 0) return;

      if (!projektMap[projekt]) {
        projektMap[projekt] = {
          stunden: 0,
          anzahl: 0,
          bereiche: {},
          eintraege: [],
        };
      }

      if (!projektMap[projekt].bereiche[bereich]) {
        projektMap[projekt].bereiche[bereich] = {
          stunden: 0,
          anzahl: 0,
        };
      }

      if (!bereichMap[bereich]) {
        bereichMap[bereich] = {
          stunden: 0,
          anzahl: 0,
        };
      }

      projektMap[projekt].stunden += stunden;
      projektMap[projekt].anzahl += 1;
      projektMap[projekt].bereiche[bereich].stunden += stunden;
      projektMap[projekt].bereiche[bereich].anzahl += 1;

      bereichMap[bereich].stunden += stunden;
      bereichMap[bereich].anzahl += 1;

      projektMap[projekt].eintraege.push({
        id: eintrag.id || `${projekt}-${bereich}-${eintrag.datum}-${projektMap[projekt].anzahl}`,
        datum: eintrag.datum || null,
        user_id: eintrag.user_id || null,
        mitarbeiter: eintrag.user_id
          ? mitarbeiterMap.get(eintrag.user_id) || "Unbekannt"
          : "Unbekannt",
        bereich,
        stunden,
        startzeit: eintrag.startzeit || null,
        endzeit: eintrag.endzeit || null,
        auto_generiert: eintrag.auto_generiert || false,
      });
    });

    const projektResult = Object.entries(projektMap)
      .map(([projekt, wert]) => ({
        projekt,
        stunden: wert.stunden,
        anzahl: wert.anzahl,
        bereiche: Object.entries(wert.bereiche)
          .map(([bereich, daten]) => ({
            bereich,
            stunden: daten.stunden,
            anzahl: daten.anzahl,
          }))
          .sort((a, b) => b.stunden - a.stunden),
        eintraege: wert.eintraege.sort((a, b) => {
          const datumVergleich = String(b.datum || "").localeCompare(String(a.datum || ""));
          if (datumVergleich !== 0) return datumVergleich;

          return String(b.id || "").localeCompare(String(a.id || ""));
        }),
      }))
      .sort((a, b) => {
        const aIntern = istInternesProjekt(a.projekt);
        const bIntern = istInternesProjekt(b.projekt);

        if (aIntern !== bIntern) return aIntern ? 1 : -1;

        return b.stunden - a.stunden;
      });

    const bereichResult = Object.entries(bereichMap)
      .map(([bereich, daten]) => ({
        bereich,
        stunden: daten.stunden,
        anzahl: daten.anzahl,
      }))
      .sort((a, b) => b.stunden - a.stunden);

    setDaten(projektResult);
    setBereichDaten(bereichResult);
    setProjektSeite(1);
    setLoading(false);
    if (initial) setInitialLoading(false);
  }

  const gefilterteDaten = useMemo(() => {
    const suchText = suche.trim().toLowerCase();

    if (!suchText) return daten;

    return daten.filter((projekt) => {
      const text = [
        projekt.projekt,
        projekt.bereiche.map((bereich) => bereich.bereich).join(" "),
        projekt.eintraege.map((eintrag) => eintrag.mitarbeiter).join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(suchText);
    });
  }, [daten, suche]);

  const gesamtStunden = useMemo(
    () => gefilterteDaten.reduce((sum, projekt) => sum + projekt.stunden, 0),
    [gefilterteDaten]
  );

  const gesamtEintraege = useMemo(
    () => gefilterteDaten.reduce((sum, projekt) => sum + projekt.anzahl, 0),
    [gefilterteDaten]
  );

  const topProjekt = gefilterteDaten[0];
  const topBereich = bereichDaten[0];

  const gesamtProjektSeiten = Math.max(
    1,
    Math.ceil(gefilterteDaten.length / PROJEKTE_PRO_SEITE)
  );

  const aktuelleSeite = Math.min(projektSeite, gesamtProjektSeiten);

  const sichtbareProjekte = useMemo(() => {
    const start = (aktuelleSeite - 1) * PROJEKTE_PRO_SEITE;
    return gefilterteDaten.slice(start, start + PROJEKTE_PRO_SEITE);
  }, [gefilterteDaten, aktuelleSeite]);

  const ersterProjektIndex =
    gefilterteDaten.length === 0 ? 0 : (aktuelleSeite - 1) * PROJEKTE_PRO_SEITE + 1;

  const letzterProjektIndex = Math.min(
    aktuelleSeite * PROJEKTE_PRO_SEITE,
    gefilterteDaten.length
  );

  const pageLoading = !zugriffGeprueft || initialLoading;

  if (pageLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-slate-100">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-5 font-black shadow-2xl shadow-black/30">
          Projektanalyse wird vorbereitet...
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-slate-100">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-5 font-black text-red-300 shadow-2xl shadow-black/30">
          Kein Zugriff auf die Projektanalyse.
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-8 text-slate-100">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-black/20 p-6 shadow-2xl shadow-black/30 lg:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-[0.38]">
          <div
            className="h-full w-full bg-cover bg-[center_20%]"
            style={{
              backgroundImage: "url('/berg.png')",
              filter: "brightness(1.65) contrast(1.05)",
            }}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

        <div className="relative z-10 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <div className="inline-flex rounded-full border border-slate-400/25 bg-slate-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-slate-200">
              ODZ SILVER · Projektanalyse
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Projektanalyse
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/65 sm:text-base">
              Projekte, Bereiche, Mitarbeiter und Von–Bis-Buchungen sauber auswerten.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-xl">
                <span className="h-3 w-3 rounded-full bg-green-400 shadow-lg shadow-green-400/40" />
                <span className="text-xs font-black uppercase tracking-widest text-white/70">
                  {von} bis {bis}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-3xl border border-white/10 bg-black/25 p-2 text-center backdrop-blur-xl sm:p-3 md:grid-cols-4">
            <HeroMini label="Projekte" value={loading ? "—" : String(gefilterteDaten.length).padStart(2, "0")} />
            <HeroMini label="Stunden" value={loading ? "—" : formatStunden(gesamtStunden)} blue />
            <HeroMini label="Einträge" value={loading ? "—" : String(gesamtEintraege).padStart(2, "0")} />
            <HeroMini label="Bereiche" value={loading ? "—" : String(bereichDaten.length).padStart(2, "0")} green />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ActionCard href="#filter" label="Zeitraum" title="📅 Filter" onClick={() => setFilterOffen(true)} />
        <ActionCard href="#bereiche" label="Bereiche" title="▦ Auswertung" onClick={() => setBereicheOffen(true)} />
        <ActionCard href="#projekte" label="Projekte" title="▣ Stunden" onClick={() => setProjekteOffen(true)} />
        <ActionCard href="#filter" label="Refresh" title={loading ? "⏳ Lädt" : "↻ Aktualisieren"} onClick={() => ladeDaten(false)} />
      </section>

      {meldung && (
        <div className="rounded-xl border border-slate-200/20 bg-slate-200/10 p-4 text-sm font-bold text-slate-100">
          {meldung}
        </div>
      )}

      <DropdownPanel
        id="filter"
        title="Zeitraum & Suche"
        eyebrow="Filter · Analyse · Kontrolle"
        description="Zeitraum eingrenzen und nach Projekt, Bereich oder Mitarbeiter suchen."
        open={filterOffen}
        onToggle={() => setFilterOffen(!filterOffen)}
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.5fr_auto] lg:items-end">
          <Field label="Von">
            <input
              type="date"
              value={von}
              onChange={(event) => setVon(event.target.value)}
              className="dark-input"
            />
          </Field>

          <Field label="Bis">
            <input
              type="date"
              value={bis}
              onChange={(event) => setBis(event.target.value)}
              className="dark-input"
            />
          </Field>

          <Field label="Suche">
            <input
              type="text"
              value={suche}
              onChange={(event) => setSuche(event.target.value)}
              placeholder="Projekt, Bereich oder Mitarbeiter suchen..."
              className="dark-input"
            />
          </Field>

          <button
            type="button"
            onClick={() => ladeDaten(false)}
            disabled={loading}
            className="rounded-2xl border border-slate-200/30 bg-slate-200/10 px-6 py-4 font-black text-slate-100 shadow-lg shadow-slate-200/10 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:bg-sky-300/10 hover:shadow-sky-300/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Lädt..." : "Auswerten"}
          </button>
        </div>
      </DropdownPanel>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Projekte" value={loading ? "—" : gefilterteDaten.length} subvalue="mit Buchungen" />
        <KpiCard
          label="Gebuchte Stunden"
          value={loading ? "—" : formatStunden(gesamtStunden)}
          subvalue={formatDezimal(gesamtStunden)}
          blue
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
          green
        />
      </section>

      <DropdownPanel
        id="bereiche"
        title="Bereichsauswertung Gesamt"
        eyebrow="Werkstatt · Montage · Planung"
        description="Alle gebuchten Stunden nach Bereichen. Betriebsunterhalt bleibt bewusst sichtbar."
        open={bereicheOffen}
        onToggle={() => setBereicheOffen(!bereicheOffen)}
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
                className="rounded-3xl border border-white/10 bg-black/25 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-white">
                      {bereich.bereich}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-white/35">
                      Rang {index + 1} · {bereich.anzahl} Buchungen
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
      </DropdownPanel>

      <DropdownPanel
        id="projekte"
        title="Projektstunden nach Bereich"
        eyebrow="Projekt · Bereich · Buchungen"
        description="Maximal 10 Projekte pro Seite. Pro Projekt werden die letzten Buchungen mit Mitarbeiter und Von–Bis angezeigt."
        open={projekteOffen}
        onToggle={() => setProjekteOffen(!projekteOffen)}
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-xl font-black text-white">Projektliste</h2>
            <p className="mt-1 text-sm leading-6 text-white/50">
              {ersterProjektIndex}–{letzterProjektIndex} von {gefilterteDaten.length} Projekten
            </p>
          </div>

          {!loading && gefilterteDaten.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setProjektSeite((seite) => Math.max(1, seite - 1))
                }
                disabled={aktuelleSeite === 1}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/10 text-lg font-black text-white transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Vorherige Seite"
              >
                ‹
              </button>

              <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-xs font-black text-sky-100">
                Seite {aktuelleSeite} / {gesamtProjektSeiten}
              </div>

              <button
                onClick={() =>
                  setProjektSeite((seite) =>
                    Math.min(gesamtProjektSeiten, seite + 1)
                  )
                }
                disabled={aktuelleSeite === gesamtProjektSeiten}
                className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/10 text-lg font-black text-white transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Nächste Seite"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <EmptyState text="Lade Projektstunden..." />
        ) : gefilterteDaten.length === 0 ? (
          <EmptyState text="Noch keine Arbeitszeiten vorhanden." />
        ) : (
          <div className="space-y-4">
            {sichtbareProjekte.map((projekt, index) => (
              <article
                key={projekt.projekt}
                className="rounded-[1.7rem] border border-white/10 bg-black/25 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10 sm:p-6"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white/60">
                        #{(aktuelleSeite - 1) * PROJEKTE_PRO_SEITE + index + 1}
                      </div>

                      <h2 className="text-2xl font-black text-white">
                        {projekt.projekt}
                      </h2>

                      {istInternesProjekt(projekt.projekt) && (
                        <span className="rounded-full border border-slate-200/20 bg-slate-200/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-100">
                          Intern
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm text-white/45">
                      {projekt.bereiche.length} Bereiche · {projekt.anzahl} Buchungen ·{" "}
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
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                    >
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                        {bereich.bereich}
                      </div>

                      <div className="mt-3 text-2xl font-black text-white">
                        {formatStunden(bereich.stunden)}
                      </div>

                      <div className="mt-1 text-sm font-bold text-white/40">
                        {formatDezimal(bereich.stunden)} · {bereich.anzahl} Buchungen
                      </div>
                    </div>
                  ))}
                </div>

                {projekt.eintraege.length > 0 && (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                    <div className="grid grid-cols-[0.8fr_1fr_1fr_1fr_0.8fr] border-b border-white/10 bg-black/25 px-4 py-3 text-xs font-black uppercase tracking-widest text-white/35">
                      <div>Datum</div>
                      <div>Mitarbeiter</div>
                      <div>Von–Bis</div>
                      <div>Bereich</div>
                      <div className="text-right">Stunden</div>
                    </div>

                    {projekt.eintraege.slice(0, 6).map((eintrag) => (
                      <div
                        key={`${projekt.projekt}-${eintrag.id}`}
                        className="grid grid-cols-[0.8fr_1fr_1fr_1fr_0.8fr] border-b border-white/10 px-4 py-3 text-sm text-white/70 last:border-b-0"
                      >
                        <div>{formatDatum(eintrag.datum)}</div>
                        <div className="font-bold text-white/85">{eintrag.mitarbeiter}</div>
                        <div>{zeitVonBis(eintrag.startzeit, eintrag.endzeit)}</div>
                        <div>{eintrag.bereich}</div>
                        <div className="text-right font-black text-sky-100">
                          {formatStunden(eintrag.stunden)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </DropdownPanel>

      <style jsx global>{`
        .dark-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.28);
          padding: 0.95rem 1rem;
          color: white;
          outline: none;
          transition: 0.2s ease;
        }

        .dark-input:focus {
          border-color: rgba(125, 211, 252, 0.45);
          box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.1);
          background: rgba(0, 0, 0, 0.38);
        }

        .dark-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .dark-input[type="date"],
        .dark-input[type="time"],
        .dark-input[type="datetime-local"],
        .dark-input[type="month"] {
          color-scheme: dark !important;
          color: #ffffff !important;
          padding-right: 3rem !important;
          background-repeat: no-repeat !important;
          background-position: right 1rem center !important;
          background-size: 1.15rem 1.15rem !important;
        }

        .dark-input[type="date"],
        .dark-input[type="month"],
        .dark-input[type="datetime-local"] {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='6'/%3E%3Cline x1='8' y1='2' x2='8' y2='6'/%3E%3Cline x1='3' y1='10' x2='21' y2='10'/%3E%3C/svg%3E") !important;
        }

        .dark-input[type="time"] {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpolyline points='12 6 12 12 16 14'/%3E%3C/svg%3E") !important;
        }

        .dark-input::-webkit-calendar-picker-indicator {
          opacity: 0 !important;
          cursor: pointer !important;
          width: 2.75rem !important;
          height: 100% !important;
        }

        .dark-input option {
          background: #111315;
          color: white;
        }
      `}</style>
    </main>
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
      className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
    >
      <div className="text-sm text-white/50">{label}</div>
      <div className="mt-2 text-lg font-black text-white">{title}</div>
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
    <section id={id} className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] shadow-2xl shadow-black/30">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col justify-between gap-4 p-6 text-left transition hover:bg-sky-300/5 lg:flex-row lg:items-center lg:p-7"
      >
        <div>
          <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-200">
            {eyebrow}
          </div>
          <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>
          <p className="mt-1 text-white/55">{description}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/30 bg-slate-200/10 px-5 py-3 text-sm font-black text-slate-100 transition hover:border-sky-300/35 hover:bg-sky-300/10 hover:text-sky-100">
          {open ? "Schließen ▲" : "Öffnen ▼"}
        </div>
      </button>

      {open && <div className="space-y-6 border-t border-white/10 p-6 lg:p-7">{children}</div>}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-white/65">
        {label}
      </span>
      {children}
    </label>
  );
}

function KpiCard({
  label,
  value,
  subvalue,
  blue,
  green,
}: {
  label: string;
  value: string | number;
  subvalue?: string;
  blue?: boolean;
  green?: boolean;
}) {
  const valueColor = green ? "text-green-300" : blue ? "text-sky-100" : "text-slate-100";

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-sky-300/10">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
        {label}
      </div>

      <div className={`mt-4 break-words text-3xl font-black leading-tight ${valueColor}`}>
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center transition hover:border-sky-300/25 hover:bg-sky-300/5">
      <div className={`text-xl font-black leading-tight md:text-2xl ${color}`}>{value}</div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/45">{label}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-6 text-sm font-bold text-white/55">
      {text}
    </div>
  );
}

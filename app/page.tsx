"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  Briefcase,
  CalendarDays,
  Clock3,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { istFeiertagSG } from "@/lib/feiertage";

type DashboardStats = {
  projekte: number;
  letzterMitarbeiter: string;
  letzteZeit: string;
  letzteStunden: number;

  heuteSoll: number;
  heuteIst: number;
  heuteDifferenz: number;

  wocheSoll: number;
  wocheIst: number;
  wocheDifferenz: number;
  wocheTage: number;

  monatSoll: number;
  monatIst: number;
  monatDifferenz: number;
  monatTage: number;

  gesamtUeberstunden: number;
  ueberstundenStart: number;
  ueberstundenAbbau: number;
  ueberstundenZeitraum: number;

  offeneAntraege: number;
};

const initialStats: DashboardStats = {
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

  gesamtUeberstunden: 0,
  ueberstundenStart: 0,
  ueberstundenAbbau: 0,
  ueberstundenZeitraum: 0,

  offeneAntraege: 0,
};

function formatDateLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatStunden(value: number) {
  const totalMinuten = Math.round(value * 60);
  const stunden = Math.floor(Math.abs(totalMinuten) / 60);
  const minuten = Math.abs(totalMinuten) % 60;
  const prefix = totalMinuten < 0 ? "-" : "";

  if (stunden <= 0) return `${prefix}${minuten} min`;
  if (minuten === 0) return `${prefix}${stunden} h`;

  return `${prefix}${stunden} h ${minuten} min`;
}

function formatKurz(value: number) {
  const totalMinuten = Math.round(Math.abs(value) * 60);
  const stunden = Math.floor(totalMinuten / 60);
  const minuten = totalMinuten % 60;
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";

  if (stunden === 0) return `${prefix}${minuten} min`;
  if (minuten === 0) return `${prefix}${stunden} h`;

  return `${prefix}${stunden} h ${minuten} min`;
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

function parseDatumLokal(wert?: string | null) {
  if (!wert) return null;

  const [jahr, monat, tag] = String(wert)
    .slice(0, 10)
    .split("-")
    .map(Number);

  if (!jahr || !monat || !tag) return null;

  const datum = new Date(jahr, monat - 1, tag);
  datum.setHours(0, 0, 0, 0);

  return datum;
}

function maxStartDatum(startDatum: Date, grenze?: Date | null) {
  const start = new Date(startDatum);
  start.setHours(0, 0, 0, 0);

  if (!grenze) return start;

  const limit = new Date(grenze);
  limit.setHours(0, 0, 0, 0);

  return limit > start ? limit : start;
}

function wochentagZuNummer(wert?: string | null) {
  const normalisiert = String(wert || "")
    .trim()
    .toLowerCase();

  const map: Record<string, number> = {
    montag: 1,
    mo: 1,
    dienstag: 2,
    di: 2,
    mittwoch: 3,
    mi: 3,
    donnerstag: 4,
    do: 4,
    freitag: 5,
    fr: 5,
  };

  return map[normalisiert] ?? null;
}

function freieWochentageFuerMitarbeiter(mitarbeiter: any) {
  const arbeitstageProWoche = Number(mitarbeiter?.arbeitstage_pro_woche || 5);
  const pensum = Number(mitarbeiter?.pensum_prozent || 100);
  const freierTag = wochentagZuNummer(mitarbeiter?.freier_wochentag);

  if (freierTag) return [freierTag];

  // Schweizer Standard in StahlFabrik: 80% = 4 Tage à 8.5h.
  // Falls noch kein freier Tag gespeichert ist, nehmen wir Freitag als sichere Vorgabe.
  if (arbeitstageProWoche === 4 || pensum === 80) return [5];

  return [];
}

function zaehleArbeitstage(
  startDatum: Date,
  endDatum: Date,
  freieWochentage: number[] = []
) {
  let tage = 0;
  const aktuell = new Date(startDatum);
  aktuell.setHours(0, 0, 0, 0);

  const ende = new Date(endDatum);
  ende.setHours(0, 0, 0, 0);

  while (aktuell <= ende) {
    const wochentag = aktuell.getDay();
    const istWochenende = wochentag === 0 || wochentag === 6;
    const istFreierTag = freieWochentage.includes(wochentag);
    const istFeiertag = istFeiertagSG(aktuell);

    if (!istWochenende && !istFreierTag && !istFeiertag) {
      tage++;
    }

    aktuell.setDate(aktuell.getDate() + 1);
  }

  return tage;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(initialStats);

  const [meldung, setMeldung] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setMeldung("");

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: arbeitszeiten, error: zeitenError } = await supabase
      .from("arbeitszeiten")
      .select("*");

    const { data: tageszeiten, error: tageszeitenError } = await supabase
      .from("tageszeiten")
      .select("*")
      .eq("user_id", user.id);

    const { data: urlaub, error: urlaubError } = await supabase
      .from("urlaub")
      .select("*");

    const { data: projekte, error: projekteError } = await supabase
      .from("projekte")
      .select("*");

    const { data: eigenerMitarbeiter, error: mitarbeiterError } = await supabase
      .from("mitarbeiter")
      .select("wochenstunden, name, ueberstunden_start, eintrittsdatum, zeiterfassung_ab, pensum_prozent, arbeitstage_pro_woche, freier_wochentag")
      .eq("user_id", user.id)
      .single();

    const error =
      zeitenError ||
      tageszeitenError ||
      urlaubError ||
      projekteError ||
      mitarbeiterError;

    if (error) {
      setMeldung(error.message);
    }

    const heuteDate = new Date();
    const heute = formatDateLocal(heuteDate);

    const montagDate = getMontagDieserWoche();
    const monatsStartDate = getErsterTagDieserMonat();
    const berechnungAb = String(
      eigenerMitarbeiter?.zeiterfassung_ab ||
        eigenerMitarbeiter?.eintrittsdatum ||
        "",
    ).slice(0, 10);

    const berechnungAbDate = parseDatumLokal(berechnungAb);
    const effektiverWochenStartDate = maxStartDatum(
      montagDate,
      berechnungAbDate,
    );
    const effektiverMonatsStartDate = maxStartDatum(
      monatsStartDate,
      berechnungAbDate,
    );
    const effektiverWochenStart = formatDateLocal(effektiverWochenStartDate);
    const effektiverMonatsStart = formatDateLocal(effektiverMonatsStartDate);
    const heuteVorBerechnung = !!berechnungAb && heute < berechnungAb;

    const wochenstunden = Number(eigenerMitarbeiter?.wochenstunden || 42.5);
    const arbeitstageProWoche = Math.max(
      1,
      Number(eigenerMitarbeiter?.arbeitstage_pro_woche || 5),
    );
    const freieWochentage = freieWochentageFuerMitarbeiter(eigenerMitarbeiter);
    const ueberstundenStart = Number(
      eigenerMitarbeiter?.ueberstunden_start || 0,
    );
    const tagesSoll = wochenstunden / arbeitstageProWoche;

    const eigeneArbeitszeiten =
      arbeitszeiten?.filter(
        (item) =>
          item.user_id === user.id &&
          (!berechnungAb || !item.datum || item.datum >= berechnungAb),
      ) || [];

    // Echte Istzeit kommt aus tageszeiten.netto_stunden.
    // Projektbuchungen in arbeitszeiten sind nur Verteilung und dürfen ohne Tagesabschluss
    // keine Überstunden erzeugen.
    const eigeneTageszeiten =
      tageszeiten?.filter(
        (tag) =>
          tag.user_id === user.id &&
          tag.status !== "Offen" &&
          tag.datum &&
          (!berechnungAb || tag.datum >= berechnungAb),
      ) || [];

    function istzeitAusTageszeiten(start: string, ende: string) {
      return eigeneTageszeiten
        .filter((tag) => tag.datum >= start && tag.datum <= ende)
        .reduce((sum, tag) => sum + Number(tag.netto_stunden || 0), 0);
    }

    const eigeneAbwesenheiten =
      urlaub?.filter((item) => item.user_id === user.id) || [];

    const offeneAntraege = eigeneAbwesenheiten.filter(
      (item) => item.status === "Beantragt",
    ).length;

    const heuteIst = istzeitAusTageszeiten(heute, heute);

    const heuteWochentag = heuteDate.getDay();
    const istWochenende = heuteWochentag === 0 || heuteWochentag === 6;
    const heuteIstFeiertag = istFeiertagSG(heuteDate);
    const heuteIstFreierTag = freieWochentage.includes(heuteWochentag);
    const heuteSoll =
      istWochenende || heuteIstFeiertag || heuteIstFreierTag || heuteVorBerechnung
        ? 0
        : tagesSoll;
    const heuteDifferenz = heuteIst - heuteSoll;

    const wocheIst = istzeitAusTageszeiten(effektiverWochenStart, heute);
    const wocheTage =
      effektiverWochenStart > heute
        ? 0
        : zaehleArbeitstage(effektiverWochenStartDate, heuteDate, freieWochentage);
    const wocheSoll = tagesSoll * wocheTage;
    const wocheDifferenz = wocheIst - wocheSoll;

    const monatIst = istzeitAusTageszeiten(effektiverMonatsStart, heute);
    const monatTage =
      effektiverMonatsStart > heute
        ? 0
        : zaehleArbeitstage(effektiverMonatsStartDate, heuteDate, freieWochentage);
    const monatSoll = tagesSoll * monatTage;

    const urlaubstageMonat = eigeneAbwesenheiten
      .filter(
        (eintrag) =>
          eintrag.typ === "Urlaub" &&
          eintrag.status === "Genehmigt" &&
          eintrag.bis >= effektiverMonatsStart &&
          eintrag.von <= heute,
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const kranktageMonat = eigeneAbwesenheiten
      .filter(
        (eintrag) =>
          eintrag.typ === "Krank" &&
          eintrag.bis >= effektiverMonatsStart &&
          eintrag.von <= heute,
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const ueberstundenAbbauStundenMonat = eigeneAbwesenheiten
      .filter(
        (eintrag) =>
          eintrag.typ === "Überstundenabbau" &&
          eintrag.status === "Genehmigt" &&
          eintrag.bis >= effektiverMonatsStart &&
          eintrag.von <= heute,
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0);

    const abwesenheitsstundenMonat =
      (urlaubstageMonat + kranktageMonat) * tagesSoll;

    const angerechneteStundenMonat = monatIst + abwesenheitsstundenMonat;
    const monatDifferenz = angerechneteStundenMonat - monatSoll;

    const ersteTageszeit = [...eigeneTageszeiten]
      .filter((item) => item.datum)
      .sort((a, b) => String(a.datum || "").localeCompare(String(b.datum || "")))[0];

    const effektiverGesamtStartDate =
      berechnungAbDate ||
      parseDatumLokal(ersteTageszeit?.datum) ||
      effektiverMonatsStartDate;

    const effektiverGesamtStart = formatDateLocal(effektiverGesamtStartDate);

    const gesamtIst = istzeitAusTageszeiten(effektiverGesamtStart, heute);

    const gesamtTage =
      effektiverGesamtStart > heute
        ? 0
        : zaehleArbeitstage(effektiverGesamtStartDate, heuteDate, freieWochentage);

    const gesamtSoll = tagesSoll * gesamtTage;

    const urlaubstageGesamt = eigeneAbwesenheiten
      .filter(
        (eintrag) =>
          eintrag.typ === "Urlaub" &&
          eintrag.status === "Genehmigt" &&
          eintrag.bis >= effektiverGesamtStart &&
          eintrag.von <= heute,
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const kranktageGesamt = eigeneAbwesenheiten
      .filter(
        (eintrag) =>
          eintrag.typ === "Krank" &&
          eintrag.bis >= effektiverGesamtStart &&
          eintrag.von <= heute,
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const ueberstundenAbbauStundenGesamt = eigeneAbwesenheiten
      .filter(
        (eintrag) =>
          eintrag.typ === "Überstundenabbau" &&
          eintrag.status === "Genehmigt" &&
          eintrag.bis >= effektiverGesamtStart &&
          eintrag.von <= heute,
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0);

    const abwesenheitsstundenGesamt =
      (urlaubstageGesamt + kranktageGesamt) * tagesSoll;

    const angerechneteStundenGesamt = gesamtIst + abwesenheitsstundenGesamt;
    const ueberstundenZeitraum = angerechneteStundenGesamt - gesamtSoll;

    const gesamtUeberstunden =
      ueberstundenStart + ueberstundenZeitraum - ueberstundenAbbauStundenGesamt;

    const lastTime = [...eigeneArbeitszeiten].sort((a, b) => {
      const datumVergleich = String(b.datum || "").localeCompare(
        String(a.datum || ""),
      );

      if (datumVergleich !== 0) return datumVergleich;

      return Number(b.id || 0) - Number(a.id || 0);
    })[0];

    setStats({
      projekte: projekte?.length || 0,
      letzterMitarbeiter: eigenerMitarbeiter?.name || "Keine Daten",
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
      monatIst: angerechneteStundenMonat,
      monatDifferenz,
      monatTage,

      gesamtUeberstunden,
      ueberstundenStart,
      ueberstundenAbbau: ueberstundenAbbauStundenGesamt,
      ueberstundenZeitraum,

      offeneAntraege,
    });

  }
return (
    <main className="dashboard-v12 space-y-6 text-slate-950">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-[#302720]/90 via-[#26272a]/90 to-[#161719]/95 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.16)] lg:p-7">
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
              ODZ V1.2 · Dashboard
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/70 sm:text-base">
              Woche, Arbeitszeit, Projekte und offene Punkte ruhig in einer Übersicht.
            </p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-xl">
              <span className="h-3 w-3 rounded-full bg-green-400 shadow-lg shadow-green-400/40" />
              <span className="text-xs font-black uppercase tracking-widest text-white/70">
                Alles im Überblick
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-3xl border border-white/10 bg-black/25 p-2 text-center backdrop-blur-xl sm:p-3 md:grid-cols-4">
            <HeroMini label="Heute" value={formatDateLocal(new Date()).slice(5)} dark />
            <HeroMini label="Projekte" value={String(stats.projekte).padStart(2, "0")} dark />
            <HeroMini
              label="Offen"
              value={String(stats.offeneAntraege).padStart(2, "0")}
              blue={stats.offeneAntraege > 0}
              dark
            />
            <HeroMini
              label="Tag"
              value={formatKurz(stats.heuteDifferenz)}
              green={stats.heuteDifferenz >= 0}
              red={stats.heuteDifferenz < 0}
              dark
            />
          </div>
        </div>
      </section>

      {meldung && (
        <div className="rounded-2xl border border-red-300/35 bg-red-100/70 p-5 text-sm font-bold text-red-800 shadow-[0_16px_50px_rgba(127,29,29,0.10)] backdrop-blur-xl">
          {meldung}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickMetric
          label="Heute"
          title="Tageskonto"
          value={formatKurz(stats.heuteDifferenz)}
          positive={stats.heuteDifferenz >= 0}
        />
        <QuickMetric
          label="Woche"
          title={`${stats.wocheTage} Arbeitstage`}
          value={formatStunden(stats.wocheIst)}
        />
        <QuickMetric
          label="Monat"
          title={`${stats.monatTage} Arbeitstage`}
          value={formatStunden(stats.monatIst)}
        />
        <QuickMetric
          label="Überstunden"
          title="Gesamt"
          value={formatKurz(stats.gesamtUeberstunden)}
          positive={stats.gesamtUeberstunden >= 0}
          danger={stats.gesamtUeberstunden < 0}
        />
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-white/40 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
        <div className="flex flex-col justify-between gap-4 border-b border-white/70 px-5 py-5 sm:px-6 lg:flex-row lg:items-center">
          <div className="xl:max-w-[58%]">
            <div className="inline-flex rounded-full border border-orange-200/50 bg-orange-100/60 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-orange-800">
              Wochenplan
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-950">
              Wochenübersicht
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Mo–So direkt im Dashboard. Ruhiger Kalenderbereich für Arbeitszeiten, Urlaub, Krankheit und Buchungen.
            </p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 text-sm font-black text-slate-600 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            Montag – Sonntag
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:p-6 md:grid-cols-7">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((tag, index) => {
            const istHeute = index === (new Date().getDay() + 6) % 7;

            return (
              <div
                key={tag}
                className={`min-h-[128px] rounded-3xl border p-4 transition hover:-translate-y-1 hover:border-orange-300/25 hover:bg-orange-300/5 hover:shadow-lg hover:shadow-orange-900/10 ${
                  istHeute
                    ? "border-orange-300/45 bg-orange-100/55"
                    : "border-white/70 bg-white/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                    {tag}
                  </div>

                  {istHeute && (
                    <span className="rounded-full border border-orange-300/40 bg-orange-100/70 px-2 py-1 text-[10px] font-black text-orange-800">
                      Heute
                    </span>
                  )}
                </div>

                <div className="mt-5 rounded-2xl border border-white/70 bg-white/55 p-3 text-xs font-bold text-slate-500">
                  Kalenderdaten folgen
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <details className="group overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-white/40 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 transition hover:bg-orange-300/[0.04] sm:px-6">
          <div className="xl:max-w-[58%]">
            <div className="inline-flex rounded-full border border-orange-200/50 bg-orange-100/60 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-orange-800">
              Kennzahlen
            </div>

            <h2 className="mt-3 text-2xl font-black text-slate-950">
              Arbeitszeit Übersicht
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Heute, Woche, Monat und Überstunden kompakt aufklappen.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-200/50 bg-orange-100/60 px-4 py-3 text-sm font-black text-slate-950 transition hover:border-orange-300/40 hover:bg-orange-100/80">
            <span className="group-open:hidden">Öffnen ▼</span>
            <span className="hidden group-open:inline">Schließen ▲</span>
          </div>
        </summary>

        <div className="grid grid-cols-1 gap-4 border-t border-white/70 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-4">
          <WorkTimeCard
            eyebrow="Heute"
            title="Tageszeit"
            description="Persönliche Tagesübersicht"
            soll={stats.heuteSoll}
            ist={stats.heuteIst}
            differenz={stats.heuteDifferenz}
          />

          <WorkTimeCard
            eyebrow="Diese Woche"
            title="Wochenzeit"
            description={`Montag bis ${
              [0, 6].includes(new Date().getDay()) ? "Freitag" : "heute"
            } · ${stats.wocheTage} Arbeitstage`}
            soll={stats.wocheSoll}
            ist={stats.wocheIst}
            differenz={stats.wocheDifferenz}
          />

          <WorkTimeCard
            eyebrow="Dieser Monat"
            title="Monatszeit"
            description={`1. bis heute · ${stats.monatTage} Arbeitstage`}
            soll={stats.monatSoll}
            ist={stats.monatIst}
            differenz={stats.monatDifferenz}
          />

          <OvertimeCard
            value={stats.gesamtUeberstunden}
            startwert={stats.ueberstundenStart}
            zeitraum={stats.ueberstundenZeitraum}
            abbau={stats.ueberstundenAbbau}
          />
        </div>
      </details>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.95fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/50 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-xl sm:p-7">
          <div className="mb-6 flex items-center gap-4">
            <IconBox>
              <Activity size={24} />
            </IconBox>

            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Letzte Aktivitäten
              </h2>
              <p className="text-sm text-slate-500">Aktuelle Übersicht</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/55 p-5 transition hover:-translate-y-1 hover:border-orange-300/25 hover:bg-orange-300/5 hover:shadow-lg hover:shadow-orange-900/10">
            <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-orange-800">
              Arbeitszeit
            </div>

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="text-xl font-black text-slate-950">
                  {stats.letzteZeit}
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  Letzter Eintrag
                </div>
              </div>

              <div className="rounded-2xl border border-orange-200/45 bg-orange-100/60 px-4 py-3 text-xl font-black text-orange-800">
                {formatStunden(stats.letzteStunden)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/50 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-xl sm:p-7">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-950">Schnellübersicht</h2>
            <p className="text-sm text-slate-500">Live Infos</p>
          </div>

          <InfoRow
            label="Projekte"
            value={stats.projekte}
            icon={<Briefcase size={22} />}
          />

          <InfoRow
            label="Ü-Std."
            value={formatStunden(stats.gesamtUeberstunden)}
            highlight={stats.gesamtUeberstunden >= 0}
            danger={stats.gesamtUeberstunden < 0}
            icon={<TrendingUp size={22} />}
          />

          <InfoRow
            label="Offene Anträge"
            value={stats.offeneAntraege}
            highlight={stats.offeneAntraege === 0}
            danger={stats.offeneAntraege > 0}
            icon={<CalendarDays size={22} />}
          />
        </div>
      </section>
    </main>
  );
}

function HeroMini({
  label,
  value,
  green,
  blue,
  red,
  dark,
}: {
  label: string;
  value: string | number;
  green?: boolean;
  blue?: boolean;
  red?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 text-center transition ${
        dark
          ? "border-white/10 bg-white/[0.04] hover:border-orange-200/30 hover:bg-orange-300/10"
          : "border-white/70 bg-white/60 hover:border-orange-300/25 hover:bg-orange-300/5"
      }`}
    >
      <div
        className={`text-xl font-black leading-tight md:text-2xl ${
          red
            ? "text-red-400"
            : green
              ? "text-green-400"
              : blue
                ? "text-orange-100"
                : dark
                  ? "text-slate-100"
                  : "text-slate-950"
        }`}
      >
        {value}
      </div>
      <div className={`mt-1 text-[9px] font-black uppercase tracking-[0.16em] ${dark ? "text-white/45" : "text-slate-500"}`}>
        {label}
      </div>
    </div>
  );
}

function QuickMetric({
  label,
  title,
  value,
  positive,
  danger,
}: {
  label: string;
  title: string;
  value: string | number;
  positive?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white/55 p-5 shadow-[0_16px_44px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-orange-300/25 hover:bg-orange-300/5">
      <div className="text-sm font-bold text-slate-500">{label}</div>
      <div
        className={`mt-3 text-3xl font-black tracking-tight ${
          danger
            ? "text-red-500"
            : positive
              ? "text-green-600"
              : "text-slate-950"
        }`}
      >
        {value}
      </div>
      <div className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
        {title}
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
    <section className="rounded-[1.5rem] border border-white/70 bg-white/55 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl transition hover:-translate-y-1 hover:border-orange-300/25 hover:bg-orange-300/5 hover:shadow-orange-900/10">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            {eyebrow}
          </div>

          <h2 className="mt-2 text-2xl font-black text-slate-950">{title}</h2>

          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        <IconBox>
          <Clock3 size={22} />
        </IconBox>
      </div>

      <div className="grid gap-3">
        <ValueBox label="Sollzeit" value={formatStunden(soll)} />
        <ValueBox label="Gebucht" value={formatStunden(ist)} highlight />
        <ValueBox
          label="Differenz"
          value={formatKurz(differenz)}
          green={differenz >= 0}
          red={differenz < 0}
        />
      </div>
    </section>
  );
}

function OvertimeCard({
  value,
  startwert,
  zeitraum,
  abbau,
}: {
  value: number;
  startwert: number;
  zeitraum: number;
  abbau: number;
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/70 bg-white/55 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl transition hover:-translate-y-1 hover:border-orange-300/25 hover:bg-orange-300/5 hover:shadow-orange-900/10">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            Gesamt
          </div>

          <h2 className="mt-2 text-2xl font-black text-slate-950">Überstunden</h2>

          <p className="mt-1 text-sm text-slate-500">
            Startwert + laufender Zeitraum - Abbau
          </p>
        </div>

        <IconBox>
          <TrendingUp size={22} />
        </IconBox>
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/55 p-5">
        <div className="text-sm font-bold text-slate-500">Gesamtüberstunden</div>

        <div
          className={`mt-3 text-4xl font-black ${
            value >= 0 ? "text-green-600" : "text-red-500"
          }`}
        >
          {formatKurz(value)}
        </div>

        <div className="mt-5 space-y-2 border-t border-white/70 pt-4">
          <MiniLine label="Startwert" value={formatKurz(startwert)} />
          <MiniLine
            label="Seit Start"
            value={formatKurz(zeitraum)}
            green={zeitraum >= 0}
            red={zeitraum < 0}
          />
          <MiniLine label="Abbau" value={`-${abbau.toFixed(2)} h`} red />
        </div>
      </div>
    </section>
  );
}

function ValueBox({
  label,
  value,
  highlight,
  green,
  red,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  green?: boolean;
  red?: boolean;
}) {
  const color = highlight
    ? "text-orange-800"
    : green
      ? "text-green-600"
      : red
        ? "text-red-500"
        : "text-slate-950";

  return (
    <div className="rounded-2xl border border-white/70 bg-white/55 p-4">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-black ${color}`}>{value}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight,
  danger,
  icon,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  danger?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/55 p-5 transition hover:-translate-y-1 hover:border-orange-300/25 hover:bg-orange-300/5 hover:shadow-lg hover:shadow-orange-900/10">
      <div className="min-w-0">
        <div className="text-sm text-slate-500">{label}</div>
        <div
          className={`mt-2 truncate text-2xl font-black ${
            danger
              ? "text-red-500"
              : highlight
                ? "text-green-600"
                : "text-slate-950"
          }`}
        >
          {value}
        </div>
      </div>

      {icon && <IconBox>{icon}</IconBox>}
    </div>
  );
}

function MiniLine({
  label,
  value,
  green,
  red,
}: {
  label: string;
  value: string;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span
        className={`font-black ${
          green ? "text-green-600" : red ? "text-red-500" : "text-slate-950"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function IconBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-orange-200/45 bg-orange-100/60 p-3 text-orange-800">
      {children}
    </div>
  );
}

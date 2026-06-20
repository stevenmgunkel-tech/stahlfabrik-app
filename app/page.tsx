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
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)} h`;
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
    const istWochenende = wochentag === 0 || wochentag === 6;
    const istFeiertag = istFeiertagSG(aktuell);

    if (!istWochenende && !istFeiertag) {
      tage++;
    }

    aktuell.setDate(aktuell.getDate() + 1);
  }

  return tage;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [meldung, setMeldung] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
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

    const { data: tagespausen, error: pausenError } = await supabase
      .from("tagespausen")
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
      .select("wochenstunden, name, ueberstunden_start, eintrittsdatum")
      .eq("user_id", user.id)
      .single();

    const error =
      zeitenError ||
      pausenError ||
      urlaubError ||
      projekteError ||
      mitarbeiterError;

    if (error) {
      setMeldung(error.message);
    }

    const heuteDate = new Date();
    const heute = formatDateLocal(heuteDate);

    const montagDate = getMontagDieserWoche();
    const montag = formatDateLocal(montagDate);

    const monatsStartDate = getErsterTagDieserMonat();
    const monatsStart = formatDateLocal(monatsStartDate);

    const wochenstunden = Number(eigenerMitarbeiter?.wochenstunden || 42.5);
    const ueberstundenStart = Number(
      eigenerMitarbeiter?.ueberstunden_start || 0,
    );
    const tagesSoll = wochenstunden / 5;

    const eigeneArbeitszeiten =
      arbeitszeiten?.filter((item) => item.user_id === user.id) || [];

    const eigeneAbwesenheiten =
      urlaub?.filter((item) => item.user_id === user.id) || [];

    const offeneAntraege = eigeneAbwesenheiten.filter(
      (item) => item.status === "Beantragt",
    ).length;

    function pauseFuerDatum(datum: string) {
      const pause = tagespausen?.find((p) => p.datum === datum);
      return Number(pause?.pause || 0) / 60;
    }

    function pausenFuerZeitraum(start: string, ende: string) {
      return (
        tagespausen
          ?.filter((p) => p.datum >= start && p.datum <= ende)
          .reduce((sum, p) => sum + Number(p.pause || 0) / 60, 0) || 0
      );
    }

    const eigeneZeitenHeute = eigeneArbeitszeiten.filter(
      (item) => item.datum === heute,
    );

    const heuteBrutto = eigeneZeitenHeute.reduce(
      (sum, item) => sum + Number(item.stunden || 0),
      0,
    );

    const heuteIst = heuteBrutto - pauseFuerDatum(heute);

    const heuteWochentag = heuteDate.getDay();
    const istWochenende = heuteWochentag === 0 || heuteWochentag === 6;
    const heuteIstFeiertag = istFeiertagSG(heuteDate);
    const heuteSoll = istWochenende || heuteIstFeiertag ? 0 : tagesSoll;
    const heuteDifferenz = heuteIst - heuteSoll;

    const eigeneZeitenWoche = eigeneArbeitszeiten.filter(
      (item) => item.datum >= montag && item.datum <= heute,
    );

    const wocheBrutto = eigeneZeitenWoche.reduce(
      (sum, item) => sum + Number(item.stunden || 0),
      0,
    );

    const wocheIst = wocheBrutto - pausenFuerZeitraum(montag, heute);
    const wocheTage = zaehleArbeitstage(montagDate, heuteDate);
    const wocheSoll = tagesSoll * wocheTage;
    const wocheDifferenz = wocheIst - wocheSoll;

    const eigeneZeitenMonat = eigeneArbeitszeiten.filter(
      (item) => item.datum >= monatsStart && item.datum <= heute,
    );

    const monatBrutto = eigeneZeitenMonat.reduce(
      (sum, item) => sum + Number(item.stunden || 0),
      0,
    );

    const monatIst = monatBrutto - pausenFuerZeitraum(monatsStart, heute);
    const monatTage = zaehleArbeitstage(monatsStartDate, heuteDate);
    const monatSoll = tagesSoll * monatTage;

    const urlaubstageMonat = eigeneAbwesenheiten
      .filter(
        (eintrag) =>
          eintrag.typ === "Urlaub" &&
          eintrag.status === "Genehmigt" &&
          eintrag.von >= monatsStart &&
          eintrag.bis <= heute,
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const kranktageMonat = eigeneAbwesenheiten
      .filter(
        (eintrag) =>
          eintrag.typ === "Krank" &&
          eintrag.von >= monatsStart &&
          eintrag.bis <= heute,
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const ueberstundenAbbauStundenMonat = eigeneAbwesenheiten
      .filter(
        (eintrag) =>
          eintrag.typ === "Überstundenabbau" &&
          eintrag.status === "Genehmigt" &&
          eintrag.von >= monatsStart &&
          eintrag.bis <= heute,
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0);

    const abwesenheitsstundenMonat =
      (urlaubstageMonat + kranktageMonat) * tagesSoll;

    const angerechneteStundenMonat = monatIst + abwesenheitsstundenMonat;
    const monatDifferenz = angerechneteStundenMonat - monatSoll;

    const gesamtUeberstunden =
      ueberstundenStart + monatDifferenz - ueberstundenAbbauStundenMonat;

    const lastTime = eigeneArbeitszeiten[eigeneArbeitszeiten.length - 1];

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
      ueberstundenAbbau: ueberstundenAbbauStundenMonat,

      offeneAntraege,
    });

    setLoading(false);
  }

  const today = new Date().toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="space-y-7 text-slate-100">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111821] shadow-2xl shadow-black/35 ring-1 ring-white/[0.035]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.64]">
          <div
            className="h-full w-full bg-cover bg-[center_24%]"
            style={{
              backgroundImage: "url('/berg.png')",
              filter: "brightness(0.88) contrast(1.12) saturate(0.72)",
            }}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#05080d]/95 via-[#05080d]/58 to-[#05080d]/16" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.035] via-transparent to-black/38" />

        <div className="relative z-10 grid min-h-[390px] grid-cols-1 gap-8 p-7 lg:p-10 xl:grid-cols-[1fr_560px] xl:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-slate-200 shadow-inner shadow-white/5">
              ODZ SILVER
            </div>

            <div className="mt-5 text-sm font-bold text-white/65">
              Guten Tag {stats.letzterMitarbeiter} 👋 · {today}
            </div>

            <h1 className="mt-5 text-5xl font-black tracking-tight text-white drop-shadow-[0_18px_45px_rgba(0,0,0,0.45)] lg:text-7xl">
              Dashboard
            </h1>

            <p className="mt-4 max-w-xl text-lg font-medium leading-8 text-white/68">
              Woche, Arbeitszeit, Projekte und offene Punkte auf einen Blick.
            </p>

            <div className="mt-7 grid max-w-[520px] gap-3 sm:grid-cols-[1fr_1fr]">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 shadow-inner shadow-white/[0.03]">
                <span className="h-3 w-3 rounded-full bg-green-400 shadow-lg shadow-green-400/40" />
                <span className="text-sm font-black uppercase tracking-widest text-white/72">
                  Alles im Überblick
                </span>
              </div>

              <button
                type="button"
                onClick={loadDashboard}
                disabled={loading}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-black text-white/72 shadow-inner shadow-white/[0.03] transition hover:border-sky-300/30 hover:bg-sky-300/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Lädt..." : "Aktualisieren"}
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-black/32 p-4 shadow-2xl shadow-black/35 backdrop-blur-xl">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <HeroMini
                label="Überstunden"
                value={formatStunden(stats.gesamtUeberstunden)}
                green={stats.gesamtUeberstunden >= 0}
                red={stats.gesamtUeberstunden < 0}
              />
              <HeroMini label="Projekte" value={stats.projekte} />
              <HeroMini
                label="Offen"
                value={stats.offeneAntraege}
                blue={stats.offeneAntraege > 0}
              />
              <HeroMini
                label="Heute"
                value={formatKurz(stats.heuteDifferenz)}
                green={stats.heuteDifferenz >= 0}
                red={stats.heuteDifferenz < 0}
              />
            </div>
          </div>
        </div>
      </section>

      {meldung && (
        <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-5 text-sm font-bold text-red-100">
          {meldung}
        </div>
      )}

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#151c24]/92 shadow-xl shadow-black/25 ring-1 ring-white/[0.025]">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6 lg:flex-row lg:items-center">
          <div className="max-w-3xl">
            <SectionBadge>Wochenplan</SectionBadge>
            <h2 className="mt-3 text-2xl font-black text-white">
              Wochenübersicht
            </h2>
            <p className="mt-1 text-sm leading-6 text-white/52">
              Mo–So direkt im Dashboard. Hier kommt als nächstes der echte
              Kalender mit Arbeitszeiten, Urlaub, Krankheit und Buchungen.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/28 px-4 py-3 text-sm font-black text-white/70">
            Montag – Sonntag
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:p-6 md:grid-cols-7">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((tag, index) => {
            const istHeute = index === (new Date().getDay() + 6) % 7;

            return (
              <div
                key={tag}
                className={`min-h-[120px] rounded-3xl border p-4 transition hover:border-sky-300/25 hover:bg-sky-300/8 ${
                  istHeute
                    ? "border-sky-300/30 bg-sky-300/10"
                    : "border-white/10 bg-[#0d131a]/85"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black uppercase tracking-[0.18em] text-white/55">
                    {tag}
                  </div>

                  {istHeute && (
                    <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2 py-1 text-[10px] font-black text-sky-100">
                      Heute
                    </span>
                  )}
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-xs font-bold text-white/45">
                  Kalenderdaten folgen
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#151c24]/92 shadow-xl shadow-black/25 ring-1 ring-white/[0.025]">
        <div className="flex flex-col justify-between gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center">
          <div>
            <SectionBadge>Kennzahlen</SectionBadge>
            <h2 className="mt-3 text-2xl font-black text-white">
              Arbeitszeit Übersicht
            </h2>
            <p className="mt-1 text-sm leading-6 text-white/52">
              Heute, Woche, Monat und Überstunden kompakt auf einen Blick.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-white/10 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<Clock3 size={18} />}
            label="Heute"
            value={formatKurz(stats.heuteDifferenz)}
            subline="Differenz"
            green={stats.heuteDifferenz >= 0}
            red={stats.heuteDifferenz < 0}
          />
          <MetricCard
            icon={<CalendarDays size={18} />}
            label="Woche"
            value={formatKurz(stats.wocheDifferenz)}
            subline="Differenz"
            green={stats.wocheDifferenz >= 0}
            red={stats.wocheDifferenz < 0}
          />
          <MetricCard
            icon={<CalendarDays size={18} />}
            label="Monat"
            value={formatKurz(stats.monatDifferenz)}
            subline="Differenz"
            green={stats.monatDifferenz >= 0}
            red={stats.monatDifferenz < 0}
          />
          <MetricCard
            icon={<TrendingUp size={18} />}
            label="Überstunden"
            value={formatStunden(stats.gesamtUeberstunden)}
            subline="Gesamt"
            green={stats.gesamtUeberstunden >= 0}
            red={stats.gesamtUeberstunden < 0}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#151c24]/92 shadow-xl shadow-black/25 ring-1 ring-white/[0.025]">
        <div className="px-5 py-5 sm:px-6">
          <SectionBadge>Aktuelles</SectionBadge>
          <h2 className="mt-3 text-2xl font-black text-white">
            Letzte Aktivitäten
          </h2>
          <p className="mt-1 text-sm leading-6 text-white/52">
            Arbeitszeiten und offene Punkte kompakt zusammengefasst.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-white/10 p-5 sm:p-6 xl:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#0d131a]/85 p-5 shadow-xl shadow-black/20">
            <div className="mb-4 flex items-center gap-3">
              <IconBox>
                <Activity size={20} />
              </IconBox>
              <div>
                <h3 className="text-lg font-black text-white">Letzte Arbeitszeit</h3>
                <p className="text-sm text-white/50">Aktueller Eintrag</p>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-black/24 p-4 sm:flex-row sm:items-center">
              <div>
                <div className="text-xl font-black text-white">
                  {stats.letzteZeit}
                </div>
                <div className="mt-1 text-sm text-white/50">
                  Projekt / Bereich
                </div>
              </div>

              <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-xl font-black text-sky-100">
                {formatStunden(stats.letzteStunden)}
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-[#0d131a]/85 p-5 shadow-xl shadow-black/20">
            <div className="mb-4 flex items-center gap-3">
              <IconBox>
                <Briefcase size={20} />
              </IconBox>
              <div>
                <h3 className="text-lg font-black text-white">Schnellübersicht</h3>
                <p className="text-sm text-white/50">Live Infos</p>
              </div>
            </div>

            <div className="grid gap-3">
              <InfoLine label="Projekte" value={stats.projekte} />
              <InfoLine
                label="Offene Anträge"
                value={stats.offeneAntraege}
                danger={stats.offeneAntraege > 0}
                green={stats.offeneAntraege === 0}
              />
              <InfoLine
                label="Überstunden"
                value={formatStunden(stats.gesamtUeberstunden)}
                green={stats.gesamtUeberstunden >= 0}
                danger={stats.gesamtUeberstunden < 0}
              />
            </div>
          </div>
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
}: {
  label: string;
  value: string | number;
  green?: boolean;
  blue?: boolean;
  red?: boolean;
}) {
  return (
    <div className="flex min-h-[108px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-center shadow-inner shadow-white/[0.035] transition hover:border-sky-300/25 hover:bg-sky-300/10">
      <div
        className={`text-xl font-black leading-tight md:text-2xl ${
          red
            ? "text-red-400"
            : green
              ? "text-green-400"
              : blue
                ? "text-sky-200"
                : "text-slate-100"
        }`}
      >
        {value}
      </div>
      <div className="mt-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/45">
        {label}
      </div>
    </div>
  );
}

function SectionBadge({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-sky-100">
      {children}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subline,
  green,
  red,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  subline: string;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[#0d131a]/85 p-5 shadow-xl shadow-black/20">
      <div className="flex items-center gap-3">
        <IconBox>{icon}</IconBox>
        <div className="text-xs font-black uppercase tracking-[0.22em] text-white/55">
          {label}
        </div>
      </div>

      <div
        className={`mt-6 text-3xl font-black ${
          red ? "text-red-400" : green ? "text-green-400" : "text-white"
        }`}
      >
        {value}
      </div>

      <div className="mt-2 text-sm font-medium text-white/45">{subline}</div>
    </div>
  );
}

function InfoLine({
  label,
  value,
  green,
  danger,
}: {
  label: string;
  value: string | number;
  green?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/24 px-4 py-3">
      <span className="text-sm font-bold text-white/55">{label}</span>
      <span
        className={`text-sm font-black ${
          danger ? "text-red-400" : green ? "text-green-400" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function IconBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-sky-300/20 bg-sky-300/10 p-2.5 text-sky-100">
      {children}
    </div>
  );
}

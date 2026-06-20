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
              ODZ SILVER · Dashboard
            </div>

            <h1 className="mt-3 text-5xl font-black tracking-tight text-white lg:text-7xl">
              Dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-base font-medium text-white/65">
  Woche, Arbeitszeit, Projekte und offene Punkte auf einen Blick.
</p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-xl">
                <span className="h-3 w-3 rounded-full bg-green-400 shadow-lg shadow-green-400/40" />
                <span className="text-sm font-black uppercase tracking-widest text-white/70">
                  Alles im Überblick
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-3xl border border-white/10 bg-black/25 p-3 text-center backdrop-blur-xl md:grid-cols-4">
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
      </section>

      {meldung && (
        <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-5 text-sm font-bold text-red-100">
          {meldung}
        </div>
      )}

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-xl shadow-black/20 backdrop-blur-xl">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-6 lg:flex-row lg:items-center">
          <div className="xl:max-w-[58%]">
            <div className="inline-flex rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-sky-100">
              Wochenplan
            </div>
            <h2 className="mt-3 text-2xl font-black text-white">
              Wochenübersicht
            </h2>
            <p className="mt-1 text-sm leading-6 text-white/50">
              Mo–So direkt im Dashboard. Hier kommt als nächstes der echte
              Kalender mit Arbeitszeiten, Urlaub, Krankheit und Buchungen.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/70">
            Montag – Sonntag
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:p-6 md:grid-cols-7">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((tag, index) => {
            const istHeute = index === (new Date().getDay() + 6) % 7;

            return (
              <div
                key={tag}
                className={`min-h-[135px] rounded-3xl border p-4 transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10 ${
                  istHeute
                    ? "border-sky-300/25 bg-sky-300/10"
                    : "border-white/10 bg-black/20"
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

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs font-bold text-white/45">
                  Kalenderdaten folgen
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <details className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-xl shadow-black/20 backdrop-blur-xl">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 transition hover:bg-sky-300/[0.03] sm:px-6">
          <div className="xl:max-w-[58%]">
            <div className="inline-flex rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-sky-100">
              Kennzahlen
            </div>

            <h2 className="mt-3 text-2xl font-black text-white">
              Arbeitszeit Übersicht
            </h2>

            <p className="mt-1 text-sm leading-6 text-white/50">
              Heute, Woche, Monat und Überstunden kompakt aufklappen.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-white/70 transition">
            <span className="group-open:hidden">▼ Öffnen</span>
            <span className="hidden group-open:inline">▲ Schließen</span>
          </div>
        </summary>

        <div className="grid grid-cols-1 gap-4 border-t border-white/10 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-4">
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
            monat={stats.monatDifferenz}
            abbau={stats.ueberstundenAbbau}
          />
        </div>
      </details>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.95fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-7">
          <div className="mb-6 flex items-center gap-4">
            <IconBox>
              <Activity size={24} />
            </IconBox>

            <div>
              <h2 className="text-2xl font-black text-white">
                Letzte Aktivitäten
              </h2>
              <p className="text-sm text-white/50">Aktuelle Übersicht</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/25 p-5 transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10">
            <div className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-sky-100">
              Arbeitszeit
            </div>

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="text-xl font-black text-white">
                  {stats.letzteZeit}
                </div>
                <div className="mt-2 text-sm text-white/50">
                  Letzter Eintrag
                </div>
              </div>

              <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-xl font-black text-sky-100">
                {formatStunden(stats.letzteStunden)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-7">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-white">Schnellübersicht</h2>
            <p className="text-sm text-white/50">Live Infos</p>
          </div>

          <InfoRow
            label="Projekte"
            value={stats.projekte}
            icon={<Briefcase size={22} />}
          />

          <InfoRow
            label="Überstunden"
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
}: {
  label: string;
  value: string | number;
  green?: boolean;
  blue?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center transition hover:border-sky-300/25 hover:bg-sky-300/5">
      <div
        className={`text-2xl font-black md:text-3xl ${
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
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
        {label}
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
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-sky-300/10">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
            {eyebrow}
          </div>

          <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>

          <p className="mt-1 text-sm text-white/50">{description}</p>
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
  monat,
  abbau,
}: {
  value: number;
  startwert: number;
  monat: number;
  abbau: number;
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-sky-300/10">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-white/40">
            Gesamt
          </div>

          <h2 className="mt-2 text-2xl font-black text-white">Überstunden</h2>

          <p className="mt-1 text-sm text-white/50">
            Startwert + Monat - Abbau
          </p>
        </div>

        <IconBox>
          <TrendingUp size={22} />
        </IconBox>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
        <div className="text-sm font-bold text-white/50">Gesamtüberstunden</div>

        <div
          className={`mt-3 text-4xl font-black ${
            value >= 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {formatKurz(value)}
        </div>

        <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
          <MiniLine label="Startwert" value={formatKurz(startwert)} />
          <MiniLine
            label="Monat"
            value={formatKurz(monat)}
            green={monat >= 0}
            red={monat < 0}
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
    ? "text-sky-100"
    : green
      ? "text-green-400"
      : red
        ? "text-red-400"
        : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
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
    <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/25 p-5 transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10">
      <div className="min-w-0">
        <div className="text-sm text-white/50">{label}</div>
        <div
          className={`mt-2 truncate text-2xl font-black ${
            danger
              ? "text-red-400"
              : highlight
                ? "text-green-400"
                : "text-white"
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
      <span className="text-white/55">{label}</span>
      <span
        className={`font-black ${
          green ? "text-green-400" : red ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function IconBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-sky-300/20 bg-sky-300/10 p-3 text-sky-100">
      {children}
    </div>
  );
}

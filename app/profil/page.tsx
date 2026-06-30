"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { istFeiertagSG } from "@/lib/feiertage";

type Stats = {
  soll: number;
  ist: number;
  angerechnet: number;
  ueberstunden: number;
  arbeitstage: number;
  genommenerUrlaub: number;
  resturlaub: number;
  kranktage: number;
  ueberstundenabbau: number;
  buchungen: number;
};

const initialStats: Stats = {
  soll: 0,
  ist: 0,
  angerechnet: 0,
  ueberstunden: 0,
  arbeitstage: 0,
  genommenerUrlaub: 0,
  resturlaub: 0,
  kranktage: 0,
  ueberstundenabbau: 0,
  buchungen: 0,
};

const wochentagNamen = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

function formatDateLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function ersterTagMonat(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function letzterTagMonat(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
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

function formatDatum(wert?: string | null) {
  const datum = parseDatumLokal(wert);
  if (!datum) return "-";

  return datum.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatStunden(wert: number, mitVorzeichen = false) {
  if (!Number.isFinite(wert)) return "0 min";

  const negativ = wert < 0;
  const absolut = Math.abs(wert);
  const gesamtMinuten = Math.round(absolut * 60);
  const stunden = Math.floor(gesamtMinuten / 60);
  const minuten = gesamtMinuten % 60;
  const prefix = negativ ? "-" : mitVorzeichen && wert > 0 ? "+" : "";

  if (stunden === 0) return `${prefix}${minuten} min`;
  if (minuten === 0) return `${prefix}${stunden} h`;

  return `${prefix}${stunden} h ${minuten} min`;
}

function formatKurz(wert: number) {
  return `${wert >= 0 ? "+" : ""}${wert.toFixed(2)} h`;
}

function istFreierWochentag(datum: Date, freierWochentag?: string | null) {
  const freierTag = String(freierWochentag || "").trim();
  if (!freierTag) return false;

  return wochentagNamen[datum.getDay()] === freierTag;
}

function zaehleArbeitstage(startDatum: Date, endDatum: Date, freierWochentag?: string | null) {
  let tage = 0;
  const aktuell = new Date(startDatum);
  aktuell.setHours(0, 0, 0, 0);

  const ende = new Date(endDatum);
  ende.setHours(0, 0, 0, 0);

  while (aktuell <= ende) {
    const wochentag = aktuell.getDay();
    const istWochenende = wochentag === 0 || wochentag === 6;
    const istFeiertag = istFeiertagSG(aktuell);
    const istFreierTag = istFreierWochentag(aktuell, freierWochentag);

    if (!istWochenende && !istFeiertag && !istFreierTag) {
      tage++;
    }

    aktuell.setDate(aktuell.getDate() + 1);
  }

  return tage;
}

function maxDatum(a: Date, b?: Date | null) {
  if (!b) return a;
  return b > a ? b : a;
}

function normalisiereArbeitstageProWoche(person: any) {
  const ausDb = Number(person?.arbeitstage_pro_woche || 0);
  if (ausDb > 0) return ausDb;

  const wochenstunden = Number(person?.wochenstunden || 0);
  if (wochenstunden === 34) return 4;

  return 5;
}

function normalisiereFreierWochentag(person: any) {
  const wert = String(person?.freier_wochentag || "").trim();
  if (wert) return wert;

  const arbeitstageProWoche = normalisiereArbeitstageProWoche(person);
  if (arbeitstageProWoche === 4) return "Freitag";

  return "";
}

function arbeitsmodellText(person: any) {
  const pensum = Number(person?.pensum_prozent || 0);
  const wochenstunden = Number(person?.wochenstunden || 0);
  const arbeitstage = normalisiereArbeitstageProWoche(person);

  if (pensum === 100 || (wochenstunden === 42.5 && arbeitstage === 5)) {
    return "100% · 42.5h · 5 Tage";
  }

  if (pensum === 80 || (wochenstunden === 34 && arbeitstage === 4)) {
    return "80% · 34h · 4 Tage";
  }

  return `${pensum || "Manuell"}% · ${wochenstunden || 0}h · ${arbeitstage} Tage`;
}

export default function ProfilPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [meldung, setMeldung] = useState("");
  const [email, setEmail] = useState("");
  const [profil, setProfil] = useState<any>(null);
  const [tageszeiten, setTageszeiten] = useState<any[]>([]);
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [urlaub, setUrlaub] = useState<any[]>([]);

  const [datenOffen, setDatenOffen] = useState(true);
  const [zeitOffen, setZeitOffen] = useState(true);
  const [buchungenOffen, setBuchungenOffen] = useState(true);
  const [systemOffen, setSystemOffen] = useState(false);

  useEffect(() => {
    ladeProfil();
  }, []);

  async function ladeProfil() {
    setLoading(true);
    setMeldung("");

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      router.push("/login");
      return;
    }

    setEmail(user.email || "");

    const heute = new Date();
    const start = formatDateLocal(ersterTagMonat(heute));
    const ende = formatDateLocal(heute > letzterTagMonat(heute) ? letzterTagMonat(heute) : heute);

    const { data: mitarbeiterData, error: mitarbeiterError } = await supabase
      .from("mitarbeiter")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (mitarbeiterError) {
      setMeldung(mitarbeiterError.message);
      setLoading(false);
      return;
    }

    const [{ data: tageszeitenData, error: tageszeitenError }, { data: arbeitszeitenData, error: arbeitszeitenError }, { data: urlaubData, error: urlaubError }] = await Promise.all([
      supabase
        .from("tageszeiten")
        .select("*")
        .eq("user_id", user.id)
        .gte("datum", start)
        .lte("datum", ende)
        .order("datum", { ascending: false }),
      supabase
        .from("arbeitszeiten")
        .select("*")
        .eq("user_id", user.id)
        .gte("datum", start)
        .lte("datum", ende)
        .order("datum", { ascending: false }),
      supabase
        .from("urlaub")
        .select("*")
        .eq("user_id", user.id)
        .order("id", { ascending: false }),
    ]);

    const fehler = tageszeitenError || arbeitszeitenError || urlaubError;
    if (fehler) {
      setMeldung(fehler.message);
    }

    setProfil(mitarbeiterData);
    setTageszeiten(tageszeitenData || []);
    setArbeitszeiten(arbeitszeitenData || []);
    setUrlaub(urlaubData || []);
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const berechnung = useMemo(() => {
    if (!profil) {
      return {
        stats: initialStats,
        tagesSoll: 0,
        arbeitstageProWoche: 5,
        freierWochentag: "",
        berechnungAb: "",
        projektVerteilung: [] as { name: string; stunden: number; buchungen: number }[],
        letzteTage: [] as any[],
      };
    }

    const heute = new Date();
    const monatsStart = ersterTagMonat(heute);
    const berechnungAb = String(profil.zeiterfassung_ab || profil.eintrittsdatum || "").slice(0, 10);
    const berechnungAbDate = parseDatumLokal(berechnungAb);
    const effektiverStart = maxDatum(monatsStart, berechnungAbDate);
    const effektiverStartKey = formatDateLocal(effektiverStart);
    const heuteKey = formatDateLocal(heute);

    const arbeitstageProWoche = normalisiereArbeitstageProWoche(profil);
    const freierWochentag = normalisiereFreierWochentag(profil);
    const wochenstunden = Number(profil.wochenstunden || 42.5);
    const tagesSoll = arbeitstageProWoche > 0 ? wochenstunden / arbeitstageProWoche : 0;

    const arbeitstage = effektiverStartKey > heuteKey
      ? 0
      : zaehleArbeitstage(effektiverStart, heute, freierWochentag);

    const soll = arbeitstage * tagesSoll;

    const relevanteTageszeiten = tageszeiten.filter(
      (tag) => !berechnungAb || !tag.datum || tag.datum >= berechnungAb
    );

    const ist = relevanteTageszeiten.reduce(
      (sum, tag) => sum + Number(tag.netto_stunden || 0),
      0
    );

    const genommenerUrlaub = urlaub
      .filter((eintrag) => eintrag.typ === "Urlaub" && eintrag.status === "Genehmigt")
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const kranktageMonat = urlaub
      .filter(
        (eintrag) =>
          eintrag.typ === "Krank" &&
          eintrag.bis >= effektiverStartKey &&
          eintrag.von <= heuteKey
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const urlaubstageMonat = urlaub
      .filter(
        (eintrag) =>
          eintrag.typ === "Urlaub" &&
          eintrag.status === "Genehmigt" &&
          eintrag.bis >= effektiverStartKey &&
          eintrag.von <= heuteKey
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const ueberstundenabbau = urlaub
      .filter(
        (eintrag) =>
          eintrag.typ === "Überstundenabbau" &&
          eintrag.status === "Genehmigt" &&
          eintrag.bis >= effektiverStartKey &&
          eintrag.von <= heuteKey
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0);

    const abwesenheitsstunden = (urlaubstageMonat + kranktageMonat) * tagesSoll;
    const angerechnet = ist + abwesenheitsstunden;
    const ueberstunden = Number(profil.ueberstunden_start || 0) + angerechnet - soll - ueberstundenabbau;
    const resturlaub = Number(profil.urlaubstage || 0) - genommenerUrlaub;

    const projektMap: Record<string, { name: string; stunden: number; buchungen: number }> = {};

    arbeitszeiten
      .filter((eintrag) => !berechnungAb || !eintrag.datum || eintrag.datum >= berechnungAb)
      .forEach((eintrag) => {
        const name = eintrag.projekt || "Ohne Projekt";
        if (!projektMap[name]) projektMap[name] = { name, stunden: 0, buchungen: 0 };
        projektMap[name].stunden += Number(eintrag.stunden || 0);
        projektMap[name].buchungen += 1;
      });

    const projektVerteilung = Object.values(projektMap)
      .sort((a, b) => b.stunden - a.stunden)
      .slice(0, 8);

    return {
      stats: {
        soll,
        ist,
        angerechnet,
        ueberstunden,
        arbeitstage,
        genommenerUrlaub,
        resturlaub,
        kranktage: kranktageMonat,
        ueberstundenabbau,
        buchungen: arbeitszeiten.length,
      },
      tagesSoll,
      arbeitstageProWoche,
      freierWochentag,
      berechnungAb,
      projektVerteilung,
      letzteTage: relevanteTageszeiten.slice(0, 8),
    };
  }, [profil, tageszeiten, arbeitszeiten, urlaub]);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-slate-100">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-5 font-black shadow-2xl shadow-black/30">
          Profil wird geladen...
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
              ODZ SILVER · Profil
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Profil
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/65 sm:text-base">
              Deine persönlichen Daten, dein Arbeitsmodell und deine Monatsübersicht auf einen Blick.
            </p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-xl">
              <span className="h-3 w-3 rounded-full bg-green-400 shadow-lg shadow-green-400/40" />
              <span className="text-xs font-black uppercase tracking-widest text-white/70">
                Nur Anzeige · Änderungen macht der Admin
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-3xl border border-white/10 bg-black/25 p-2 text-center backdrop-blur-xl sm:p-3 md:grid-cols-4">
            <HeroMini label="Rolle" value={profil?.rolle || "-"} />
            <HeroMini label="Pensum" value={`${profil?.pensum_prozent || (Number(profil?.wochenstunden) === 34 ? 80 : 100)}%`} blue />
            <HeroMini label="Ist" value={formatStunden(berechnung.stats.ist)} />
            <HeroMini label="Ü-Std." value={formatStunden(berechnung.stats.ueberstunden, true)} green={berechnung.stats.ueberstunden >= 0} red={berechnung.stats.ueberstunden < 0} />
          </div>
        </div>
      </section>

      {meldung && (
        <div className="rounded-xl border border-slate-200/20 bg-slate-200/10 p-4 text-sm font-bold text-slate-100">
          {meldung}
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ActionCard href="#daten" label="Profil" title="👤 Meine Daten" onClick={() => setDatenOffen(true)} />
        <ActionCard href="#zeitkonto" label="Monat" title="◷ Zeitkonto" onClick={() => setZeitOffen(true)} />
        <ActionCard href="#buchungen" label="Auswertung" title="▣ Buchungen" onClick={() => setBuchungenOffen(true)} />
        <ActionCard href="#system" label="System" title="ODZ. V1.1" onClick={() => setSystemOffen(true)} />
      </section>

      <DropdownPanel
        id="daten"
        title="Meine Daten"
        eyebrow="Profil · Rolle · Arbeitsmodell"
        description="Diese Angaben sind für Mitarbeiter nur lesbar. Änderungen laufen sauber über den Chef/Admin."
        open={datenOffen}
        onToggle={() => setDatenOffen(!datenOffen)}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoBox label="Name" value={profil?.name || "-"} />
          <InfoBox label="E-Mail" value={email || "-"} />
          <InfoBox label="Rolle" value={profil?.rolle || "-"} />
          <InfoBox label="Vertrag" value={profil?.vertragsart || "-"} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoBox label="Arbeitsmodell" value={arbeitsmodellText(profil)} highlight="blue" />
          <InfoBox label="Wochenstunden" value={formatStunden(Number(profil?.wochenstunden || 0))} />
          <InfoBox label="Arbeitstage/Woche" value={`${berechnung.arbeitstageProWoche} Tage`} />
          <InfoBox label="Tagessoll" value={formatStunden(berechnung.tagesSoll)} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoBox label="Freier Tag" value={berechnung.freierWochentag || "Keiner"} />
          <InfoBox label="Eintritt" value={formatDatum(profil?.eintrittsdatum)} />
          <InfoBox label="Zeiterfassung ab" value={formatDatum(profil?.zeiterfassung_ab)} />
          <InfoBox label="Ü-Startwert" value={formatStunden(Number(profil?.ueberstunden_start || 0), true)} />
        </div>
      </DropdownPanel>

      <DropdownPanel
        id="zeitkonto"
        title="Zeitkonto"
        eyebrow="Soll · Ist · Abwesenheit · Überstunden"
        description="Monatsrechnung basiert auf Tagesabschlüssen. Projektbuchungen sind nur die Verteilung der echten Arbeitszeit."
        open={zeitOffen}
        onToggle={() => setZeitOffen(!zeitOffen)}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoBox label="Arbeitstage" value={berechnung.stats.arbeitstage} />
          <InfoBox label="Soll" value={formatStunden(berechnung.stats.soll)} />
          <InfoBox label="Ist" value={formatStunden(berechnung.stats.ist)} highlight="blue" />
          <InfoBox label="Angerechnet" value={formatStunden(berechnung.stats.angerechnet)} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoBox label="Überstunden" value={formatStunden(berechnung.stats.ueberstunden, true)} highlight={berechnung.stats.ueberstunden >= 0 ? "green" : "red"} />
          <InfoBox label="Resturlaub" value={`${berechnung.stats.resturlaub} Tage`} highlight={berechnung.stats.resturlaub >= 0 ? "green" : "red"} />
          <InfoBox label="Kranktage Monat" value={`${berechnung.stats.kranktage} Tage`} />
          <InfoBox label="ÜA Abbau" value={formatStunden(berechnung.stats.ueberstundenabbau)} />
        </div>

        <div className="rounded-2xl border border-sky-300/20 bg-sky-300/5 p-5 text-sm font-bold leading-6 text-sky-100">
          Merksatz: Echte Istzeit kommt aus dem Tagesabschluss. Projekte und Betriebsunterhalt zeigen nur, wohin diese Zeit verteilt wurde.
        </div>
      </DropdownPanel>

      <DropdownPanel
        id="buchungen"
        title="Meine Buchungen"
        eyebrow="Tage · Projekte · Verteilung"
        description="Deine letzten Tagesabschlüsse und die Projektverteilung im aktuellen Monat."
        open={buchungenOffen}
        onToggle={() => setBuchungenOffen(!buchungenOffen)}
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
            <h3 className="text-xl font-black text-white">Letzte Tagesabschlüsse</h3>
            <p className="mt-1 text-sm text-white/45">Datum, Von/Bis, Nettozeit und Status.</p>

            <div className="mt-5 space-y-3">
              {berechnung.letzteTage.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-white/45">
                  Noch keine Tagesabschlüsse im aktuellen Monat.
                </div>
              ) : (
                berechnung.letzteTage.map((tag) => (
                  <div key={tag.id || `${tag.datum}-${tag.startzeit}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <div>
                        <div className="font-black text-white">{formatDatum(tag.datum)}</div>
                        <div className="mt-1 text-sm text-white/45">
                          {String(tag.startzeit || "").slice(0, 5) || "--:--"} - {String(tag.endzeit || "").slice(0, 5) || "--:--"}
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <div className="text-lg font-black text-sky-100">{formatStunden(Number(tag.netto_stunden || 0))}</div>
                        <div className="mt-1 text-xs font-black uppercase tracking-widest text-white/45">{tag.status || "Offen"}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
            <h3 className="text-xl font-black text-white">Projektverteilung</h3>
            <p className="mt-1 text-sm text-white/45">Projektzeit inklusive automatisch berechnetem Betriebsunterhalt.</p>

            <div className="mt-5 space-y-3">
              {berechnung.projektVerteilung.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-white/45">
                  Noch keine Projektbuchungen im aktuellen Monat.
                </div>
              ) : (
                berechnung.projektVerteilung.map((projekt) => (
                  <div key={projekt.name} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate font-black text-white">{projekt.name}</div>
                        <div className="mt-1 text-sm text-white/45">{projekt.buchungen} Buchung{projekt.buchungen === 1 ? "" : "en"}</div>
                      </div>
                      <div className="shrink-0 text-lg font-black text-sky-100">{formatStunden(projekt.stunden)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DropdownPanel>

      <DropdownPanel
        id="system"
        title="System"
        eyebrow="ODZ · StahlFabrik · Konto"
        description="App-Version, Hinweise und Logout."
        open={systemOffen}
        onToggle={() => setSystemOffen(!systemOffen)}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoBox label="App" value="StahlFabrik" />
          <InfoBox label="Version" value="ODZ SILVER · V1.1" highlight="blue" />
          <InfoBox label="Design" value="DESIGN NACH MASS" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <h3 className="text-xl font-black text-white">Konto</h3>
          <p className="mt-2 text-sm leading-6 text-white/50">
            Passwortänderung und persönliche Stammdaten-Bearbeitung kommen später sauber als eigener Prozess. Arbeitsmodell, Rolle und Startdaten bleiben Admin-Sache.
          </p>

          <button
            type="button"
            onClick={logout}
            className="mt-5 rounded-2xl border border-red-400/25 bg-red-500/10 px-5 py-3 font-black text-red-200 transition hover:-translate-y-1 hover:border-red-300/45 hover:bg-red-500/15"
          >
            Logout
          </button>
        </div>
      </DropdownPanel>
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center transition hover:border-sky-300/25 hover:bg-sky-300/5">
      <div
        className={`truncate text-xl font-black leading-tight md:text-2xl ${
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
      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/45">
        {label}
      </div>
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
          <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-200">{eyebrow}</div>
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

function InfoBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: "green" | "red" | "blue";
}) {
  const color =
    highlight === "green"
      ? "text-green-400"
      : highlight === "red"
        ? "text-red-400"
        : highlight === "blue"
          ? "text-sky-100"
          : "text-slate-100";

  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/25 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10">
      <div className="truncate text-xs font-black uppercase tracking-[0.2em] text-white/35">
        {label}
      </div>
      <div className={`mt-2 truncate text-2xl font-black ${color}`}>{value}</div>
    </div>
  );
}

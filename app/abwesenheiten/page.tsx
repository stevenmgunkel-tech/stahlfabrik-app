"use client";

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { istFeiertagSG } from "@/lib/feiertage";

type Abwesenheit = {
  id: number;
  mitarbeiter?: string | null;
  typ: string;
  von: string;
  bis: string;
  tage: number | string | null;
  stunden: number | string | null;
  status: string;
  user_id: string;
};

type Konto = {
  jahresurlaub: number;
  genommenerUrlaub: number;
  kranktage: number;
  offeneAntraege: number;
  ueberstundenabbauStunden: number;
  ueberstundenAktuell: number;
};

type Arbeitsmodell = {
  pensumProzent: number;
  wochenstunden: number;
  arbeitstageProWoche: number;
  tagesSoll: number;
  freierWochentag: string;
  zeiterfassungAb: string;
};

const initialArbeitsmodell: Arbeitsmodell = {
  pensumProzent: 100,
  wochenstunden: 42.5,
  arbeitstageProWoche: 5,
  tagesSoll: 8.5,
  freierWochentag: "",
  zeiterfassungAb: "",
};

const wochentagIndex: Record<string, number> = {
  Sonntag: 0,
  Montag: 1,
  Dienstag: 2,
  Mittwoch: 3,
  Donnerstag: 4,
  Freitag: 5,
  Samstag: 6,
};

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

function maxDatum(startDatum: Date, grenze?: Date | null) {
  const start = new Date(startDatum);
  start.setHours(0, 0, 0, 0);

  if (!grenze) return start;

  const limit = new Date(grenze);
  limit.setHours(0, 0, 0, 0);

  return limit > start ? limit : start;
}

function minDatum(startDatum: Date, grenze?: Date | null) {
  const start = new Date(startDatum);
  start.setHours(0, 0, 0, 0);

  if (!grenze) return start;

  const limit = new Date(grenze);
  limit.setHours(0, 0, 0, 0);

  return limit < start ? limit : start;
}

function istFreierWochentag(datum: Date, freierWochentag?: string | null) {
  if (!freierWochentag) return false;

  const index = wochentagIndex[String(freierWochentag).trim()];
  if (index === undefined) return false;

  return datum.getDay() === index;
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
    const istFrei = istFreierWochentag(aktuell, freierWochentag);

    if (!istWochenende && !istFeiertag && !istFrei) {
      tage++;
    }

    aktuell.setDate(aktuell.getDate() + 1);
  }

  return tage;
}

function abwesenheitstage(von?: string | null, bis?: string | null, freierWochentag?: string | null) {
  const start = parseDatumLokal(von);
  const ende = parseDatumLokal(bis);

  if (!start || !ende || ende < start) return 0;

  return zaehleArbeitstage(start, ende, freierWochentag);
}

function abwesenheitstageImZeitraum(
  eintrag: Abwesenheit,
  startGrenze: Date,
  endeGrenze: Date,
  freierWochentag?: string | null
) {
  const start = parseDatumLokal(eintrag.von);
  const ende = parseDatumLokal(eintrag.bis);

  if (!start || !ende) return 0;

  const effektiverStart = maxDatum(start, startGrenze);
  const effektivesEnde = minDatum(ende, endeGrenze);

  if (effektivesEnde < effektiverStart) return 0;

  return zaehleArbeitstage(effektiverStart, effektivesEnde, freierWochentag);
}

export default function AbwesenheitenPage() {
  const [abwesenheiten, setAbwesenheiten] = useState<Abwesenheit[]>([]);
  const [konto, setKonto] = useState<Konto>({
    jahresurlaub: 0,
    genommenerUrlaub: 0,
    kranktage: 0,
    offeneAntraege: 0,
    ueberstundenabbauStunden: 0,
    ueberstundenAktuell: 0,
  });
  const [arbeitsmodell, setArbeitsmodell] =
    useState<Arbeitsmodell>(initialArbeitsmodell);

  const [typ, setTyp] = useState("Urlaub");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [stunden, setStunden] = useState("");

  const [saving, setSaving] = useState(false);
  const [meldung, setMeldung] = useState("");
  const [kontoOffen, setKontoOffen] = useState(true);
  const [formularOffen, setFormularOffen] = useState(true);
  const [uebersichtOffen, setUebersichtOffen] = useState(true);

  useEffect(() => {
    ladeDaten();
  }, []);

  async function ladeDaten() {
    setMeldung("");

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: mitarbeiter, error: mitarbeiterError } = await supabase
      .from("mitarbeiter")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (mitarbeiterError) {
      setMeldung(mitarbeiterError.message);
      console.log(mitarbeiterError);
    }

    const { data, error } = await supabase
      .from("urlaub")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    const { data: arbeitszeiten, error: zeitenError } = await supabase
      .from("arbeitszeiten")
      .select("*")
      .eq("user_id", user.id);

    const { data: tagespausen, error: pausenError } = await supabase
      .from("tagespausen")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    if (zeitenError) {
      setMeldung(zeitenError.message);
      console.log(zeitenError);
    }

    if (pausenError) {
      setMeldung(pausenError.message);
      console.log(pausenError);
    }

    const eintraege = (data || []) as Abwesenheit[];

    const jahresurlaub = Number(mitarbeiter?.urlaubstage || 0);
    const ueberstundenStart = Number(mitarbeiter?.ueberstunden_start || 0);
    const wochenstunden = Number(mitarbeiter?.wochenstunden || 42.5);
    const pensumProzent = Number(
      mitarbeiter?.pensum_prozent || (wochenstunden === 34 ? 80 : 100)
    );
    const arbeitstageProWoche = Number(
      mitarbeiter?.arbeitstage_pro_woche ||
        (pensumProzent === 80 || wochenstunden === 34 ? 4 : 5)
    );
    const freierWochentag = String(
      mitarbeiter?.freier_wochentag ||
        (arbeitstageProWoche === 4 ? "Freitag" : "")
    ).trim();
    const tagesSoll =
      arbeitstageProWoche > 0 ? wochenstunden / arbeitstageProWoche : 8.5;
    const zeiterfassungAb = String(
      mitarbeiter?.zeiterfassung_ab || mitarbeiter?.eintrittsdatum || ""
    ).slice(0, 10);

    setArbeitsmodell({
      pensumProzent,
      wochenstunden,
      arbeitstageProWoche,
      tagesSoll,
      freierWochentag,
      zeiterfassungAb,
    });

    const genommenerUrlaub = eintraege
      .filter(
        (eintrag) =>
          eintrag.typ === "Urlaub" && eintrag.status === "Genehmigt"
      )
      .reduce(
        (sum, eintrag) =>
          sum + abwesenheitstage(eintrag.von, eintrag.bis, freierWochentag),
        0
      );

    const kranktage = eintraege
      .filter((eintrag) => eintrag.typ === "Krank")
      .reduce(
        (sum, eintrag) =>
          sum + abwesenheitstage(eintrag.von, eintrag.bis, freierWochentag),
        0
      );

    const ueberstundenabbauStunden = eintraege
      .filter(
        (eintrag) =>
          eintrag.typ === "Überstundenabbau" &&
          eintrag.status === "Genehmigt"
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0);

    const heuteDate = new Date();
    heuteDate.setHours(0, 0, 0, 0);
    const heute = formatDateLocal(heuteDate);
    const monatsStartBasisDate = getErsterTagDieserMonat();
    const zeiterfassungAbDate = parseDatumLokal(zeiterfassungAb);
    const monatsStartDate = maxDatum(monatsStartBasisDate, zeiterfassungAbDate);
    const monatsStart = formatDateLocal(monatsStartDate);
    const monatNochNichtGestartet = monatsStartDate > heuteDate;

    const arbeitszeitenMonat =
      arbeitszeiten?.filter(
        (item) =>
          item.datum >= monatsStart &&
          item.datum <= heute &&
          (!zeiterfassungAb || !item.datum || item.datum >= zeiterfassungAb)
      ) || [];

    const monatBrutto = arbeitszeitenMonat.reduce(
      (sum, item) => sum + Number(item.stunden || 0),
      0
    );

    const pausenMonat =
      tagespausen
        ?.filter(
          (pause) =>
            pause.datum >= monatsStart &&
            pause.datum <= heute &&
            (!zeiterfassungAb || !pause.datum || pause.datum >= zeiterfassungAb)
        )
        .reduce((sum, pause) => sum + Number(pause.pause || 0) / 60, 0) || 0;

    const monatIst = monatBrutto - pausenMonat;
    const monatTage = monatNochNichtGestartet
      ? 0
      : zaehleArbeitstage(monatsStartDate, heuteDate, freierWochentag);
    const monatSoll = tagesSoll * monatTage;

    const urlaubstageMonat = eintraege
      .filter(
        (eintrag) =>
          eintrag.typ === "Urlaub" &&
          eintrag.status === "Genehmigt" &&
          eintrag.bis >= monatsStart &&
          eintrag.von <= heute
      )
      .reduce(
        (sum, eintrag) =>
          sum +
          abwesenheitstageImZeitraum(
            eintrag,
            monatsStartDate,
            heuteDate,
            freierWochentag
          ),
        0
      );

    const kranktageMonat = eintraege
      .filter(
        (eintrag) =>
          eintrag.typ === "Krank" &&
          eintrag.bis >= monatsStart &&
          eintrag.von <= heute
      )
      .reduce(
        (sum, eintrag) =>
          sum +
          abwesenheitstageImZeitraum(
            eintrag,
            monatsStartDate,
            heuteDate,
            freierWochentag
          ),
        0
      );

    const ueberstundenabbauStundenMonat = eintraege
      .filter(
        (eintrag) =>
          eintrag.typ === "Überstundenabbau" &&
          eintrag.status === "Genehmigt" &&
          eintrag.von >= monatsStart &&
          eintrag.von <= heute
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0);

    const abwesenheitsstundenMonat =
      (urlaubstageMonat + kranktageMonat) * tagesSoll;

    const angerechneteStundenMonat = monatIst + abwesenheitsstundenMonat;
    const monatDifferenz = angerechneteStundenMonat - monatSoll;
    const ueberstundenAktuell =
      ueberstundenStart + monatDifferenz - ueberstundenabbauStundenMonat;

    const offeneAntraege = eintraege.filter(
      (eintrag) => eintrag.status === "Beantragt"
    ).length;

    setAbwesenheiten(eintraege);
    setKonto({
      jahresurlaub,
      genommenerUrlaub,
      kranktage,
      offeneAntraege,
      ueberstundenabbauStunden,
      ueberstundenAktuell,
    });
  }

  function berechneTage() {
    if (typ === "Überstundenabbau") return 0;
    if (!von || !bis) return 0;

    return abwesenheitstage(von, bis, arbeitsmodell.freierWochentag);
  }

  function formatStunden(wert: number, mitVorzeichen = false) {
    if (!Number.isFinite(wert)) return "0 min";

    const negativ = wert < 0;
    const absolut = Math.abs(wert);
    const gesamtMinuten = Math.round(absolut * 60);
    const stundenWert = Math.floor(gesamtMinuten / 60);
    const minuten = gesamtMinuten % 60;
    const prefix = negativ ? "-" : mitVorzeichen && wert > 0 ? "+" : "";

    if (stundenWert === 0) return `${prefix}${minuten} min`;
    if (minuten === 0) return `${prefix}${stundenWert} h`;

    return `${prefix}${stundenWert} h ${minuten} min`;
  }

  async function abwesenheitHinzufuegen() {
    setMeldung("");

    if (typ === "Überstundenabbau") {
      if (!von || !stunden) {
        setMeldung("Bitte Datum und Stunden eingeben.");
        return;
      }

      const stundenWert = Number(stunden);

      if (!Number.isFinite(stundenWert) || stundenWert <= 0) {
        setMeldung("Bitte gültige Stunden eingeben.");
        return;
      }
    } else {
      if (!von || !bis) {
        setMeldung("Bitte Start- und Enddatum auswählen.");
        return;
      }

      const tage = berechneTage();

      if (tage <= 0) {
        setMeldung("Bitte gültigen Zeitraum auswählen.");
        return;
      }
    }

    const tage = berechneTage();

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      setMeldung("Bitte zuerst einloggen.");
      window.location.href = "/login";
      return;
    }

    let mitarbeiterName = user.email || "Unbekannt";

    const { data: mitarbeiterData } = await supabase
      .from("mitarbeiter")
      .select("name")
      .eq("user_id", user.id)
      .single();

    if (mitarbeiterData?.name) {
      mitarbeiterName = mitarbeiterData.name;
    }

    setSaving(true);

    const { error } = await supabase.from("urlaub").insert([
      {
        mitarbeiter: mitarbeiterName,
        typ,
        von,
        bis: typ === "Überstundenabbau" ? von : bis,
        tage: typ === "Überstundenabbau" ? 0 : tage,
        stunden: typ === "Überstundenabbau" ? Number(stunden) : 0,
        status: "Beantragt",
        user_id: user.id,
      },
    ]);

    if (error) {
      setSaving(false);
      setMeldung(error.message);
      console.log(error);
      return;
    }

    setTyp("Urlaub");
    setVon("");
    setBis("");
    setStunden("");

    await ladeDaten();

    setSaving(false);
    setMeldung("Antrag wurde gespeichert.");
  }

  async function abwesenheitLoeschen(id: number) {
    setMeldung("");

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      setMeldung("Bitte zuerst einloggen.");
      window.location.href = "/login";
      return;
    }

    const { data: eintrag, error: leseError } = await supabase
      .from("urlaub")
      .select("id, status, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (leseError || !eintrag) {
      setMeldung(leseError?.message || "Abwesenheit konnte nicht gefunden werden.");
      console.log(leseError);
      return;
    }

    if (eintrag.status !== "Beantragt") {
      setMeldung("Nur offene Anträge können gelöscht werden. Genehmigte oder abgelehnte Einträge bleiben als Verlauf erhalten.");
      return;
    }

    const bestaetigen = confirm("Offenen Antrag wirklich löschen?");
    if (!bestaetigen) return;

    const { error } = await supabase
      .from("urlaub")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    await ladeDaten();
    setMeldung("Offener Antrag wurde gelöscht.");
  }

  function typFarbe(eintragTyp: string) {
    if (eintragTyp === "Urlaub") {
      return "border-sky-300/30 bg-sky-300/10 text-sky-200";
    }

    if (eintragTyp === "Krank") {
      return "border-red-400/30 bg-red-500/10 text-red-300";
    }

    if (eintragTyp === "Überstundenabbau") {
      return "border-slate-200/30 bg-slate-200/10 text-slate-100";
    }

    return "border-white/10 bg-white/[0.06] text-white/70";
  }

  function statusFarbe(status: string) {
    if (status === "Genehmigt") {
      return "border-green-400/30 bg-green-500/10 text-green-300";
    }

    if (status === "Abgelehnt") {
      return "border-red-400/30 bg-red-500/10 text-red-300";
    }

    return "border-slate-200/30 bg-slate-200/10 text-slate-100";
  }

  function eintragZeitraum(eintrag: Abwesenheit) {
    if (eintrag.typ === "Überstundenabbau") {
      return eintrag.von;
    }

    return `${eintrag.von} bis ${eintrag.bis}`;
  }

  function eintragMenge(eintrag: Abwesenheit) {
    if (eintrag.typ === "Überstundenabbau") {
      return formatStunden(Number(eintrag.stunden || 0));
    }

    const tage = abwesenheitstage(
      eintrag.von,
      eintrag.bis,
      arbeitsmodell.freierWochentag
    );

    return `${tage || Number(eintrag.tage || 0)} Arbeitstage`;
  }

  function darfLoeschen(eintrag: Abwesenheit) {
    return eintrag.status === "Beantragt";
  }

  const resturlaub = konto.jahresurlaub - konto.genommenerUrlaub;
  const verbrauchtProzent =
    konto.jahresurlaub > 0
      ? Math.min((konto.genommenerUrlaub / konto.jahresurlaub) * 100, 100)
      : 0;
  const restProzent =
    konto.jahresurlaub > 0
      ? Math.max((resturlaub / konto.jahresurlaub) * 100, 0)
      : 0;

  const berechneteTage = berechneTage();
  const berechneteStunden = Number(stunden || 0);

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
              ODZ SILVER · Abwesenheiten
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Abwesenheiten
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/65 sm:text-base">
              Urlaub, Krankheit und Überstundenabbau sauber erfassen und kontrollieren.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-xl">
                <span
                  className={`h-3 w-3 rounded-full ${
                    konto.offeneAntraege > 0
                      ? "bg-sky-300 shadow-lg shadow-sky-300/40"
                      : "bg-green-400 shadow-lg shadow-green-400/40"
                  }`}
                />
                <span className="text-xs font-black uppercase tracking-widest text-white/70">
                  {konto.offeneAntraege > 0 ? "Antrag offen" : "Alles sauber"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-3xl border border-white/10 bg-black/25 p-2 text-center backdrop-blur-xl sm:p-3 md:grid-cols-3">
            <HeroMini label="Ferien" value={resturlaub} green={resturlaub >= 0} red={resturlaub < 0} />
            <HeroMini label="Offen" value={String(konto.offeneAntraege).padStart(2, "0")} blue={konto.offeneAntraege > 0} />
            <HeroMini label="Krank" value={String(konto.kranktage).padStart(2, "0")} red={konto.kranktage > 0} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ActionCard href="#konto" label="Konto" title="🌿 Urlaub" onClick={() => setKontoOffen(true)} />
        <ActionCard href="#formular" label="Beantragen" title="✦ Abwesenheit" onClick={() => setFormularOffen(true)} />
        <ActionCard href="#uebersicht" label="Status" title="▤ Anträge" onClick={() => setUebersichtOffen(true)} />
        <ActionCard href="#uebersicht" label="Verlauf" title="📊 Übersicht" onClick={() => setUebersichtOffen(true)} />
      </section>

      {meldung && (
        <div className="rounded-xl border border-slate-200/20 bg-slate-200/10 p-4 text-sm font-bold text-slate-100">
          {meldung}
        </div>
      )}

      <DropdownPanel
        id="konto"
        title="Urlaubskonto"
        eyebrow="Ferien · Krankheit · Überstunden"
        description="Jahresurlaub, Verbrauch, Resturlaub und Überstundenabbau als ruhige Kontoübersicht."
        open={kontoOffen}
        onToggle={() => setKontoOffen(!kontoOffen)}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <InfoBox label="Jahresurlaub" value={`${konto.jahresurlaub} Tage`} />
          <InfoBox label="Genommen" value={`${konto.genommenerUrlaub} Tage`} />
          <InfoBox
            label="Resturlaub"
            value={`${resturlaub} Tage`}
            highlight={resturlaub >= 0 ? "green" : "red"}
          />
          <InfoBox
            label="Arbeitsmodell"
            value={`${arbeitsmodell.pensumProzent}% · ${arbeitsmodell.arbeitstageProWoche} Tage`}
            highlight="blue"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                Verbrauch
              </div>
              <div className="mt-2 text-2xl font-black text-white">
                {konto.genommenerUrlaub} von {konto.jahresurlaub} Tagen
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-slate-100">
              {restProzent.toFixed(0)}% verfügbar
            </div>
          </div>

          <div className="overflow-hidden rounded-full border border-white/10 bg-black/35 p-1">
            <div
              className="h-4 rounded-full bg-gradient-to-r from-sky-200 to-emerald-300 shadow-lg shadow-sky-300/20 transition-all"
              style={{ width: `${verbrauchtProzent}%` }}
            />
          </div>

          <div className="mt-4 flex justify-between text-sm text-white/50">
            <span>{verbrauchtProzent.toFixed(0)}% verbraucht</span>
            <span>{restProzent.toFixed(0)}% verfügbar</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InfoBox
            label="Offene Anträge"
            value={konto.offeneAntraege}
            highlight={konto.offeneAntraege > 0 ? "blue" : "green"}
          />
          <InfoBox
            label="Kranktage"
            value={konto.kranktage}
            highlight={konto.kranktage > 0 ? "red" : undefined}
          />
          <InfoBox
            label="Überstundenabbau"
            value={formatStunden(konto.ueberstundenabbauStunden)}
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <div className="text-sm font-bold text-white/50">Aktuelle Überstunden</div>
          <div
            className={`mt-2 text-3xl font-black ${
              konto.ueberstundenAktuell >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {formatStunden(konto.ueberstundenAktuell, true)}
          </div>
        </div>
      </DropdownPanel>

      <DropdownPanel
        id="formular"
        title="Abwesenheit erfassen"
        eyebrow="Urlaub · Krankheit · Überstundenabbau"
        description={
          typ === "Überstundenabbau"
            ? "Datum und Stunden für Überstundenabbau eintragen."
            : "Zeitraum auswählen und Antrag speichern."
        }
        open={formularOffen}
        onToggle={() => setFormularOffen(!formularOffen)}
      >
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="rounded-2xl border border-white/10 bg-black/25 px-5 py-4">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
              Berechnet
            </div>
            <div className="mt-2 text-3xl font-black text-slate-100">
              {typ === "Überstundenabbau"
                ? formatStunden(berechneteStunden || 0)
                : `${berechneteTage} Tage`}
            </div>
          </div>

          {typ === "Überstundenabbau" && (
            <div className="rounded-2xl border border-sky-300/20 bg-sky-300/5 p-4 text-sm font-medium text-sky-100">
              Überstundenabbau wird in Stunden erfasst und später direkt vom Überstundenkonto abgezogen.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field label="Typ">
            <select
              value={typ}
              onChange={(e) => {
                setTyp(e.target.value);
                setVon("");
                setBis("");
                setStunden("");
              }}
              className="dark-input"
            >
              <option value="Urlaub">Urlaub</option>
              <option value="Krank">Krank</option>
              <option value="Überstundenabbau">Überstundenabbau</option>
            </select>
          </Field>

          {typ === "Überstundenabbau" ? (
            <>
              <Field label="Datum">
                <input
                  type="date"
                  value={von}
                  onChange={(e) => setVon(e.target.value)}
                  className="dark-input"
                />
              </Field>

              <Field label="Stunden">
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  placeholder="z.B. 2.5"
                  value={stunden}
                  onChange={(e) => setStunden(e.target.value)}
                  className="dark-input"
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Von">
                <input
                  type="date"
                  value={von}
                  onChange={(e) => setVon(e.target.value)}
                  className="dark-input"
                />
              </Field>

              <Field label="Bis">
                <input
                  type="date"
                  value={bis}
                  onChange={(e) => setBis(e.target.value)}
                  className="dark-input"
                />
              </Field>
            </>
          )}

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={abwesenheitHinzufuegen}
              disabled={saving}
              className="rounded-2xl border border-slate-200/30 bg-slate-200/10 p-4 font-black text-slate-100 shadow-lg shadow-slate-200/10 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:bg-sky-300/10 hover:shadow-sky-300/10 disabled:opacity-50"
            >
              {saving ? "Speichern..." : "Speichern"}
            </button>
          </div>
        </div>
      </DropdownPanel>

      <DropdownPanel
        id="uebersicht"
        title="Meine Abwesenheiten"
        eyebrow="Status · Verlauf · Kontrolle"
        description="Übersicht deiner Anträge, Genehmigungen und abgelehnten Einträge."
        open={uebersichtOffen}
        onToggle={() => setUebersichtOffen(!uebersichtOffen)}
      >
        <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black text-white">Übersicht</h2>
            <p className="mt-1 text-white/55">
              Alle Abwesenheiten mit Status und Menge.
            </p>
          </div>

          <div className="text-sm text-white/50">
            {abwesenheiten.length} Einträge
          </div>
        </div>

        {abwesenheiten.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-white/55">
            Noch keine Abwesenheiten vorhanden.
          </div>
        )}

        <div className="space-y-4 md:hidden">
          {abwesenheiten.map((eintrag) => (
            <MobileEntry
              key={eintrag.id}
              eintrag={eintrag}
              typFarbe={typFarbe}
              statusFarbe={statusFarbe}
              eintragZeitraum={eintragZeitraum}
              eintragMenge={eintragMenge}
              onDelete={() => abwesenheitLoeschen(eintrag.id)}
              canDelete={darfLoeschen(eintrag)}
            />
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-white/10 md:block">
          <div className="overflow-x-auto">
            <div className="min-w-[850px]">
              <div className="grid grid-cols-6 border-b border-white/10 bg-black/20 px-5 py-4 text-sm font-bold uppercase tracking-wide text-white/50">
                <div>Typ</div>
                <div>Von</div>
                <div>Bis / Datum</div>
                <div>Tage / Stunden</div>
                <div>Status</div>
                <div>Aktion</div>
              </div>

              {abwesenheiten.map((eintrag) => (
                <div
                  key={eintrag.id}
                  className="grid grid-cols-6 items-center border-b border-white/10 px-5 py-4 text-white/80 transition hover:bg-sky-300/5"
                >
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${typFarbe(
                        eintrag.typ
                      )}`}
                    >
                      {eintrag.typ || "Urlaub"}
                    </span>
                  </div>

                  <div>{eintrag.von}</div>

                  <div>
                    {eintrag.typ === "Überstundenabbau"
                      ? eintrag.von
                      : eintrag.bis}
                  </div>

                  <div className="font-black text-slate-100">
                    {eintragMenge(eintrag)}
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${statusFarbe(
                        eintrag.status
                      )}`}
                    >
                      {eintrag.status}
                    </span>
                  </div>

                  <div>
                    {darfLoeschen(eintrag) ? (
                      <button
                        type="button"
                        onClick={() => abwesenheitLoeschen(eintrag.id)}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 font-bold text-red-300 transition hover:bg-red-500/15"
                      >
                        Löschen
                      </button>
                    ) : (
                      <span className="text-sm font-bold text-white/35">Verlauf</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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

        .dark-input option {
          background: #111315;
          color: white;
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
      `}</style>
    </main>
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
      ? "text-sky-200"
      : "text-slate-100";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-black ${color}`}>{value}</div>
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
      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/45">{label}</div>
    </div>
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
    <div>
      <label className="mb-2 block text-sm font-bold text-white/70">{label}</label>
      {children}
    </div>
  );
}

function MobileEntry({
  eintrag,
  typFarbe,
  statusFarbe,
  eintragZeitraum,
  eintragMenge,
  onDelete,
  canDelete,
}: {
  eintrag: Abwesenheit;
  typFarbe: (typ: string) => string;
  statusFarbe: (status: string) => string;
  eintragZeitraum: (eintrag: Abwesenheit) => string;
  eintragMenge: (eintrag: Abwesenheit) => string;
  onDelete: () => void;
  canDelete: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-5 transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${typFarbe(
              eintrag.typ
            )}`}
          >
            {eintrag.typ || "Urlaub"}
          </span>

          <p className="mt-4 text-lg font-black text-white">
            {eintragZeitraum(eintrag)}
          </p>

          <p className="mt-1 text-sm text-white/60">
            {eintragMenge(eintrag)}
          </p>
        </div>

        <span
          className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${statusFarbe(
            eintrag.status
          )}`}
        >
          {eintrag.status}
        </span>
      </div>

      {canDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="mt-5 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-bold text-red-300 transition hover:bg-red-500/15"
        >
          Löschen
        </button>
      ) : (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm font-bold text-white/35">
          Verlauf bleibt gespeichert
        </div>
      )}
    </div>
  );
}

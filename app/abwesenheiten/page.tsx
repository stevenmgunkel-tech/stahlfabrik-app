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

    const { data: tageszeiten, error: tageszeitenError } = await supabase
      .from("tageszeiten")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    if (tageszeitenError) {
      setMeldung(tageszeitenError.message);
      console.log(tageszeitenError);
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

    const echteTageszeiten =
      (tageszeiten || []).filter(
        (tag) =>
          tag.status !== "Offen" &&
          tag.datum &&
          (!zeiterfassungAb || tag.datum >= zeiterfassungAb)
      ) || [];

    function istzeitAusTageszeiten(start: string, ende: string) {
      return echteTageszeiten
        .filter((tag) => tag.datum >= start && tag.datum <= ende)
        .reduce((sum, tag) => sum + Number(tag.netto_stunden || 0), 0);
    }

    const monatIst = monatNochNichtGestartet
      ? 0
      : istzeitAusTageszeiten(monatsStart, heute);
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

    const abwesenheitsstundenMonat =
      (urlaubstageMonat + kranktageMonat) * tagesSoll;

    const angerechneteStundenMonat = monatIst + abwesenheitsstundenMonat;
    const monatDifferenz = angerechneteStundenMonat - monatSoll;

    const ersteTageszeit = [...echteTageszeiten]
      .filter((tag) => tag.datum)
      .sort((a, b) => String(a.datum || "").localeCompare(String(b.datum || "")))[0];

    const gesamtStartDate =
      zeiterfassungAbDate ||
      parseDatumLokal(ersteTageszeit?.datum) ||
      monatsStartDate;
    const gesamtStart = formatDateLocal(gesamtStartDate);
    const gesamtNochNichtGestartet = gesamtStartDate > heuteDate;

    const gesamtIst = gesamtNochNichtGestartet
      ? 0
      : istzeitAusTageszeiten(gesamtStart, heute);
    const gesamtTage = gesamtNochNichtGestartet
      ? 0
      : zaehleArbeitstage(gesamtStartDate, heuteDate, freierWochentag);
    const gesamtSoll = tagesSoll * gesamtTage;

    const urlaubstageGesamt = eintraege
      .filter(
        (eintrag) =>
          eintrag.typ === "Urlaub" &&
          eintrag.status === "Genehmigt" &&
          eintrag.bis >= gesamtStart &&
          eintrag.von <= heute
      )
      .reduce(
        (sum, eintrag) =>
          sum +
          abwesenheitstageImZeitraum(
            eintrag,
            gesamtStartDate,
            heuteDate,
            freierWochentag
          ),
        0
      );

    const kranktageGesamt = eintraege
      .filter(
        (eintrag) =>
          eintrag.typ === "Krank" &&
          eintrag.bis >= gesamtStart &&
          eintrag.von <= heute
      )
      .reduce(
        (sum, eintrag) =>
          sum +
          abwesenheitstageImZeitraum(
            eintrag,
            gesamtStartDate,
            heuteDate,
            freierWochentag
          ),
        0
      );

    const ueberstundenabbauStundenGesamt = eintraege
      .filter(
        (eintrag) =>
          eintrag.typ === "Überstundenabbau" &&
          eintrag.status === "Genehmigt" &&
          eintrag.bis >= gesamtStart &&
          eintrag.von <= heute
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0);

    const abwesenheitsstundenGesamt =
      (urlaubstageGesamt + kranktageGesamt) * tagesSoll;

    const angerechneteStundenGesamt = gesamtIst + abwesenheitsstundenGesamt;
    const ueberstundenZeitraum = angerechneteStundenGesamt - gesamtSoll;

    const ueberstundenAktuell =
      ueberstundenStart + ueberstundenZeitraum - ueberstundenabbauStundenGesamt;

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
      return "border-orange-300/35 bg-orange-300/10 text-orange-700";
    }

    if (eintragTyp === "Krank") {
      return "border-red-400/30 bg-red-950/10 text-red-800";
    }

    if (eintragTyp === "Überstundenabbau") {
      return "border-slate-200/30 bg-slate-200/10 text-slate-950";
    }

    return "border-white/70 bg-white/60 text-slate-600";
  }

  function statusFarbe(status: string) {
    if (status === "Genehmigt") {
      return "border-green-400/30 bg-green-500/10 text-green-300";
    }

    if (status === "Abgelehnt") {
      return "border-red-400/30 bg-red-950/10 text-red-800";
    }

    return "border-slate-200/30 bg-slate-200/10 text-slate-950";
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
    <main className="abwesenheiten-v12 space-y-6 text-slate-950">
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
              ODZ V1.2 · Abwesenheiten
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Abwesenheiten
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-950/65 sm:text-base">
              Urlaub, Krankheit und Überstundenabbau sauber erfassen und kontrollieren.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/55 px-3 py-2 backdrop-blur-xl">
                <span
                  className={`h-3 w-3 rounded-full ${
                    konto.offeneAntraege > 0
                      ? "bg-sky-300 shadow-lg shadow-orange-900/20"
                      : "bg-green-400 shadow-lg shadow-green-400/40"
                  }`}
                />
                <span className="text-xs font-black uppercase tracking-widest text-white/70">
                  {konto.offeneAntraege > 0 ? "Antrag offen" : "Alles sauber"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-3xl border border-white/70 bg-white/55 p-2 text-center backdrop-blur-xl sm:p-3 md:grid-cols-3">
            <HeroMini label="Ferien" value={resturlaub} green={resturlaub >= 0} red={resturlaub < 0} />
            <HeroMini label="Offen" value={String(konto.offeneAntraege).padStart(2, "0")} blue={konto.offeneAntraege > 0} />
            <HeroMini label="Krank" value={String(konto.kranktage).padStart(2, "0")} red={konto.kranktage > 0} />
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-white/60 bg-white/35 p-2 shadow-[0_14px_44px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <ActionCard href="#konto" label="Konto" title="🌿 Urlaub" onClick={() => setKontoOffen(true)} />
        <ActionCard href="#formular" label="Beantragen" title="✦ Abwesenheit" onClick={() => setFormularOffen(true)} />
        <ActionCard href="#uebersicht" label="Status" title="▤ Anträge" onClick={() => setUebersichtOffen(true)} />
        <ActionCard href="#uebersicht" label="Verlauf" title="📊 Übersicht" onClick={() => setUebersichtOffen(true)} />
        </div>
      </section>

      {meldung && (
        <div className="rounded-xl border border-orange-200/40 bg-orange-100/60 p-4 text-sm font-bold text-slate-950">
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

        <div className="rounded-2xl border border-white/70 bg-white/55 p-5">
          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                Verbrauch
              </div>
              <div className="mt-2 text-2xl font-black text-slate-950">
                {konto.genommenerUrlaub} von {konto.jahresurlaub} Tagen
              </div>
            </div>

            <div className="rounded-2xl border border-white/70 bg-white/55 px-4 py-3 text-sm font-black text-slate-950">
              {restProzent.toFixed(0)}% verfügbar
            </div>
          </div>

          <div className="overflow-hidden rounded-full border border-white/70 bg-stone-900/10 p-1">
            <div
              className="h-4 rounded-full bg-gradient-to-r from-orange-300 to-emerald-300 shadow-lg shadow-orange-900/10 transition-all"
              style={{ width: `${verbrauchtProzent}%` }}
            />
          </div>

          <div className="mt-4 flex justify-between text-sm text-slate-500">
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

        <div className="rounded-2xl border border-white/70 bg-white/55 p-5">
          <div className="text-sm font-bold text-slate-500">Aktuelle Überstunden</div>
          <div
            className={`mt-2 text-3xl font-black ${
              konto.ueberstundenAktuell >= 0 ? "text-green-600" : "text-red-600"
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
          <div className="rounded-2xl border border-white/70 bg-white/55 px-5 py-4">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Berechnet
            </div>
            <div className="mt-2 text-3xl font-black text-slate-950">
              {typ === "Überstundenabbau"
                ? formatStunden(berechneteStunden || 0)
                : `${berechneteTage} Tage`}
            </div>
          </div>

          {typ === "Überstundenabbau" && (
            <div className="rounded-2xl border border-orange-300/30 bg-orange-300/5 p-4 text-sm font-medium text-orange-800">
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
              className="warm-input"
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
                  className="warm-input"
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
                  className="warm-input"
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
                  className="warm-input"
                />
              </Field>

              <Field label="Bis">
                <input
                  type="date"
                  value={bis}
                  onChange={(e) => setBis(e.target.value)}
                  className="warm-input"
                />
              </Field>
            </>
          )}

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={abwesenheitHinzufuegen}
              disabled={saving}
              className="rounded-2xl border border-orange-200/50 bg-orange-100/60 p-4 font-black text-slate-950 shadow-lg shadow-orange-900/10 transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/60 hover:bg-orange-100/80 hover:shadow-orange-900/10 disabled:opacity-50"
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
            <h2 className="text-2xl font-black text-slate-950">Übersicht</h2>
            <p className="mt-1 text-slate-500">
              Alle Abwesenheiten mit Status und Menge.
            </p>
          </div>

          <div className="text-sm text-slate-500">
            {abwesenheiten.length} Einträge
          </div>
        </div>

        {abwesenheiten.length === 0 && (
          <div className="rounded-xl border border-white/70 bg-white/55 p-5 text-slate-500">
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

        <div className="hidden overflow-hidden rounded-2xl border border-white/70 md:block">
          <div className="overflow-x-auto">
            <div className="min-w-[850px]">
              <div className="grid grid-cols-6 border-b border-white/70 bg-stone-900/5 px-5 py-4 text-sm font-bold uppercase tracking-wide text-slate-500">
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
                  className="grid grid-cols-6 items-center border-b border-white/70 px-5 py-4 text-slate-700 transition hover:bg-orange-300/5"
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

                  <div className="font-black text-slate-950">
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
                        className="rounded-lg border border-red-950/30 bg-red-950/10 px-4 py-2 font-bold text-red-800 transition hover:bg-red-950/15"
                      >
                        Löschen
                      </button>
                    ) : (
                      <span className="text-sm font-bold text-slate-400">Verlauf</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DropdownPanel>

      <style jsx global>{`
        .warm-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.72);
          background: rgba(255, 255, 255, 0.82);
          padding: 0.95rem 1rem;
          color: #020617;
          outline: none;
          transition: 0.2s ease;
          color-scheme: light;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62);
        }

        .warm-input:focus {
          border-color: rgba(251, 146, 60, 0.55);
          box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.72);
          background: rgba(255, 255, 255, 0.94);
        }

        .warm-input::placeholder {
          color: rgba(15, 23, 42, 0.45);
        }

        .warm-input option {
          background: #ffffff;
          color: #020617;
        }

        .warm-input::-webkit-datetime-edit,
        .warm-input::-webkit-datetime-edit-fields-wrapper,
        .warm-input::-webkit-datetime-edit-text,
        .warm-input::-webkit-datetime-edit-month-field,
        .warm-input::-webkit-datetime-edit-day-field,
        .warm-input::-webkit-datetime-edit-year-field,
        .warm-input::-webkit-datetime-edit-hour-field,
        .warm-input::-webkit-datetime-edit-minute-field,
        .warm-input::-webkit-datetime-edit-ampm-field {
          color: #020617;
        }

        .warm-input::-webkit-calendar-picker-indicator {
          filter: none;
          opacity: 0.58;
          cursor: pointer;
        }

        .abwesenheiten-v12 .v12-hero .text-slate-950,
        .abwesenheiten-v12 .v12-hero .text-slate-600,
        .abwesenheiten-v12 .v12-hero .text-slate-500 {
          color: rgba(255, 255, 255, 0.72) !important;
        }

        .abwesenheiten-v12 .v12-hero h1 {
          color: #ffffff !important;
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
      ? "text-green-600"
      : highlight === "red"
      ? "text-red-600"
      : highlight === "blue"
      ? "text-orange-700"
      : "text-slate-950";

  return (
    <div className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-50/80 hover:shadow-lg hover:shadow-orange-900/10">
      <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-center transition hover:border-orange-200/40 hover:bg-orange-300/10">
      <div
        className={`text-xl font-black leading-tight md:text-2xl ${
          red
            ? "text-red-300"
            : green
              ? "text-green-300"
              : blue
                ? "text-orange-200"
                : "text-white"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/50">{label}</div>
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
      <label className="mb-2 block text-sm font-black text-slate-600">{label}</label>
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
    <div className="rounded-2xl border border-white/70 bg-white/60 p-5 transition hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-50/80 hover:shadow-lg hover:shadow-orange-900/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${typFarbe(
              eintrag.typ
            )}`}
          >
            {eintrag.typ || "Urlaub"}
          </span>

          <p className="mt-4 text-lg font-black text-slate-950">
            {eintragZeitraum(eintrag)}
          </p>

          <p className="mt-1 text-sm text-slate-500">
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
          className="mt-5 w-full rounded-xl border border-red-950/30 bg-red-950/10 px-4 py-3 font-bold text-red-800 transition hover:bg-red-950/15"
        >
          Löschen
        </button>
      ) : (
        <div className="mt-5 rounded-xl border border-white/70 bg-white/50 px-4 py-3 text-center text-sm font-bold text-slate-400">
          Verlauf bleibt gespeichert
        </div>
      )}
    </div>
  );
}

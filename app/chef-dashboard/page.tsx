"use client";

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { istFeiertagSG } from "../../lib/feiertage";

export default function ChefDashboardPage() {
  const [mitarbeiter, setMitarbeiter] = useState<any[]>([]);
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [urlaub, setUrlaub] = useState<any[]>([]);
  const [projekte, setProjekte] = useState<any[]>([]);
  const [tagespausen, setTagespausen] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [zugriffGeprueft, setZugriffGeprueft] = useState(false);
  const [istAdmin, setIstAdmin] = useState(false);
  const [meldung, setMeldung] = useState("");
  const [tageszeiten, setTageszeiten] = useState<any[]>([]);
  const [gepruefteOffen, setGepruefteOffen] = useState(false);
  const [adminName, setAdminName] = useState("Chef");
const [freigabeSeite, setFreigabeSeite] = useState(1);
  const [projektKunde, setProjektKunde] = useState("");
  const [projektKommission, setProjektKommission] = useState("");
  const [projektName, setProjektName] = useState("");
  const [projektStatus, setProjektStatus] = useState("Aktiv");
  const [projektBereiche, setProjektBereiche] = useState<string[]>([
    "Werkstatt",
    "Montage",
  ]);
  const [projektBearbeitenId, setProjektBearbeitenId] = useState<string | number | null>(null);
  const [projektBereichMap, setProjektBereichMap] = useState<Record<string, string[]>>({});

  const [verwaltungsModus, setVerwaltungsModus] = useState<"projekt" | "mitarbeiter" | "termine">("projekt");
  const [abwesenheitOffen, setAbwesenheitOffen] = useState(false);
  const [auswertungOffen, setAuswertungOffen] = useState(false);
  const [teamKennzahlenOffen, setTeamKennzahlenOffen] = useState(false);
  const [teamStatusOffen, setTeamStatusOffen] = useState(false);
  const [teamPerformanceOffen, setTeamPerformanceOffen] = useState(false);
  const [projektUebersichtOffen, setProjektUebersichtOffen] = useState(false);
  const [teamDetailsOffenId, setTeamDetailsOffenId] = useState<string | number | null>(null);
  const [mitarbeiterName, setMitarbeiterName] = useState("");
  const [mitarbeiterEmail, setMitarbeiterEmail] = useState("");
  const [mitarbeiterPasswort, setMitarbeiterPasswort] = useState("");
  const [mitarbeiterRolle, setMitarbeiterRolle] = useState("Mitarbeiter");
  const [mitarbeiterWochenstunden, setMitarbeiterWochenstunden] = useState("42.5");
  const [mitarbeiterFerienwochen, setMitarbeiterFerienwochen] = useState("5");
  const [mitarbeiterUrlaubstage, setMitarbeiterUrlaubstage] = useState("25");
  const [mitarbeiterVertragsart, setMitarbeiterVertragsart] = useState("Festangestellt");
  const [mitarbeiterBearbeitenId, setMitarbeiterBearbeitenId] = useState<string | number | null>(null);
  const [mitarbeiterUeberstundenStart, setMitarbeiterUeberstundenStart] = useState("0");
  const [mitarbeiterEintrittsdatum, setMitarbeiterEintrittsdatum] = useState("");
  const [mitarbeiterProbezeitBis, setMitarbeiterProbezeitBis] = useState("");
  const [mitarbeiterAustrittsdatum, setMitarbeiterAustrittsdatum] = useState("");
  const [mitarbeiterZeiterfassungAb, setMitarbeiterZeiterfassungAb] = useState("");
  const [mitarbeiterArbeitsmodell, setMitarbeiterArbeitsmodell] = useState("100");
  const [mitarbeiterPensumProzent, setMitarbeiterPensumProzent] = useState("100");
  const [mitarbeiterArbeitstageProWoche, setMitarbeiterArbeitstageProWoche] = useState("5");
  const [mitarbeiterFreierWochentag, setMitarbeiterFreierWochentag] = useState("");

const monat = new Date().toISOString().slice(0, 7);

  const heute = new Date();

  const aktuellerMonat =
    heute.getFullYear() === Number(monat.slice(0, 4)) &&
    heute.getMonth() + 1 === Number(monat.slice(5, 7));

  const standardBereiche = [
    "Werkstatt",
    "Montage",
    "Logistik",
    "Planung",
    "Lieferung",
    "Aufräumen",
    "Sonstiges",
  ];

  function projektTitel(projekt: any) {
    return (
      projekt?.name ||
      projekt?.projektname ||
      projekt?.projekt_name ||
      "Ohne Projekt"
    );
  }

  function bereicheNormalisieren(wert: any): string[] {
    if (Array.isArray(wert)) {
      return wert.map((eintrag) => String(eintrag || "").trim()).filter(Boolean);
    }

    if (typeof wert === "string") {
      const sauber = wert.trim();
      if (!sauber) return [];

      try {
        const parsed = JSON.parse(sauber);
        if (Array.isArray(parsed)) {
          return parsed.map((eintrag) => String(eintrag || "").trim()).filter(Boolean);
        }
      } catch {
        // Normale Textspalte: Werkstatt, Montage, Logistik
      }

      return sauber
        .split(",")
        .map((eintrag) => eintrag.trim())
        .filter(Boolean);
    }

    return [];
  }

  function bereicheEinzigartig(bereiche: string[]) {
    return Array.from(
      new Set(
        bereiche
          .map((bereich) => String(bereich || "").trim())
          .filter(Boolean)
      )
    );
  }

  function projektBereicheAuslesen(projekt: any) {
    const projektId = projekt?.id ? String(projekt.id) : "";
    const ausBereichTabelle = projektId ? projektBereichMap[projektId] || [] : [];

    if (ausBereichTabelle.length > 0) return ausBereichTabelle;

    const erlaubteBereiche = bereicheNormalisieren(projekt?.erlaubte_bereiche);
    if (erlaubteBereiche.length > 0) return erlaubteBereiche;

    const bereiche = bereicheNormalisieren(projekt?.bereiche);
    if (bereiche.length > 0) return bereiche;

    return ["Werkstatt", "Montage"];
  }

  function formatDatumInput(wert?: string | null) {
    if (!wert) return "";
    return String(wert).slice(0, 10);
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

  const wochentagNamen = [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ];

  function arbeitsmodellSetzen(modell: string) {
    setMitarbeiterArbeitsmodell(modell);

    if (modell === "100") {
      setMitarbeiterPensumProzent("100");
      setMitarbeiterWochenstunden("42.5");
      setMitarbeiterArbeitstageProWoche("5");
      setMitarbeiterFreierWochentag("");
      return;
    }

    if (modell === "80") {
      setMitarbeiterPensumProzent("80");
      setMitarbeiterWochenstunden("34");
      setMitarbeiterArbeitstageProWoche("4");
      setMitarbeiterFreierWochentag((aktuell) => aktuell || "Freitag");
      return;
    }

    setMitarbeiterPensumProzent("");
  }

  function arbeitsmodellAusPerson(person: any) {
    const wochenstunden = Number(person?.wochenstunden || 0);
    const arbeitstage = Number(
      person?.arbeitstage_pro_woche || (wochenstunden === 34 ? 4 : 5)
    );
    const pensum = Number(
      person?.pensum_prozent || (wochenstunden === 34 && arbeitstage === 4 ? 80 : 100)
    );

    if (pensum === 100 && wochenstunden === 42.5 && arbeitstage === 5) return "100";
    if (pensum === 80 && wochenstunden === 34 && arbeitstage === 4) return "80";

    return "manuell";
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

  function istFreierWochentag(datum: Date, freierWochentag?: string | null) {
    const freierTag = String(freierWochentag || "").trim();
    if (!freierTag) return false;

    return wochentagNamen[datum.getDay()] === freierTag;
  }

  useEffect(() => {
    async function ladeDaten() {
      setMeldung("");

      const userData = await supabase.auth.getUser();
      const user = userData.data.user;

      if (!user) {
        setIstAdmin(false);
        setZugriffGeprueft(true);
        setLoading(false);
        window.location.href = "/login";
        return;
      }

      const { data: adminCheck, error: adminError } = await supabase
        .from("mitarbeiter")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (adminError) {
        setIstAdmin(false);
        setZugriffGeprueft(true);
        setMeldung(adminError.message);
        setLoading(false);
        return;
      }

      const aktuelleRolle = String(adminCheck?.rolle || "").trim().toLowerCase();

      if (aktuelleRolle !== "admin") {
        setIstAdmin(false);
        setZugriffGeprueft(true);
        setLoading(false);
        window.location.href = "/";
        return;
      }

      setIstAdmin(true);
      setZugriffGeprueft(true);
      setAdminName(adminCheck?.name || "Chef");

      const start = `${monat}-01`;

      const heuteString = new Date().toISOString().split("T")[0];

      const ende = aktuellerMonat
        ? heuteString
        : new Date(
            Number(monat.slice(0, 4)),
            Number(monat.slice(5, 7)),
            0
          )
            .toISOString()
            .split("T")[0];

      const { data: mitarbeiterData, error: mitarbeiterError } =
        await supabase
          .from("mitarbeiter")
          .select("*")
          .order("id", { ascending: false });

      const { data: arbeitszeitenData, error: arbeitszeitenError } =
        await supabase
          .from("arbeitszeiten")
          .select("*")
          .gte("datum", start)
          .lte("datum", ende);

          const { data: tagespausenData, error: tagespausenError } =
  await supabase
    .from("tagespausen")
    .select("*")
    .gte("datum", start)
    .lte("datum", ende);

    const { data: tageszeitenData, error: tageszeitenError } =
  await supabase
    .from("tageszeiten")
    .select("*")
    .gte("datum", start)
    .lte("datum", ende);

      const { data: urlaubData, error: urlaubError } = await supabase
        .from("urlaub")
        .select("*")
        .gte("von", start)
        .lte("bis", ende);

      const { data: projekteData, error: projekteError } = await supabase
        .from("projekte")
        .select("*");

      const { data: projektBereicheData, error: projektBereicheError } = await supabase
        .from("projekt_bereiche")
        .select("projekt_id, bereich");

      if (projektBereicheError) {
        console.log("PROJEKT BEREICHE LADEN FEHLER:", projektBereicheError);
      }

      const neueProjektBereichMap: Record<string, string[]> = {};

      (projektBereicheData || []).forEach((eintrag: any) => {
        const key = String(eintrag.projekt_id || "");
        const bereich = String(eintrag.bereich || "").trim();

        if (!key || !bereich) return;

        if (!neueProjektBereichMap[key]) neueProjektBereichMap[key] = [];
        if (!neueProjektBereichMap[key].includes(bereich)) {
          neueProjektBereichMap[key].push(bereich);
        }
      });

      const fehler =
  mitarbeiterError ||
  arbeitszeitenError ||
  tagespausenError ||
  tageszeitenError ||
  urlaubError ||
  projekteError;

      if (fehler) {
        setMeldung(fehler.message);
        console.log(fehler);
      }

      setMitarbeiter(mitarbeiterData || []);
      setArbeitszeiten(arbeitszeitenData || []);
      setTagespausen(tagespausenData || []);
      setTageszeiten(tageszeitenData || []);
      setUrlaub(urlaubData || []);
      setProjekte(projekteData || []);
      setProjektBereichMap(neueProjektBereichMap);
      setLoading(false);
    }

    ladeDaten();
  }, [monat, aktuellerMonat]);

  function parseDatumLokal(wert?: string | null) {
    if (!wert) return null;

    const [jahr, monatWert, tag] = String(wert)
      .slice(0, 10)
      .split("-")
      .map(Number);

    if (!jahr || !monatWert || !tag) return null;

    return new Date(jahr, monatWert - 1, tag);
  }

  function berechneArbeitstageAbDatum(startDatum?: string | null, freierWochentag?: string | null) {
    const jahr = Number(monat.slice(0, 4));
    const monatNummer = Number(monat.slice(5, 7));

    const tageImMonat = aktuellerMonat
      ? heute.getDate()
      : new Date(jahr, monatNummer, 0).getDate();

    let arbeitstage = 0;
    const start = parseDatumLokal(startDatum);

    for (let tag = 1; tag <= tageImMonat; tag++) {
      const datum = new Date(jahr, monatNummer - 1, tag);

      if (start && datum < start) continue;

      const wochentag = datum.getDay();
      const istWochenende = wochentag === 0 || wochentag === 6;
      const istFeiertag = istFeiertagSG(datum);
      const istFreierTag = istFreierWochentag(datum, freierWochentag);

      if (!istWochenende && !istFeiertag && !istFreierTag) arbeitstage++;
    }

    return arbeitstage;
  }

  const arbeitstage = berechneArbeitstageAbDatum();

  const offeneTage = tageszeiten.filter(
  (t) => t.status === "Offen"
).length;

const abgeschlosseneTage = tageszeiten.filter(
  (t) => t.status === "Abgeschlossen"
).length;

const gepruefteTage = tageszeiten.filter(
  (t) => t.status === "Geprüft"
).length;

  const offeneAntraege = urlaub.filter(
    (eintrag) => eintrag.status === "Beantragt"
  ).length;

  const kranktage = urlaub
    .filter((eintrag) => eintrag.typ === "Krank")
    .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

  const urlaubstage = urlaub
    .filter((eintrag) => eintrag.typ === "Urlaub")
    .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

  const ueberstundenabbauTage = urlaub
    .filter(
      (eintrag) =>
        eintrag.typ === "Überstundenabbau" &&
        eintrag.status === "Genehmigt"
    )
    .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

  const projektStunden = projekte.map((projekt) => {
    const name = projektTitel(projekt);
    const stunden = arbeitszeiten
      .filter((zeit) => zeit.projekt === name)
      .reduce((sum, zeit) => sum + Number(zeit.stunden || 0), 0);

    return {
      ...projekt,
      id: projekt.id,
      name,
      kunde: projekt.kunde,
      kommission: projekt.kommission,
      status: projekt.status || "Aktiv",
      erlaubte_bereiche: projektBereicheAuslesen(projekt),
      stunden,
    };
  });

  const mitarbeiterStats = mitarbeiter.map((person) => {
    const berechnungAb =
      person.zeiterfassung_ab || person.eintrittsdatum || null;

    const personArbeitszeiten = arbeitszeiten.filter(
      (eintrag) =>
        eintrag.user_id === person.user_id &&
        (!berechnungAb || !eintrag.datum || eintrag.datum >= berechnungAb)
    );

    const personUrlaub = urlaub.filter(
      (eintrag) =>
        eintrag.user_id === person.user_id &&
        (!berechnungAb || !eintrag.bis || eintrag.bis >= berechnungAb)
    );

    const personTageszeiten = tageszeiten
      .filter(
        (tag) =>
          tag.user_id === person.user_id &&
          tag.status !== "Offen" &&
          (!berechnungAb || !tag.datum || tag.datum >= berechnungAb)
      )
      .sort((a, b) => String(b.datum || "").localeCompare(String(a.datum || "")));

    // Echte Mitarbeiter-Istzeit kommt aus dem Tagesabschluss.
    // arbeitszeiten ist nur die Projektverteilung inklusive Betriebsunterhalt.
    const iststunden = personTageszeiten.reduce(
      (sum, tag) => sum + Number(tag.netto_stunden || 0),
      0
    );

    const projektStundenGebucht = personArbeitszeiten.reduce(
      (sum, eintrag) => sum + Number(eintrag.stunden || 0),
      0
    );

    const betriebsunterhaltStunden = personArbeitszeiten
      .filter((eintrag) => String(eintrag.projekt || "") === "Betriebsunterhalt" || eintrag.auto_generiert)
      .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0);

    const projektStundenOhneBetriebsunterhalt = Math.max(
      0,
      projektStundenGebucht - betriebsunterhaltStunden
    );

    const projektSummenMap = personArbeitszeiten.reduce((map: Record<string, number>, eintrag) => {
      const projektName = String(eintrag.projekt || "Ohne Projekt").trim() || "Ohne Projekt";
      map[projektName] = (map[projektName] || 0) + Number(eintrag.stunden || 0);
      return map;
    }, {});

    const projektSummen = Object.entries(projektSummenMap)
      .map(([projektName, stunden]) => ({ projektName, stunden: Number(stunden || 0) }))
      .filter((eintrag) => eintrag.stunden > 0)
      .sort((a, b) => b.stunden - a.stunden);

    const tagesliste = personTageszeiten.map((tag) => {
      const tagArbeitszeiten = personArbeitszeiten.filter(
        (eintrag) => eintrag.datum === tag.datum
      );

      const projektStundenTag = tagArbeitszeiten
        .filter((eintrag) => String(eintrag.projekt || "") !== "Betriebsunterhalt" && !eintrag.auto_generiert)
        .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0);

      const betriebsunterhaltTag = tagArbeitszeiten
        .filter((eintrag) => String(eintrag.projekt || "") === "Betriebsunterhalt" || eintrag.auto_generiert)
        .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0);

      return {
        ...tag,
        projektStundenTag,
        betriebsunterhaltTag,
        buchungen: tagArbeitszeiten.length,
      };
    });

    const urlaubstagePerson = personUrlaub
      .filter(
        (eintrag) =>
          eintrag.typ === "Urlaub" && eintrag.status === "Genehmigt"
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const kranktagePerson = personUrlaub
      .filter((eintrag) => eintrag.typ === "Krank")
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const ueberstundenAbbauStunden = personUrlaub
      .filter(
        (eintrag) =>
          eintrag.typ === "Überstundenabbau" &&
          eintrag.status === "Genehmigt"
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0);

    const arbeitstageProWoche = normalisiereArbeitstageProWoche(person);
    const freierWochentag = normalisiereFreierWochentag(person);
    const tagesSoll = Number(person.wochenstunden || 0) / arbeitstageProWoche;

    const personArbeitstage = berechneArbeitstageAbDatum(
      berechnungAb || undefined,
      freierWochentag
    );

    const sollstunden = tagesSoll * personArbeitstage;
    const urlaubStunden = urlaubstagePerson * tagesSoll;
    const krankStunden = kranktagePerson * tagesSoll;
    const angerechneteStunden =
      iststunden + urlaubStunden + krankStunden;

    const differenz =
      angerechneteStunden - sollstunden - ueberstundenAbbauStunden;
      const startwert = Number(person.ueberstunden_start || 0);

const gesamtUeberstunden =
  startwert + differenz;

   return {
  ...person,
  iststunden,
  projektStundenGebucht,
  projektStundenOhneBetriebsunterhalt,
  betriebsunterhaltStunden,
  projektSummen,
  tagesliste,
  sollstunden,
  angerechneteStunden,
  differenz,
  gesamtUeberstunden,
  urlaubstagePerson,
  kranktagePerson,
  ueberstundenAbbauStunden,
  personArbeitstage,
  arbeitstageProWoche,
  freierWochentag,
  berechnungAb,
};

  });

  const teamSollstunden = mitarbeiterStats.reduce(
    (sum, person) => sum + person.sollstunden,
    0
  );

  const teamIststunden = mitarbeiterStats.reduce(
    (sum, person) => sum + person.iststunden,
    0
  );

  const teamAngerechnet = mitarbeiterStats.reduce(
    (sum, person) => sum + person.angerechneteStunden,
    0
  );

  const teamUeberstundenAbbauStunden = mitarbeiterStats.reduce(
    (sum, person) => sum + person.ueberstundenAbbauStunden,
    0
  );

  const teamDifferenz = mitarbeiterStats.reduce(
  (sum, person) => sum + Number(person.gesamtUeberstunden || 0),
  0
);

function toggleProjektBereich(bereich: string) {
  setProjektBereiche((aktuell) =>
    aktuell.includes(bereich)
      ? aktuell.filter((eintrag) => eintrag !== bereich)
      : [...aktuell, bereich]
  );
}

function projektFormZuruecksetzen() {
  setProjektBearbeitenId(null);
  setProjektKunde("");
  setProjektKommission("");
  setProjektName("");
  setProjektStatus("Aktiv");
  setProjektBereiche(["Werkstatt", "Montage"]);
}

function projektZumBearbeitenLaden(projekt: any) {
  setVerwaltungsModus("projekt");
  setProjektBearbeitenId(projekt.id);
  setProjektKunde(projekt.kunde || "");
  setProjektKommission(projekt.kommission || "");
  setProjektName(projektTitel(projekt));
  setProjektStatus(projekt.status || "Aktiv");
  setProjektBereiche(projektBereicheAuslesen(projekt));
  setMeldung("Projekt ist im Bearbeitungsmodus. Formular oben prüfen und speichern.");

  window.setTimeout(() => {
    document
      .getElementById("kommandozentrale")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
}

async function projektBereicheSynchronisieren(
  projektIdWert: string | number | null | undefined,
  bereicheWert: string[]
) {
  const projektIdNummer = Number(projektIdWert);
  const bereicheSauber = bereicheEinzigartig(bereicheWert);

  if (!Number.isFinite(projektIdNummer) || !projektIdNummer) {
    return { error: { message: "Projekt-ID für Bereichsspeicherung fehlt." } };
  }

  const { error: deleteError } = await supabase
    .from("projekt_bereiche")
    .delete()
    .eq("projekt_id", projektIdNummer);

  if (deleteError) {
    console.log("PROJEKT BEREICHE DELETE FEHLER:", deleteError);
    return { error: deleteError };
  }

  if (bereicheSauber.length === 0) return { error: null };

  const neueBereiche = bereicheSauber.map((bereich) => ({
    projekt_id: projektIdNummer,
    bereich,
  }));

  const { error: insertError } = await supabase
    .from("projekt_bereiche")
    .insert(neueBereiche);

  if (insertError) {
    console.log("PROJEKT BEREICHE INSERT FEHLER:", insertError);
    return { error: insertError };
  }

  return { error: null };
}

async function projektSpeichern() {
  setMeldung("");

  if (!istAdmin) {
    setMeldung("Kein Zugriff auf den Chefbereich.");
    return;
  }

  if (!projektName.trim()) {
    setMeldung("Bitte Projektname eintragen.");
    return;
  }

  const kunde = projektKunde.trim() || "Intern";
  const kommission = projektKommission.trim() || null;
  const name = projektName.trim();

  const payloadVarianten: any[] = [
    {
      kunde,
      kommission,
      name,
      status: projektStatus,
      erlaubte_bereiche: projektBereiche,
    },
    {
      kunde,
      kommission,
      name,
      status: projektStatus,
      bereiche: projektBereiche,
    },
    {
      kunde,
      kommission,
      name,
      status: projektStatus,
    },
    {
      kunde,
      kommission,
      projektname: name,
      status: projektStatus,
      erlaubte_bereiche: projektBereiche,
    },
    {
      kunde,
      kommission,
      projektname: name,
      status: projektStatus,
      bereiche: projektBereiche,
    },
    {
      kunde,
      kommission,
      projektname: name,
      status: projektStatus,
    },
  ];

  let data: any = null;
  let letzterFehler: any = null;

  for (const payload of payloadVarianten) {
    const query = projektBearbeitenId
      ? supabase
          .from("projekte")
          .update(payload)
          .eq("id", projektBearbeitenId)
          .select()
          .single()
      : supabase.from("projekte").insert(payload).select().single();

    const result = await query;

    if (!result.error) {
      data = result.data;
      letzterFehler = null;
      break;
    }

    letzterFehler = result.error;
  }

  if (letzterFehler) {
    setMeldung(letzterFehler.message || "Projekt konnte nicht gespeichert werden.");
    console.log(letzterFehler);
    return;
  }

  const projektIdZumSync = data?.id || projektBearbeitenId;
  const bereicheSauber = bereicheEinzigartig(projektBereiche);

  const { error: bereicheSyncError } = await projektBereicheSynchronisieren(
    projektIdZumSync,
    bereicheSauber
  );

  if (bereicheSyncError) {
    setMeldung(
      `Projekt wurde gespeichert, aber die Bereichsauswahl konnte nicht gespeichert werden: ${bereicheSyncError.message}`
    );
    return;
  }

  if (projektIdZumSync) {
    const key = String(projektIdZumSync);
    setProjektBereichMap((aktuell) => ({
      ...aktuell,
      [key]: bereicheSauber,
    }));
  }

  if (data) {
    const projektMitBereichen = {
      ...data,
      erlaubte_bereiche: bereicheSauber,
      bereiche: bereicheSauber,
    };

    setProjekte((aktuell) =>
      projektBearbeitenId
        ? aktuell.map((projekt) =>
            String(projekt.id) === String(projektBearbeitenId) ? projektMitBereichen : projekt
          )
        : [projektMitBereichen, ...aktuell]
    );
  }

  projektFormZuruecksetzen();
  setMeldung(projektBearbeitenId ? "Projekt wurde aktualisiert." : "Projekt wurde erstellt.");
}

async function projektLoeschen(projekt: any) {
  setMeldung("");

  if (!istAdmin) {
    setMeldung("Kein Zugriff auf den Chefbereich.");
    return;
  }

  if (!projekt?.id) {
    setMeldung("Projekt konnte nicht gefunden werden.");
    return;
  }

  const name = projektTitel(projekt);

  if (name.toLowerCase() === "betriebsunterhalt") {
    setMeldung("Betriebsunterhalt ist ein internes Systemprojekt und darf nicht gelöscht werden.");
    return;
  }

  const bestaetigt = window.confirm(
    `Projekt "${name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
  );

  if (!bestaetigt) return;

  const { error: bereicheDeleteError } = await supabase
    .from("projekt_bereiche")
    .delete()
    .eq("projekt_id", projekt.id);

  if (bereicheDeleteError) {
    console.log("PROJEKT BEREICHE DELETE FEHLER:", bereicheDeleteError);
    setMeldung(bereicheDeleteError.message || "Projektbereiche konnten nicht gelöscht werden.");
    return;
  }

  const { error } = await supabase
    .from("projekte")
    .delete()
    .eq("id", projekt.id);

  if (error) {
    setMeldung(error.message || "Projekt konnte nicht gelöscht werden.");
    console.log(error);
    return;
  }

  setProjekte((aktuell) => aktuell.filter((eintrag) => eintrag.id !== projekt.id));
  setProjektBereichMap((aktuell) => {
    const next = { ...aktuell };
    delete next[String(projekt.id)];
    return next;
  });

  if (projektBearbeitenId === projekt.id) {
    projektFormZuruecksetzen();
  }

  setMeldung("Projekt wurde gelöscht.");
}

function mitarbeiterFormZuruecksetzen() {
  setMitarbeiterBearbeitenId(null);
  setMitarbeiterName("");
  setMitarbeiterEmail("");
  setMitarbeiterPasswort("");
  setMitarbeiterRolle("Mitarbeiter");
  setMitarbeiterWochenstunden("42.5");
  setMitarbeiterFerienwochen("5");
  setMitarbeiterUrlaubstage("25");
  setMitarbeiterVertragsart("Festangestellt");
  setMitarbeiterUeberstundenStart("0");
  setMitarbeiterEintrittsdatum("");
  setMitarbeiterProbezeitBis("");
  setMitarbeiterAustrittsdatum("");
  setMitarbeiterZeiterfassungAb("");
  setMitarbeiterArbeitsmodell("100");
  setMitarbeiterPensumProzent("100");
  setMitarbeiterArbeitstageProWoche("5");
  setMitarbeiterFreierWochentag("");
}

function mitarbeiterZumBearbeitenLaden(person: any) {
  setVerwaltungsModus("mitarbeiter");
  setMitarbeiterBearbeitenId(person.id);
  setMitarbeiterName(person.name || "");
  setMitarbeiterEmail(person.email || "");
  setMitarbeiterPasswort("");
  setMitarbeiterRolle(person.rolle || "Mitarbeiter");
  setMitarbeiterWochenstunden(String(person.wochenstunden ?? "42.5"));
  setMitarbeiterFerienwochen(String(person.ferienwochen ?? "5"));
  setMitarbeiterUrlaubstage(String(person.urlaubstage ?? "25"));
  setMitarbeiterVertragsart(person.vertragsart || "Festangestellt");
  setMitarbeiterUeberstundenStart(String(person.ueberstunden_start ?? "0"));
  setMitarbeiterEintrittsdatum(formatDatumInput(person.eintrittsdatum));
  setMitarbeiterProbezeitBis(formatDatumInput(person.probezeit_bis));
  setMitarbeiterAustrittsdatum(formatDatumInput(person.austrittsdatum));
  setMitarbeiterZeiterfassungAb(formatDatumInput(person.zeiterfassung_ab));

  const arbeitstageProWoche = normalisiereArbeitstageProWoche(person);
  const pensumProzent = Number(
    person.pensum_prozent || (Number(person.wochenstunden || 0) === 34 ? 80 : 100)
  );

  setMitarbeiterArbeitsmodell(arbeitsmodellAusPerson(person));
  setMitarbeiterPensumProzent(String(pensumProzent));
  setMitarbeiterArbeitstageProWoche(String(arbeitstageProWoche));
  setMitarbeiterFreierWochentag(normalisiereFreierWochentag(person));
  setMeldung("Mitarbeiter ist im Bearbeitungsmodus.");
}

async function mitarbeiterSpeichern() {
  setMeldung("");

  if (!istAdmin) {
    setMeldung("Kein Zugriff auf den Chefbereich.");
    return;
  }

  if (!mitarbeiterName.trim()) {
    setMeldung("Bitte Mitarbeiternamen eintragen.");
    return;
  }

  if (mitarbeiterBearbeitenId) {
    const payload = {
      name: mitarbeiterName.trim(),
      rolle: mitarbeiterRolle,
      wochenstunden: Number(mitarbeiterWochenstunden || 0),
      pensum_prozent: Number(mitarbeiterPensumProzent || 0) || null,
      arbeitstage_pro_woche: Number(mitarbeiterArbeitstageProWoche || 0) || 5,
      freier_wochentag: Number(mitarbeiterArbeitstageProWoche || 0) === 4 ? mitarbeiterFreierWochentag || "Freitag" : null,
      ferienwochen: Number(mitarbeiterFerienwochen || 0),
      urlaubstage: Number(mitarbeiterUrlaubstage || 0),
      vertragsart: mitarbeiterVertragsart,
      ueberstunden_start: Number(mitarbeiterUeberstundenStart || 0),
      eintrittsdatum: mitarbeiterEintrittsdatum || null,
      probezeit_bis: mitarbeiterProbezeitBis || null,
      austrittsdatum: mitarbeiterAustrittsdatum || null,
      zeiterfassung_ab: mitarbeiterZeiterfassungAb || null,
    };

    const { data, error } = await supabase
      .from("mitarbeiter")
      .update(payload)
      .eq("id", mitarbeiterBearbeitenId)
      .select()
      .single();

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    if (data) {
      setMitarbeiter((aktuell) =>
        aktuell.map((person) => (person.id === mitarbeiterBearbeitenId ? data : person))
      );
    }

    mitarbeiterFormZuruecksetzen();
    setMeldung("Mitarbeiter wurde aktualisiert.");
    return;
  }

  if (!mitarbeiterEmail.trim()) {
    setMeldung("Bitte E-Mail eintragen.");
    return;
  }

  if (!mitarbeiterPasswort.trim() || mitarbeiterPasswort.length < 6) {
    setMeldung("Bitte ein Passwort mit mindestens 6 Zeichen eintragen.");
    return;
  }

  const payload = {
    name: mitarbeiterName.trim(),
    email: mitarbeiterEmail.trim(),
    password: mitarbeiterPasswort,
    passwort: mitarbeiterPasswort,
    rolle: mitarbeiterRolle,
    wochenstunden: Number(mitarbeiterWochenstunden || 0),
    pensum_prozent: Number(mitarbeiterPensumProzent || 0) || null,
    arbeitstage_pro_woche: Number(mitarbeiterArbeitstageProWoche || 0) || 5,
    freier_wochentag: Number(mitarbeiterArbeitstageProWoche || 0) === 4 ? mitarbeiterFreierWochentag || "Freitag" : null,
    ferienwochen: Number(mitarbeiterFerienwochen || 0),
    urlaubstage: Number(mitarbeiterUrlaubstage || 0),
    vertragsart: mitarbeiterVertragsart,
    ueberstunden_start: Number(mitarbeiterUeberstundenStart || 0),
    eintrittsdatum: mitarbeiterEintrittsdatum || null,
    probezeit_bis: mitarbeiterProbezeitBis || null,
    austrittsdatum: mitarbeiterAustrittsdatum || null,
    zeiterfassung_ab: mitarbeiterZeiterfassungAb || null,
  };

  const response = await fetch("/api/create-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    setMeldung(result?.error || result?.message || "Mitarbeiter konnte nicht erstellt werden.");
    return;
  }

  if (result?.mitarbeiter?.id) {
    const { error: modellError } = await supabase
      .from("mitarbeiter")
      .update({
        zeiterfassung_ab: mitarbeiterZeiterfassungAb || null,
        pensum_prozent: Number(mitarbeiterPensumProzent || 0) || null,
        arbeitstage_pro_woche: Number(mitarbeiterArbeitstageProWoche || 0) || 5,
        freier_wochentag:
          Number(mitarbeiterArbeitstageProWoche || 0) === 4
            ? mitarbeiterFreierWochentag || "Freitag"
            : null,
      })
      .eq("id", result.mitarbeiter.id);

    if (modellError) {
      setMeldung(
        `Mitarbeiter wurde erstellt, aber Arbeitsmodell/Zeiterfassung ab konnte nicht gespeichert werden: ${modellError.message}`
      );
      console.log(modellError);
      return;
    }
  }

  const { data: neueMitarbeiter } = await supabase
    .from("mitarbeiter")
    .select("*")
    .order("id", { ascending: false });

  setMitarbeiter(neueMitarbeiter || []);
  mitarbeiterFormZuruecksetzen();
  setMeldung("Mitarbeiter wurde erstellt.");
}

async function tagAlsGeprueftMarkieren(id: string) {
  setMeldung("");

  if (!istAdmin) {
    setMeldung("Kein Zugriff auf den Chefbereich.");
    return;
  }

  const userData = await supabase.auth.getUser();
const user = userData.data.user;

const { data: admin } = await supabase
  .from("mitarbeiter")
  .select("name")
  .eq("user_id", user?.id)
  .single();

  const { error } = await supabase
  .from("tageszeiten")
  .update({
    status: "Geprüft",
    geprueft_von: admin?.name || "Admin",
    geprueft_am: new Date().toISOString(),
  })
  .eq("id", id);

  if (error) {
    setMeldung(error.message);
    console.log(error);
    return;
  }

  setTageszeiten((aktuell) =>
    aktuell.map((tag) =>
      tag.id === id ? { ...tag, status: "Geprüft" } : tag
    )
  );

  setMeldung("Tag wurde als geprüft markiert.");
}

const abgeschlosseneTageListe = tageszeiten
  .filter((tag) => tag.status === "Abgeschlossen")
  .map((tag) => {
    const person = mitarbeiter.find(
      (m) => m.user_id === tag.user_id
    );

    return {
      ...tag,
      mitarbeiterName: person?.name || "Unbekannt",
    };
  });

function arbeitszeitenZurPruefung(tag: any) {
  return arbeitszeiten
    .filter(
      (zeit) =>
        zeit.user_id === tag.user_id &&
        zeit.datum === tag.datum
    )
    .sort((a, b) => {
      const aIstBetriebsunterhalt =
        String(a.projekt || "").trim().toLowerCase() === "betriebsunterhalt";
      const bIstBetriebsunterhalt =
        String(b.projekt || "").trim().toLowerCase() === "betriebsunterhalt";

      if (aIstBetriebsunterhalt !== bIstBetriebsunterhalt) {
        return aIstBetriebsunterhalt ? 1 : -1;
      }

      return String(a.startzeit || "").localeCompare(String(b.startzeit || ""));
    });
}

function zeitVonBisText(eintrag: any) {
  const start = String(eintrag.startzeit || "").slice(0, 5);
  const ende = String(eintrag.endzeit || "").slice(0, 5);

  if (start && ende) return `${start} - ${ende}`;
  if (start) return `ab ${start}`;
  if (ende) return `bis ${ende}`;

  return "ohne Von/Bis";
}

  const gepruefteTageListe = tageszeiten
  .filter((tag) => tag.status === "Geprüft")
  .map((tag) => {
    const person = mitarbeiter.find(
      (m) => m.user_id === tag.user_id
    );

    return {
      ...tag,
      mitarbeiterName: person?.name || "Unbekannt",
    };
  });

const letzteGepruefteTage = gepruefteTageListe.sort(
  (a, b) =>
    new Date(b.datum).getTime() -
    new Date(a.datum).getTime()
);

const eintraegeProSeite = 10;

const freigabeSeiten = Math.max(
  1,
  Math.ceil(letzteGepruefteTage.length / eintraegeProSeite)
);

const sichtbareFreigaben = letzteGepruefteTage.slice(
  (freigabeSeite - 1) * eintraegeProSeite,
  freigabeSeite * eintraegeProSeite
);

const topProjekte = projektStunden
  .filter((projekt) => Number(projekt.stunden || 0) > 0)
  .sort((a, b) => Number(b.stunden || 0) - Number(a.stunden || 0))
  .slice(0, 5);

const bereichSummen = arbeitszeiten.reduce((liste: Record<string, number>, eintrag) => {
  const bereich = eintrag.bereich || "Ohne Bereich";
  liste[bereich] = (liste[bereich] || 0) + Number(eintrag.stunden || 0);
  return liste;
}, {});

const topBereiche = Object.entries(bereichSummen)
  .map(([name, stunden]) => ({ name, stunden: Number(stunden || 0) }))
  .filter((bereich) => bereich.stunden > 0)
  .sort((a, b) => b.stunden - a.stunden)
  .slice(0, 5);

const aktiveProjekte = projekte.filter((projekt) => projekt.status === "Aktiv").length;
const pausierteProjekte = projekte.filter((projekt) => projekt.status === "Pausiert").length;
const abgeschlosseneProjekte = projekte.filter((projekt) => projekt.status === "Abgeschlossen").length;

const heutigesDatum = new Date().toLocaleDateString("de-CH", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const heuteKey = new Date().toISOString().split("T")[0];

const teamStatus = mitarbeiter.map((person) => {
  const tag = tageszeiten.find(
    (eintrag) =>
      eintrag.user_id === person.user_id &&
      eintrag.datum === heuteKey
  );

  if (!tag) {
    return {
      name: person.name,
      rolle: person.rolle,
      status: "Kein Eintrag",
      farbe: "text-red-400",
      punkt: "bg-red-400",
    };
  }

  if (tag.status === "Offen") {
    return {
      name: person.name,
      rolle: person.rolle,
      status: "Arbeitet",
      farbe: "text-green-400",
      punkt: "bg-green-400",
    };
  }

  if (tag.status === "Abgeschlossen") {
    return {
      name: person.name,
      rolle: person.rolle,
      status: "Zur Prüfung",
      farbe: "text-orange-800",
      punkt: "bg-slate-300",
    };
  }

  return {
    name: person.name,
    rolle: person.rolle,
    status: "Geprüft",
    farbe: "text-blue-300",
    punkt: "bg-blue-300",
  };
});

const systemStatus =
  offeneTage > 0 || abgeschlosseneTage > 0 || offeneAntraege > 0
    ? "Prüfung erforderlich"
    : "Alles im grünen Bereich";

function springeZu(id: string) {
  window.setTimeout(() => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 60);
}

  if (!zugriffGeprueft || loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-slate-950">
        <div className="rounded-3xl border border-white/70 bg-white/75 px-6 py-5 font-black shadow-[0_22px_60px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
          Zugriff wird geprüft...
        </div>
      </main>
    );
  }

  if (!istAdmin) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-slate-950">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-5 font-black text-red-300 shadow-2xl shadow-slate-900/10">
          Kein Zugriff auf den Chefbereich.
        </div>
      </main>
    );
  }

  return (
    <main className="chef-dashboard-v12 space-y-6 text-slate-950">
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
              ODZ V1.2 · Chef Dashboard
            </div>


            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              STAHLFABRIK
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/70 sm:text-base">
              Premium Betriebssystem für Zeit, Projekte, Team und Kontrolle.
            </p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-xl">
              <span className="h-3 w-3 rounded-full bg-green-400 shadow-lg shadow-green-400/40" />
              <span className="text-xs font-black uppercase tracking-widest text-white/70">
                {systemStatus}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-black/25 p-2 text-center backdrop-blur-xl sm:p-3 md:grid-cols-3">
            <HeroMini label="Offen" value={offeneTage} orange={offeneTage > 0} dark />
            <HeroMini label="Prüfung" value={abgeschlosseneTage} orange={abgeschlosseneTage > 0} dark />
            <HeroMini label="Geprüft" value={gepruefteTage} green={gepruefteTage > 0} dark />
          </div>
        </div>
      </section>

      <section className="overflow-x-auto rounded-[1.5rem] border border-white/60 bg-white/35 p-2 shadow-[0_14px_44px_rgba(15,23,42,0.06)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-2">
          <QuickDropdownButton
            eyebrow="Projekt"
            label="🏗️ Neu"
            onClick={() => {
              setVerwaltungsModus("projekt");
              springeZu("kommandozentrale");
            }}
          />

          <QuickDropdownButton
            eyebrow="Team"
            label="👤 Mitarbeiter"
            onClick={() => {
              setVerwaltungsModus("mitarbeiter");
              springeZu("kommandozentrale");
            }}
          />

          <QuickDropdownButton
            eyebrow="Kalender"
            label="🗓️ Termine"
            onClick={() => {
              setVerwaltungsModus("termine");
              springeZu("kommandozentrale");
            }}
          />

          <QuickDropdownButton
            eyebrow="Zeitkonto"
            label="📈 Team"
            onClick={() => {
              setTeamKennzahlenOffen(true);
              springeZu("team-kennzahlen");
            }}
          />

          <QuickDropdownButton
            eyebrow="Abwesenheit"
            label="📅 Urlaub"
            onClick={() => {
              setAbwesenheitOffen(true);
              springeZu("abwesenheit");
            }}
          />

          <QuickDropdownButton
            eyebrow="Auswertung"
            label="📊 Statistik"
            onClick={() => {
              setAuswertungOffen(true);
              springeZu("auswertung");
            }}
          />

          <QuickDropdownButton
            eyebrow="Projekte"
            label="▣ Übersicht"
            onClick={() => {
              setProjektUebersichtOffen(true);
              springeZu("projektuebersicht");
            }}
          />
        </div>
      </section>

      {meldung && (
        <div className="rounded-xl border border-orange-200/40 bg-orange-100/60 p-4 text-sm font-bold text-slate-950">
          {meldung}
        </div>
      )}

      <section
        id="kommandozentrale"
        className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-white/40 p-6 shadow-2xl shadow-slate-900/10 lg:p-7"
      >
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-orange-800">
              Kommandozentrale
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Verwaltung direkt im Chef Dashboard
            </h2>
            <p className="mt-1 text-slate-500">
              Projekte, Mitarbeiter und Termine werden zentral hier gesteuert. So bleibt der Chef im Dashboard.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <HeroMini label="Aktiv" value={aktiveProjekte} green={aktiveProjekte > 0} />
            <HeroMini label="Pausiert" value={pausierteProjekte} orange={pausierteProjekte > 0} />
            <HeroMini label="Archiv" value={abgeschlosseneProjekte} />
            <HeroMini label="Team" value={mitarbeiter.length} />
          </div>
        </div>

        <div className="mb-6">
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setVerwaltungsModus("projekt")}
              className={`rounded-2xl border px-5 py-4 font-black transition-all duration-300 hover:-translate-y-1 ${
                verwaltungsModus === "projekt"
                  ? "border-orange-300/50 bg-orange-100/60 text-slate-950 shadow-lg shadow-orange-900/10"
                  : "border-white/70 bg-white/50 text-slate-500 hover:border-orange-300/25 hover:bg-orange-300/5 hover:text-slate-950"
              }`}
            >
              🏗️ Projekt
            </button>

            <button
              type="button"
              onClick={() => setVerwaltungsModus("mitarbeiter")}
              className={`rounded-2xl border px-5 py-4 font-black transition-all duration-300 hover:-translate-y-1 ${
                verwaltungsModus === "mitarbeiter"
                  ? "border-orange-300/50 bg-orange-100/60 text-slate-950 shadow-lg shadow-orange-900/10"
                  : "border-white/70 bg-white/50 text-slate-500 hover:border-orange-300/25 hover:bg-orange-300/5 hover:text-orange-700"
              }`}
            >
              👤 Mitarbeiter
            </button>

            <button
              type="button"
              onClick={() => setVerwaltungsModus("termine")}
              className={`rounded-2xl border px-5 py-4 font-black transition-all duration-300 hover:-translate-y-1 ${
                verwaltungsModus === "termine"
                  ? "border-orange-300/50 bg-orange-100/60 text-slate-950 shadow-lg shadow-orange-900/10"
                  : "border-white/70 bg-white/50 text-slate-500 hover:border-orange-300/25 hover:bg-orange-300/5 hover:text-orange-700"
              }`}
            >
              🗓️ Termine
            </button>
          </div>
        </div>

        {verwaltungsModus === "projekt" ? (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              <label className="block">
                <span className="text-sm font-black text-slate-600">Kunde</span>
                <input
                  value={projektKunde}
                  onChange={(event) => setProjektKunde(event.target.value)}
                  placeholder="z.B. Firma"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300/50 focus:bg-white/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">Kommission</span>
                <input
                  value={projektKommission}
                  onChange={(event) => setProjektKommission(event.target.value)}
                  placeholder="z.B. Baustelle"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300/50 focus:bg-white/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">Projektname</span>
                <input
                  value={projektName}
                  onChange={(event) => setProjektName(event.target.value)}
                  placeholder="z.B. Geländer Müller"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300/50 focus:bg-white/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">Status</span>
                <select
                  value={projektStatus}
                  onChange={(event) => setProjektStatus(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/50 focus:bg-white/80"
                >
                  <option value="Aktiv">Aktiv</option>
                  <option value="Pausiert">Pausiert</option>
                  <option value="Abgeschlossen">Abgeschlossen</option>
                </select>
              </label>
            </div>

            <div className="mt-6 rounded-2xl border border-white/70 bg-white/50 p-5">
              <div className="text-lg font-black text-slate-950">Erlaubte Bereiche</div>
              <p className="mt-1 text-sm text-slate-500">
                Diese Bereiche erscheinen später in der Zeiterfassung für dieses Projekt.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
                {standardBereiche.map((bereich) => {
                  const aktiv = projektBereiche.includes(bereich);

                  return (
                    <button
                      key={bereich}
                      type="button"
                      onClick={() => toggleProjektBereich(bereich)}
                      className={`rounded-2xl border px-4 py-3 font-black transition-all duration-300 hover:-translate-y-1 ${
                        aktiv
                          ? "border-orange-300/50 bg-orange-100/60 text-slate-950 shadow-lg shadow-orange-900/10"
                          : "border-white/70 bg-white/50 text-slate-500 hover:border-orange-300/25 hover:bg-orange-300/5 hover:text-slate-950"
                      }`}
                    >
                      {aktiv ? "✓ " : ""}
                      {bereich}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                {projektBearbeitenId
                  ? "Bearbeitungsmodus aktiv. Änderungen werden direkt am bestehenden Projekt gespeichert."
                  : "Ziel: Chef bleibt im Dashboard. Keine doppelte Projektverwaltung mehr."}
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                {projektBearbeitenId && (
                  <button
                    type="button"
                    onClick={projektFormZuruecksetzen}
                    className="rounded-2xl border border-white/70 bg-stone-900/5 px-6 py-4 font-black text-slate-600 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:text-slate-950"
                  >
                    Abbrechen
                  </button>
                )}

                <button
                  type="button"
                  onClick={projektSpeichern}
                  className="rounded-2xl border border-orange-200/50 bg-orange-100/60 px-6 py-4 font-black text-slate-950 shadow-lg shadow-orange-900/10 transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/60 hover:bg-orange-100/80 hover:shadow-orange-900/10"
                >
                  {projektBearbeitenId ? "✓ Projekt aktualisieren" : "+ Projekt speichern"}
                </button>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-white/70 bg-white/50 p-5">
              <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <div className="text-lg font-black text-slate-950">Projekt auswählen</div>
                  <p className="mt-1 text-sm text-slate-500">
                    Nur noch Dropdown: Projekt wählen, Formular springt nach oben, anpassen und speichern.
                  </p>
                </div>

                <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                  {projekte.length} Projekte
                </div>
              </div>

              {projekte.length === 0 ? (
                <div className="rounded-xl border border-white/70 bg-white/50 p-4 text-slate-500">
                  Noch keine Projekte vorhanden.
                </div>
              ) : (
                <label className="block">
                  <span className="text-sm font-black text-slate-600">Projekt zum Bearbeiten wählen</span>
                  <select
                    value={projektBearbeitenId ? String(projektBearbeitenId) : ""}
                    onChange={(event) => {
                      const projekt = projekte.find(
                        (eintrag) => String(eintrag.id) === event.target.value
                      );

                      if (projekt) projektZumBearbeitenLaden(projekt);
                    }}
                    className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-black text-slate-950 outline-none transition focus:border-orange-300/40 focus:bg-white/80"
                  >
                    <option value="">Projekt auswählen</option>
                    {projekte.map((projekt) => (
                      <option key={projekt.id} value={String(projekt.id)}>
                        {projektTitel(projekt)} · {projekt.kunde || "Intern"} · {projekt.status || "Aktiv"}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {projektBearbeitenId && (
                <div className="mt-5 flex flex-col justify-between gap-3 rounded-2xl border border-orange-300/20 bg-orange-300/5 p-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="text-sm font-black text-orange-700">Bearbeitung aktiv</div>
                    <div className="mt-1 text-sm text-slate-500">
                      Das ausgewählte Projekt ist oben im Formular geladen.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const projekt = projekte.find(
                        (eintrag) => String(eintrag.id) === String(projektBearbeitenId)
                      );

                      if (projekt) projektLoeschen(projekt);
                    }}
                    className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 font-black text-red-200 transition hover:-translate-y-1 hover:border-red-300/40 hover:bg-red-500/20"
                  >
                    Projekt löschen
                  </button>
                </div>
              )}
            </div>
          </>
        ) : verwaltungsModus === "mitarbeiter" ? (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <label className="block">
                <span className="text-sm font-black text-slate-600">Name</span>
                <input
                  value={mitarbeiterName}
                  onChange={(event) => setMitarbeiterName(event.target.value)}
                  placeholder="z.B. Max Muster"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300/40 focus:bg-white/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">{mitarbeiterBearbeitenId ? "E-Mail nur bei neuem Login" : "E-Mail"}</span>
                <input
                  value={mitarbeiterEmail}
                  onChange={(event) => setMitarbeiterEmail(event.target.value)}
                  placeholder={mitarbeiterBearbeitenId ? "Bei Bearbeitung nicht nötig" : "max@firma.ch"}
                  type="email"
                  disabled={!!mitarbeiterBearbeitenId}
                  className={`mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300/40 focus:bg-white/80 ${mitarbeiterBearbeitenId ? "cursor-not-allowed opacity-50" : ""}`}
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">{mitarbeiterBearbeitenId ? "Passwort unverändert" : "Startpasswort"}</span>
                <input
                  value={mitarbeiterPasswort}
                  onChange={(event) => setMitarbeiterPasswort(event.target.value)}
                  placeholder={mitarbeiterBearbeitenId ? "Nur über Supabase Auth ändern" : "mind. 6 Zeichen"}
                  type="password"
                  disabled={!!mitarbeiterBearbeitenId}
                  className={`mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300/40 focus:bg-white/80 ${mitarbeiterBearbeitenId ? "cursor-not-allowed opacity-50" : ""}`}
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-6">
              <label className="block">
                <span className="text-sm font-black text-slate-600">Rolle</span>
                <select
                  value={mitarbeiterRolle}
                  onChange={(event) => setMitarbeiterRolle(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/40 focus:bg-white/80"
                >
                  <option value="Mitarbeiter">Mitarbeiter</option>
                  <option value="Admin">Admin</option>
                  <option value="Lehrling">Lehrling</option>
                  <option value="Temporär">Temporär</option>
                  <option value="Aushilfe">Aushilfe</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">Arbeitsmodell</span>
                <select
                  value={mitarbeiterArbeitsmodell}
                  onChange={(event) => arbeitsmodellSetzen(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/40 focus:bg-white/80"
                >
                  <option value="100">100% · 42.5h · 5 Tage</option>
                  <option value="80">80% · 34h · 4 Tage</option>
                  <option value="manuell">Manuell</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">Wochenstunden</span>
                <input
                  value={mitarbeiterWochenstunden}
                  onChange={(event) => {
                    setMitarbeiterWochenstunden(event.target.value);
                    setMitarbeiterArbeitsmodell("manuell");
                  }}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/40 focus:bg-white/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">Ferienwochen</span>
                <input
                  value={mitarbeiterFerienwochen}
                  onChange={(event) => setMitarbeiterFerienwochen(event.target.value)}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/40 focus:bg-white/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">Urlaubstage</span>
                <input
                  value={mitarbeiterUrlaubstage}
                  onChange={(event) => setMitarbeiterUrlaubstage(event.target.value)}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/40 focus:bg-white/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">Vertragsart</span>
                <select
                  value={mitarbeiterVertragsart}
                  onChange={(event) => setMitarbeiterVertragsart(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/40 focus:bg-white/80"
                >
                  <option value="Festangestellt">Festangestellt</option>
                  <option value="Befristet">Befristet</option>
                  <option value="Temporär">Temporär</option>
                  <option value="Aushilfe">Aushilfe</option>
                </select>
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
              <label className="block">
                <span className="text-sm font-black text-slate-600">Pensum %</span>
                <input
                  value={mitarbeiterPensumProzent}
                  onChange={(event) => {
                    setMitarbeiterPensumProzent(event.target.value);
                    setMitarbeiterArbeitsmodell("manuell");
                  }}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/40 focus:bg-white/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">Arbeitstage / Woche</span>
                <input
                  value={mitarbeiterArbeitstageProWoche}
                  onChange={(event) => {
                    setMitarbeiterArbeitstageProWoche(event.target.value);
                    setMitarbeiterArbeitsmodell("manuell");
                  }}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/40 focus:bg-white/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">Freier Wochentag</span>
                <select
                  value={mitarbeiterFreierWochentag}
                  onChange={(event) => setMitarbeiterFreierWochentag(event.target.value)}
                  disabled={Number(mitarbeiterArbeitstageProWoche || 0) !== 4}
                  className={`mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/40 focus:bg-white/80 ${Number(mitarbeiterArbeitstageProWoche || 0) !== 4 ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <option value="">Kein freier Tag</option>
                  <option value="Montag">Montag</option>
                  <option value="Dienstag">Dienstag</option>
                  <option value="Mittwoch">Mittwoch</option>
                  <option value="Donnerstag">Donnerstag</option>
                  <option value="Freitag">Freitag</option>
                </select>
                <p className="mt-2 text-xs font-bold text-slate-400">
                  Bei 80% zählt der freie Tag nicht als Minuszeit.
                </p>
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-5">
              <label className="block">
                <span className="text-sm font-black text-slate-600">Eintrittsdatum</span>
                <input
                  value={mitarbeiterEintrittsdatum}
                  onChange={(event) => setMitarbeiterEintrittsdatum(event.target.value)}
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/40 focus:bg-white/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">Zeiterfassung ab</span>
                <input
                  value={mitarbeiterZeiterfassungAb}
                  onChange={(event) => setMitarbeiterZeiterfassungAb(event.target.value)}
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/40 focus:bg-white/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">Probezeit bis</span>
                <input
                  value={mitarbeiterProbezeitBis}
                  onChange={(event) => setMitarbeiterProbezeitBis(event.target.value)}
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/40 focus:bg-white/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">Austrittsdatum</span>
                <input
                  value={mitarbeiterAustrittsdatum}
                  onChange={(event) => setMitarbeiterAustrittsdatum(event.target.value)}
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/40 focus:bg-white/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">Überstunden Start</span>
                <input
                  value={mitarbeiterUeberstundenStart}
                  onChange={(event) => setMitarbeiterUeberstundenStart(event.target.value)}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/40 focus:bg-white/80"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                {mitarbeiterBearbeitenId
                  ? "Bearbeitungsmodus aktiv. Es wird kein neuer Login erstellt."
                  : "Mitarbeiter wird mit Login erstellt. Details können direkt hier bearbeitet werden."}
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                {mitarbeiterBearbeitenId && (
                  <button
                    type="button"
                    onClick={mitarbeiterFormZuruecksetzen}
                    className="rounded-2xl border border-white/70 bg-stone-900/5 px-6 py-4 font-black text-slate-600 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:text-slate-950"
                  >
                    Abbrechen
                  </button>
                )}

                <button
                  type="button"
                  onClick={mitarbeiterSpeichern}
                  className="rounded-2xl border border-orange-200/50 bg-orange-100/60 px-6 py-4 font-black text-slate-950 shadow-lg shadow-orange-900/10 transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-300/5 hover:shadow-orange-900/10"
                >
                  {mitarbeiterBearbeitenId ? "✓ Mitarbeiter aktualisieren" : "+ Mitarbeiter speichern"}
                </button>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-white/70 bg-white/50 p-5">
              <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <div className="text-lg font-black text-slate-950">Mitarbeiter bearbeiten</div>
                  <p className="mt-1 text-sm text-slate-500">
                    Bestehende Mitarbeiter direkt ins Formular laden und aktualisieren.
                  </p>
                </div>

                <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                  {mitarbeiter.length} Personen
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {mitarbeiter.length === 0 ? (
                  <div className="rounded-xl border border-white/70 bg-white/50 p-4 text-slate-500">
                    Noch keine Mitarbeiter vorhanden.
                  </div>
                ) : (
                  mitarbeiter.map((person) => (
                    <div
                      key={person.id}
                      className="rounded-2xl border border-white/70 bg-white/50 p-4 transition hover:border-orange-300/25 hover:bg-orange-300/5"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                          <div className="text-lg font-black text-slate-950">
                            {person.name}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {person.rolle || "Mitarbeiter"} · {Number(person.pensum_prozent || (Number(person.wochenstunden || 0) === 34 ? 80 : 100))}% · {Number(person.wochenstunden || 0)} h/Woche
                          </div>
                          <div className="mt-1 text-xs font-bold text-slate-400">
                            {normalisiereArbeitstageProWoche(person)} Tage/Woche
                            {normalisiereFreierWochentag(person) ? ` · frei ${normalisiereFreierWochentag(person)}` : ""}
                          </div>
                          <div className="mt-1 text-xs font-bold text-slate-400">
                            Zeiterfassung ab: {formatDatumInput(person.zeiterfassung_ab) || "Eintrittsdatum"}
                          </div>
                          <div className="mt-2 text-xs font-black uppercase tracking-widest text-orange-800">
                            {person.vertragsart || "Festangestellt"}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => mitarbeiterZumBearbeitenLaden(person)}
                          className="rounded-xl border border-orange-200/50 bg-orange-100/60 px-4 py-3 font-black text-slate-950 transition hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-300/5"
                        >
                          Bearbeiten
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              <label className="block xl:col-span-2">
                <span className="text-sm font-black text-slate-600">Termintitel</span>
                <input
                  placeholder="z.B. Montage Müller / Kundenbesuch"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300/50 focus:bg-white/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">Datum</span>
                <input
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300/50 focus:bg-white/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">Typ</span>
                <select className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/50 focus:bg-white/80">
                  <option>Termin</option>
                  <option>Montage</option>
                  <option>Besichtigung</option>
                  <option>Lieferung</option>
                  <option>Intern</option>
                </select>
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-4">
              <label className="block">
                <span className="text-sm font-black text-slate-600">Von</span>
                <input
                  type="time"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/50 focus:bg-white/80"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-slate-600">Bis</span>
                <input
                  type="time"
                  className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/50 focus:bg-white/80"
                />
              </label>

              <label className="block xl:col-span-2">
                <span className="text-sm font-black text-slate-600">Projekt zuweisen</span>
                <select className="mt-2 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition focus:border-orange-300/50 focus:bg-white/80">
                  <option>Ohne Projekt</option>
                  {projekte.map((projekt) => (
                    <option key={projekt.id} value={String(projekt.id)}>
                      {projektTitel(projekt)} · {projekt.kunde || "Intern"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.75fr]">
              <label className="block">
                <span className="text-sm font-black text-slate-600">Notiz</span>
                <textarea
                  placeholder="Kurze Info für Kalender / Chef Dashboard"
                  rows={4}
                  className="mt-2 w-full resize-none rounded-2xl border border-white/70 bg-white/80 px-4 py-3.5 font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-orange-300/50 focus:bg-white/80"
                />
              </label>

              <div className="rounded-2xl border border-white/70 bg-white/55 p-5">
                <div className="text-lg font-black text-slate-950">Kalender-Vorschau</div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Terminmaske sitzt jetzt direkt in der Kommandozentrale. Der echte Speicher-Patch bekommt danach eine kleine Supabase-Tabelle, damit Termine reloadsicher im Monatskalender erscheinen.
                </p>

                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((tag) => (
                    <div key={tag}>{tag}</div>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-1">
                  {Array.from({ length: 14 }).map((_, index) => (
                    <div
                      key={index}
                      className="min-h-[42px] rounded-lg border border-white/70 bg-white/70 p-1 text-[10px] font-black text-slate-500"
                    >
                      {index + 1}
                      {index === 4 || index === 10 ? (
                        <div className="mt-1 rounded-md bg-orange-100/80 px-1 py-0.5 text-[9px] text-orange-800">
                          Termin
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Design ist vorbereitet. Echte Termin-Speicherung kommt sauber mit eigener Tabelle statt als Schnellschuss.
              </p>

              <button
                type="button"
                onClick={() => setMeldung("Terminbereich ist vorbereitet. Für echtes Speichern folgt die Supabase-Tabelle für Kalendertermine.")}
                className="rounded-2xl border border-orange-200/50 bg-orange-100/60 px-6 py-4 font-black text-slate-950 shadow-lg shadow-orange-900/10 transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-300/5"
              >
                + Termin vorbereiten
              </button>
            </div>
          </>
        )}
      </section>

      <DropdownPanel
        id="team-kennzahlen"
        eyebrow="Team · Zeitkonto · Performance"
        title="Team & Zeitkonto"
        description="Kennzahlen, Tagesstatus und Team-Performance sind jetzt in einem ruhigen Chef-Panel zusammengefasst."
        open={teamKennzahlenOffen}
        onToggle={() => setTeamKennzahlenOffen(!teamKennzahlenOffen)}
      >
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Team Iststunden"
            value={loading ? "..." : formatStunden(teamIststunden)}
            orange
          />

          <KpiCard
            label="Angerechnet"
            value={loading ? "..." : formatStunden(teamAngerechnet)}
          />

          <KpiCard
            label="Team Sollstunden"
            value={loading ? "..." : formatStunden(teamSollstunden)}
          />

          <KpiCard
            label="Team Überstunden"
            value={loading ? "..." : formatStunden(teamDifferenz, true)}
            green={teamDifferenz >= 0}
            red={teamDifferenz < 0}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.72fr_1.28fr]">
          <section className="rounded-2xl border border-white/70 bg-white/45 p-5">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-800">Heute</div>
                <h3 className="mt-1 text-xl font-black text-slate-950">Team Status</h3>
              </div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                {heutigesDatum}
              </div>
            </div>

            <div className="space-y-2">
              {teamStatus.map((person) => (
                <div
                  key={person.name}
                  className="flex items-center justify-between rounded-xl border border-white/70 bg-white/60 px-4 py-3 transition hover:border-orange-300/25"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${person.punkt}`} />
                    <div className="min-w-0">
                      <div className="truncate font-black text-slate-950">{person.name}</div>
                      <div className="text-xs text-slate-500">{person.rolle}</div>
                    </div>
                  </div>

                  <div className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${person.farbe}`}>
                    {person.status}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/70 bg-white/45 p-5">
            <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-end">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-800">Monat {monat}</div>
                <h3 className="mt-1 text-xl font-black text-slate-950">Team Performance</h3>
              </div>
              <div className="text-sm font-bold text-slate-500">
                {mitarbeiterStats.length} Mitarbeiter
              </div>
            </div>

            <div className="space-y-4 md:hidden">
              {mitarbeiterStats.map((person) => {
                const detailsOffen = String(teamDetailsOffenId || "") === String(person.id);

                return (
                  <div key={person.id} className="rounded-2xl border border-white/70 bg-white/60 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => setTeamDetailsOffenId(detailsOffen ? null : person.id)}
                        className="min-w-0 text-left"
                      >
                        <div className="text-xl font-black text-slate-950 hover:text-orange-700">
                          {person.name}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {person.rolle} · Details {detailsOffen ? "ausblenden" : "anzeigen"}
                        </div>
                      </button>

                      <span
                        className={`rounded-full border px-3 py-1 text-sm font-black ${
                          person.differenz >= 0
                            ? "border-green-400/30 bg-green-500/10 text-green-400"
                            : "border-red-400/30 bg-red-500/10 text-red-400"
                        }`}
                      >
                        {formatStunden(Number(person.differenz || 0), true)}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <Info label="Arbeitstage" value={person.personArbeitstage} />
                      <Info label="Soll" value={formatStunden(Number(person.sollstunden || 0))} />
                      <Info label="Ist" value={formatStunden(Number(person.iststunden || 0))} />
                      <Info label="Angerechnet" value={formatStunden(Number(person.angerechneteStunden || 0))} />
                      <Info label="Urlaub" value={person.urlaubstagePerson} />
                      <Info label="Krank" value={person.kranktagePerson} />
                    </div>

                    {detailsOffen && <MitarbeiterDetail person={person} formatStunden={formatStunden} />}
                  </div>
                );
              })}
            </div>

            <div className="hidden space-y-3 md:block">
              {mitarbeiterStats.map((person) => {
                const detailsOffen = String(teamDetailsOffenId || "") === String(person.id);
                const differenz = Number(person.differenz || 0);
                const istPlus = differenz >= 0;

                return (
                  <div
                    key={person.id}
                    className="overflow-hidden rounded-2xl border border-white/70 bg-white/60 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:border-orange-300/25 hover:bg-white/70"
                  >
                    <button
                      type="button"
                      onClick={() => setTeamDetailsOffenId(detailsOffen ? null : person.id)}
                      className="block w-full px-4 py-4 text-left"
                    >
                      <div className="grid gap-4 lg:grid-cols-[1.05fr_2fr_auto] lg:items-center">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="shrink-0 text-sm font-black text-orange-800">
                              {detailsOffen ? "▾" : "▸"}
                            </span>
                            <span className="truncate text-lg font-black text-slate-950">
                              {person.name}
                            </span>
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-500">
                            {person.rolle} · {person.personArbeitstage} Arbeitstage
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                          <div className="rounded-xl border border-white/70 bg-white/55 px-3 py-2">
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Soll</div>
                            <div className="mt-1 text-sm font-black text-slate-950">
                              {formatStunden(Number(person.sollstunden || 0))}
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/70 bg-white/55 px-3 py-2">
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Ist</div>
                            <div className="mt-1 text-sm font-black text-slate-950">
                              {formatStunden(Number(person.iststunden || 0))}
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/70 bg-white/55 px-3 py-2">
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Angerechnet</div>
                            <div className="mt-1 text-sm font-black text-slate-950">
                              {formatStunden(Number(person.angerechneteStunden || 0))}
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/70 bg-white/55 px-3 py-2">
                            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Abwesenheit</div>
                            <div className="mt-1 text-sm font-black text-slate-950">
                              U: {person.urlaubstagePerson} / K: {person.kranktagePerson}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`rounded-2xl border px-4 py-3 text-right ${
                            istPlus
                              ? "border-green-400/20 bg-green-500/10 text-green-500"
                              : "border-red-400/20 bg-red-500/10 text-red-500"
                          }`}
                        >
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                            Überstunden
                          </div>
                          <div className="mt-1 whitespace-nowrap text-xl font-black">
                            {formatStunden(differenz, true)}
                          </div>
                          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                            ÜA {formatStunden(-Number(person.ueberstundenAbbauStunden || 0))}
                          </div>
                        </div>
                      </div>
                    </button>

                    {detailsOffen && <MitarbeiterDetail person={person} formatStunden={formatStunden} desktop />}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <MiniCard label="Offen" value={offeneTage} orange={offeneTage > 0} />
          <MiniCard label="Abgeschlossen" value={abgeschlosseneTage} />
          <MiniCard label="Geprüft" value={gepruefteTage} />
          <MiniCard label="Offene Anträge" value={offeneAntraege} orange={offeneAntraege > 0} />
          <MiniCard label="Arbeitstage" value={arbeitstage} />
          <MiniCard label="Mitarbeiter" value={mitarbeiter.length} />
          <MiniCard label="ÜA Abbau" value={formatStunden(-Number(teamUeberstundenAbbauStunden || 0))} orange={teamUeberstundenAbbauStunden > 0} />
        </div>
      </DropdownPanel>

      <section className="min-h-[150px] rounded-[2rem] border border-white/70 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-slate-900/10 lg:p-7">
  <div className="mb-6">
    <h2 className="text-2xl font-black text-slate-950">
      Prüfzentrum
    </h2>
    <p className="mt-1 text-slate-500">
      Tage prüfen, freigeben und sauber abschließen.
    </p>
  </div>

  {abgeschlosseneTageListe.length === 0 ? (
    <div className="rounded-xl border border-white/70 bg-white/50 p-5 text-slate-500">
      Alles geprüft. Keine offenen Tagesabschlüsse.
    </div>
  ) : (
    <div className="space-y-3">
      {abgeschlosseneTageListe.map((tag) => {
        const pruefEintraege = arbeitszeitenZurPruefung(tag);
        const pruefSumme = pruefEintraege.reduce(
          (sum, eintrag) => sum + Number(eintrag.stunden || 0),
          0
        );

        return (
          <div
            key={tag.id}
            className="rounded-2xl border border-orange-200/40 bg-gradient-to-br from-slate-200/10 to-white/40 p-5"
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="text-lg font-black text-slate-950">
                  {tag.mitarbeiterName}
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  {tag.datum} · Tagesabschluss {formatStunden(Number(tag.netto_stunden || 0))}
                </div>

                <div className="mt-1 text-xs font-bold uppercase tracking-widest text-orange-800">
                  Status: {tag.status}
                </div>
              </div>

              <button
                type="button"
                onClick={() => tagAlsGeprueftMarkieren(tag.id)}
                className="rounded-xl border border-orange-200/50 bg-orange-100/60 px-5 py-3 font-black text-slate-950 shadow-lg shadow-orange-900/10 transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-300/5 hover:shadow-orange-900/10"
              >
                ✓ Freigeben
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/70 bg-white/50 p-4">
              <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-700">
                    Aufträge zur Prüfung
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Nicht nur Gesamtzeit: Hier siehst du die gebuchten Aufträge, Bereiche und Zeiten.
                  </div>
                </div>

                <div className="rounded-xl border border-white/70 bg-white/60 px-3 py-2 text-xs font-black uppercase tracking-widest text-orange-800">
                  {pruefEintraege.length} Buchung{pruefEintraege.length === 1 ? "" : "en"} · {formatStunden(pruefSumme)}
                </div>
              </div>

              {pruefEintraege.length === 0 ? (
                <div className="rounded-xl border border-white/70 bg-white/50 p-4 text-sm text-slate-500">
                  Keine Projektbuchungen für diesen Tagesabschluss gefunden.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {pruefEintraege.map((eintrag) => (
                    <div
                      key={`${tag.id}-${eintrag.id}`}
                      className="rounded-xl border border-white/70 bg-white/50 p-4 transition hover:border-orange-300/25 hover:bg-orange-300/5"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <div className="text-base font-black text-slate-950">
                            {eintrag.projekt || "Ohne Auftrag"}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            Bereich: <span className="font-bold text-slate-700">{eintrag.bereich || "Ohne Bereich"}</span>
                          </div>
                          {String(eintrag.projekt || "").toLowerCase() === "betriebsunterhalt" && (
                            <div className="mt-2 inline-flex rounded-full border border-orange-200/40 bg-orange-100/60 px-3 py-1 text-xs font-black uppercase tracking-widest text-orange-800">
                              Automatisch
                            </div>
                          )}
                        </div>

                        <div className="text-left sm:text-right">
                          <div className="text-xl font-black text-orange-700">
                            {formatStunden(Number(eintrag.stunden || 0))}
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-500">
                            {zeitVonBisText(eintrag)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  )}
</section>

<section className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-slate-900/10 lg:p-7">
  <button
    type="button"
    onClick={() => setGepruefteOffen(!gepruefteOffen)}
    className="flex w-full items-center justify-between gap-4 text-left"
  >
    <div>
      <h2 className="text-2xl font-black text-slate-950">
        Freigabehistorie
      </h2>

      <p className="mt-1 text-slate-500">
        Zuletzt freigegebene und geprüfte Arbeitstage.
      </p>
    </div>

    <div className="rounded-xl border border-orange-200/50 bg-orange-100/60 px-4 py-3 text-sm font-black text-orange-800">
      {gepruefteOffen ? "Schließen ▲" : "Historie öffnen ▼"}
    </div>
  </button>

  {gepruefteOffen && (
    <div className="mt-6">
      {letzteGepruefteTage.length === 0 ? (
        <div className="rounded-xl border border-white/70 bg-white/50 p-5 text-slate-500">
          Noch keine Freigaben vorhanden.
        </div>
      ) : (
        <>
        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
          {sichtbareFreigaben.map((tag) => (
            <div
              key={tag.id}
              className="rounded-2xl border border-white/70 bg-gradient-to-br from-white/[0.06] to-white/40 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/25 hover:bg-orange-300/5 hover:shadow-lg hover:shadow-orange-900/10"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <div className="text-base font-black text-slate-950">
                    {tag.mitarbeiterName}
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    {tag.datum} · {formatStunden(Number(tag.netto_stunden || 0))}
                  </div>

                  <div className="mt-2 text-xs font-bold uppercase tracking-widest text-green-400">
                    Status: Geprüft
                  </div>
                </div>

                <div className="text-sm text-slate-600 md:text-right">
                  <div>
                    Geprüft von: {tag.geprueft_von || "-"}
                  </div>

                  <div>
                    {tag.geprueft_am
                      ? new Date(tag.geprueft_am).toLocaleString("de-CH")
                      : "-"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setFreigabeSeite((s) => Math.max(1, s - 1))}
            disabled={freigabeSeite === 1}
            className="rounded-xl border border-white/70 bg-stone-900/5 px-4 py-3 font-black text-slate-600 transition hover:border-orange-300/30 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ◀
          </button>

          <div className="text-sm font-black uppercase tracking-widest text-slate-500">
            Seite {freigabeSeite} / {freigabeSeiten}
          </div>

          <button
            type="button"
            onClick={() =>
              setFreigabeSeite((s) => Math.min(freigabeSeiten, s + 1))
            }
            disabled={freigabeSeite === freigabeSeiten}
            className="rounded-xl border border-white/70 bg-stone-900/5 px-4 py-3 font-black text-slate-600 transition hover:border-orange-300/30 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ▶
          </button>
        </div>
        </>
      )}
    </div>
  )}
</section>

      <DropdownPanel
        id="abwesenheit"
        title="Abwesenheit"
        eyebrow="Urlaub · Krankheit · Überstundenabbau"
        description="Alle Abwesenheiten bleiben direkt im Chef Dashboard sichtbar, aber sauber eingeklappt."
        open={abwesenheitOffen}
        onToggle={() => setAbwesenheitOffen(!abwesenheitOffen)}
      >
<section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-slate-900/10">
          <div className="mb-7">
            <h2 className="text-2xl font-black text-slate-950">
              Abwesenheiten diesen Monat
            </h2>
            <p className="mt-1 text-slate-500">
              Urlaub, Krankheit und Überstundenabbau im aktuellen Monat
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MiniCard label="Urlaubstage" value={urlaubstage} />
            <MiniCard label="Kranktage" value={kranktage} />
            <MiniCard
              label="Überstundenabbau"
              value={ueberstundenabbauTage}
              orange
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-white/[0.08] to-white/[0.025] p-7 shadow-2xl shadow-slate-900/10">
          <div className="mb-7">
            <h2 className="text-2xl font-black text-slate-950">Schnellzugriff</h2>
            <p className="mt-1 text-slate-500">Wichtige Adminbereiche</p>
          </div>

          <div className="space-y-3">
            <QuickLink href="/admin" label="Urlaubsanträge prüfen" />
            <QuickLink href="/monatsansicht" label="Monatsansicht öffnen" />
          </div>
        </div>
      </section>

      
      </DropdownPanel>

      <DropdownPanel
        id="auswertung"
        title="Auswertung"
        eyebrow="Top Projekte · Kontrollstatus · Top Bereiche"
        description="Die wichtigsten Chef-Auswertungen direkt im Dashboard, ohne eigene Seite öffnen zu müssen."
        open={auswertungOffen}
        onToggle={() => setAuswertungOffen(!auswertungOffen)}
      >
<section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-slate-900/10">
          <div className="mb-7">
            <h2 className="text-2xl font-black text-slate-950">Top Projekte</h2>
            <p className="mt-1 text-slate-500">Stärkste Projektbelastung im aktuellen Monat</p>
          </div>

          {topProjekte.length === 0 ? (
            <div className="rounded-xl border border-white/70 bg-white/50 p-5 text-slate-500">
              Noch keine Projektstunden vorhanden.
            </div>
          ) : (
            <div className="space-y-4">
              {topProjekte.map((projekt, index) => {
                const max = Math.max(...topProjekte.map((p) => Number(p.stunden || 0)), 1);
                const percent = Math.min(100, Math.round((Number(projekt.stunden || 0) / max) * 100));

                return (
                  <div key={projekt.name} className="rounded-2xl border border-white/70 bg-white/50 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                          #{index + 1}
                        </div>
                        <div className="mt-2 text-xl font-black text-slate-950">{projekt.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{projekt.kunde || "Kein Kunde"}</div>
                      </div>

                      <div className="text-3xl font-black text-slate-950">
                        {formatStunden(Number(projekt.stunden || 0))}
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-slate-200/80 to-slate-100/80 shadow-lg shadow-orange-900/10" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-slate-900/10">
          <div className="mb-7">
            <h2 className="text-2xl font-black text-slate-950">Kontrollstatus</h2>
            <p className="mt-1 text-slate-500">Was Aufmerksamkeit braucht</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MiniCard label="Offene Tage" value={offeneTage} orange={offeneTage > 0} />
            <MiniCard label="Zur Prüfung" value={abgeschlosseneTage} orange={abgeschlosseneTage > 0} />
            <MiniCard label="Offene Anträge" value={offeneAntraege} orange={offeneAntraege > 0} />
            <MiniCard label="Geprüft" value={gepruefteTage} />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-slate-900/10">
        <div className="mb-7">
          <h2 className="text-2xl font-black text-slate-950">Top Bereiche</h2>
          <p className="mt-1 text-slate-500">Werkstatt, Montage, Planung und Logistik sauber im Blick</p>
        </div>

        {topBereiche.length === 0 ? (
          <div className="rounded-xl border border-white/70 bg-white/50 p-5 text-slate-500">
            Noch keine Bereichsstunden vorhanden.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {topBereiche.map((bereich, index) => (
              <div
                key={bereich.name}
                className="rounded-2xl border border-white/70 bg-white/50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-orange-300/25 hover:shadow-lg hover:shadow-orange-900/10"
              >
                <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-800">
                  #{index + 1}
                </div>
                <div className="mt-3 text-xl font-black text-slate-950">{bereich.name}</div>
                <div className="mt-3 text-3xl font-black text-slate-950">
                  {formatStunden(bereich.stunden)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      
      </DropdownPanel>

      <DropdownPanel
        id="projektuebersicht"
        title="Projektübersicht"
        eyebrow="Projektliste · Kunde · Stunden"
        description="Die Projektübersicht ist jetzt als Dropdown im Chef Dashboard und bleibt sauber eingeklappt."
        open={projektUebersichtOffen}
        onToggle={() => setProjektUebersichtOffen(!projektUebersichtOffen)}
      >
<section className="rounded-[2rem] border border-white/70 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-slate-900/10 lg:p-7">
        <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black text-slate-950">
              Projektübersicht
            </h2>
            <p className="mt-1 text-slate-500">
              Aktuelle Projektbelastung im laufenden Monat
            </p>
          </div>

          <div className="text-sm text-slate-500">
            {projektStunden.length} Projekte
          </div>
        </div>

        <div className="space-y-4 md:hidden">
          {projektStunden.map((projekt) => (
            <div
              key={projekt.name}
              className="rounded-2xl border border-white/70 bg-white/50 p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-black text-slate-950">
                    {projekt.name}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Kunde: {projekt.kunde || "-"}
                  </p>
                </div>

                <div className="font-black text-slate-950">
                  {formatStunden(Number(projekt.stunden || 0))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-white/70 md:block">
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-3 border-b border-white/70 bg-stone-900/5 px-5 py-4 text-sm font-bold uppercase tracking-wide text-slate-500">
                <div>Projekt</div>
                <div>Kunde</div>
                <div>Stunden</div>
              </div>

              {projektStunden.map((projekt) => (
                <div
                  key={projekt.name}
                  className="grid grid-cols-3 items-center border-b border-white/70 px-5 py-4 text-slate-700 transition hover:bg-white/50"
                >
                  <div className="text-lg font-black text-slate-950">{projekt.name}</div>
                  <div className="text-sm text-slate-500">{projekt.kunde || "-"}</div>
                  <div className="font-black text-slate-950">
                    {formatStunden(Number(projekt.stunden || 0))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      </DropdownPanel>

      <style jsx global>{`
        .chef-dashboard-v12 input,
        .chef-dashboard-v12 select {
          color: #020617 !important;
          color-scheme: light;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62);
        }

        .chef-dashboard-v12 input::placeholder {
          color: rgba(15, 23, 42, 0.45) !important;
        }

        .chef-dashboard-v12 option {
          color: #020617;
          background: #ffffff;
        }

        .chef-dashboard-v12 input::-webkit-datetime-edit,
        .chef-dashboard-v12 input::-webkit-datetime-edit-fields-wrapper,
        .chef-dashboard-v12 input::-webkit-datetime-edit-text,
        .chef-dashboard-v12 input::-webkit-datetime-edit-month-field,
        .chef-dashboard-v12 input::-webkit-datetime-edit-day-field,
        .chef-dashboard-v12 input::-webkit-datetime-edit-year-field,
        .chef-dashboard-v12 input::-webkit-datetime-edit-hour-field,
        .chef-dashboard-v12 input::-webkit-datetime-edit-minute-field,
        .chef-dashboard-v12 input::-webkit-datetime-edit-ampm-field {
          color: #020617 !important;
        }

        .chef-dashboard-v12 input:disabled,
        .chef-dashboard-v12 select:disabled,
        .chef-dashboard-v12 input:disabled::-webkit-datetime-edit,
        .chef-dashboard-v12 input:disabled::-webkit-datetime-edit-fields-wrapper,
        .chef-dashboard-v12 input:disabled::-webkit-datetime-edit-text,
        .chef-dashboard-v12 input:disabled::-webkit-datetime-edit-month-field,
        .chef-dashboard-v12 input:disabled::-webkit-datetime-edit-day-field,
        .chef-dashboard-v12 input:disabled::-webkit-datetime-edit-year-field,
        .chef-dashboard-v12 input:disabled::-webkit-datetime-edit-hour-field,
        .chef-dashboard-v12 input:disabled::-webkit-datetime-edit-minute-field {
          color: rgba(15, 23, 42, 0.48) !important;
          -webkit-text-fill-color: rgba(15, 23, 42, 0.48) !important;
        }

        .chef-dashboard-v12 input::-webkit-calendar-picker-indicator {
          filter: none;
          opacity: 0.58;
          cursor: pointer;
        }

        .chef-dashboard-v12 input,
        .chef-dashboard-v12 select,
        .chef-dashboard-v12 textarea {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          color-scheme: light !important;
        }

        .chef-dashboard-v12 input::placeholder,
        .chef-dashboard-v12 textarea::placeholder {
          color: rgba(100, 116, 139, 0.62) !important;
          -webkit-text-fill-color: rgba(100, 116, 139, 0.62) !important;
        }

        .chef-dashboard-v12 select option {
          background: #ffffff !important;
          color: #020617 !important;
        }

        .chef-dashboard-v12 input[type="date"],
        .chef-dashboard-v12 input[type="month"],
        .chef-dashboard-v12 input[type="datetime-local"] {
          padding-right: 3rem !important;
          background-repeat: no-repeat !important;
          background-position: right 1rem center !important;
          background-size: 1.15rem 1.15rem !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23020617' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='6'/%3E%3Cline x1='8' y1='2' x2='8' y2='6'/%3E%3Cline x1='3' y1='10' x2='21' y2='10'/%3E%3C/svg%3E") !important;
        }

        .chef-dashboard-v12 input[type="time"] {
          padding-right: 3rem !important;
          background-repeat: no-repeat !important;
          background-position: right 1rem center !important;
          background-size: 1.15rem 1.15rem !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23020617' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpolyline points='12 6 12 12 16 14'/%3E%3C/svg%3E") !important;
        }

        .chef-dashboard-v12 input[type="date"]::-webkit-calendar-picker-indicator,
        .chef-dashboard-v12 input[type="time"]::-webkit-calendar-picker-indicator,
        .chef-dashboard-v12 input[type="datetime-local"]::-webkit-calendar-picker-indicator,
        .chef-dashboard-v12 input[type="month"]::-webkit-calendar-picker-indicator {
          opacity: 0 !important;
          cursor: pointer !important;
          width: 2.75rem !important;
          height: 100% !important;
        }

      `}</style>
    </main>
  );
}

function KpiCard({
  label,
  value,
  orange,
  green,
  red,
  compact,
}: {
  label: string;
  value: string | number;
  orange?: boolean;
  green?: boolean;
  red?: boolean;
  compact?: boolean;
}) {
  const color = green
    ? "text-green-600"
    : red
    ? "text-red-500"
    : orange
    ? "text-orange-700"
    : "text-slate-950";

  return (
    <div
      className={`group rounded-[1.35rem] border border-white/70 bg-white/60 shadow-[0_16px_42px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-orange-300/40 hover:bg-orange-50/70 hover:shadow-orange-900/10 ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className={`${compact ? "text-2xl md:text-3xl" : "text-4xl md:text-5xl"} font-black ${color}`}>
        {value}
      </div>

      <div className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
        {label}
      </div>

      <div className="mt-5 h-1 w-16 rounded-full bg-stone-900/10 transition-all duration-300 group-hover:w-24 group-hover:bg-orange-300/70" />
    </div>
  );
}


function HeroMini({
  label,
  value,
  orange,
  green,
  dark,
}: {
  label: string;
  value: string | number;
  orange?: boolean;
  green?: boolean;
  dark?: boolean;
}) {
  const color = dark
    ? orange
      ? "text-orange-200"
      : green
      ? "text-green-300"
      : "text-white"
    : green
    ? "text-green-600"
    : orange
    ? "text-orange-700"
    : "text-slate-950";

  return (
    <div
      className={`rounded-2xl border p-3 text-center transition ${
        dark
          ? "border-white/10 bg-white/[0.08] hover:border-orange-200/40 hover:bg-orange-300/10"
          : "border-white/70 bg-white/60 shadow-[0_10px_28px_rgba(15,23,42,0.06)] hover:border-orange-300/40 hover:bg-orange-50/80"
      }`}
    >
      <div className={`text-xl font-black leading-tight md:text-2xl ${color}`}>{value}</div>
      <div className={`mt-1 text-[9px] font-black uppercase tracking-[0.16em] ${dark ? "text-white/50" : "text-slate-500"}`}>
        {label}
      </div>
    </div>
  );
}

function MiniCard({
  label,
  value,
  orange,
}: {
  label: string;
  value: string | number;
  orange?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/60 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition hover:border-orange-300/40 hover:bg-orange-50/80">
      <div className="text-sm font-bold text-slate-500">{label}</div>
      <div
        className={`mt-3 text-4xl font-black ${
          orange ? "text-orange-800" : "text-slate-950"
        }`}
      >
        {value}
      </div>
    </div>
  );
}


function QuickDropdownButton({
  eyebrow,
  label,
  onClick,
}: {
  eyebrow: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-w-[170px] items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/55 px-4 py-3 text-left text-slate-950 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-300/40 hover:bg-orange-100/60"
    >
      <span>
        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{eyebrow}</span>
        <span className="mt-0.5 block text-sm font-black text-slate-950">{label}</span>
      </span>
      <span className="text-xs font-black text-orange-800 opacity-60 transition group-hover:opacity-100">›</span>
    </button>
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
    <section id={id} className="overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white/[0.07] to-white/[0.025] shadow-2xl shadow-slate-900/10">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col justify-between gap-4 p-6 text-left transition hover:bg-orange-300/5 lg:flex-row lg:items-center lg:p-7"
      >
        <div>
          <div className="text-xs font-black uppercase tracking-[0.24em] text-orange-800">
            {eyebrow}
          </div>
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

function QuickLink({ href, label, orange, onClick }: { href: string; label: string; orange?: boolean; onClick?: () => void }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`block rounded-xl border p-4 font-black transition-all duration-300 hover:-translate-y-1 ${
        orange
          ? "border-orange-200/40 bg-white/50 text-slate-950 hover:border-slate-200/40 hover:bg-orange-300/5"
          : "border-white/70 bg-white/50 text-slate-950 hover:border-orange-300/25 hover:bg-orange-300/5 hover:text-slate-950"
      }`}
    >
      {label}
    </a>
  );
}


function MitarbeiterDetail({
  person,
  formatStunden,
  desktop,
}: {
  person: any;
  formatStunden: (wert: number, mitVorzeichen?: boolean) => string;
  desktop?: boolean;
}) {
  const tagesliste = person.tagesliste || [];
  const projektSummen = person.projektSummen || [];

  return (
    <div className={`${desktop ? "px-5 pb-5" : "mt-5"}`}>
      <div className="rounded-2xl border border-orange-300/20 bg-orange-300/[0.04] p-5">
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Info label="Echte Tageszeit" value={formatStunden(Number(person.iststunden || 0))} />
          <Info label="Projektzeit" value={formatStunden(Number(person.projektStundenOhneBetriebsunterhalt || 0))} />
          <Info label="Betriebsunterhalt" value={formatStunden(Number(person.betriebsunterhaltStunden || 0))} />
          <Info label="Alle Buchungen" value={formatStunden(Number(person.projektStundenGebucht || 0))} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-white/70 bg-white/50 p-4">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              Tage · Von/Bis · Netto · Status
            </div>

            {tagesliste.length === 0 ? (
              <div className="text-sm font-bold text-slate-400">
                Noch keine abgeschlossenen Tageszeiten in diesem Zeitraum.
              </div>
            ) : (
              <div className="space-y-2">
                {tagesliste.map((tag: any) => (
                  <div
                    key={`${person.id}-${tag.id || tag.datum}`}
                    className="grid grid-cols-1 gap-2 rounded-xl border border-white/70 bg-white/50 p-3 text-sm text-slate-600 md:grid-cols-[1fr_0.9fr_0.8fr_0.8fr]"
                  >
                    <div className="font-black text-slate-950">{tag.datum}</div>
                    <div>
                      {String(tag.startzeit || "").slice(0, 5) || "--:--"} - {String(tag.endzeit || "").slice(0, 5) || "--:--"}
                    </div>
                    <div className="font-black text-orange-700">
                      {formatStunden(Number(tag.netto_stunden || 0))}
                    </div>
                    <div className="text-slate-500">
                      {tag.status || "-"} · {tag.buchungen || 0} Buch.
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/50 p-4">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              Projektverteilung
            </div>

            {projektSummen.length === 0 ? (
              <div className="text-sm font-bold text-slate-400">
                Noch keine Projektbuchungen in diesem Zeitraum.
              </div>
            ) : (
              <div className="space-y-2">
                {projektSummen.map((projekt: any) => (
                  <div
                    key={`${person.id}-${projekt.projektName}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/70 bg-white/50 p-3"
                  >
                    <div className="min-w-0 truncate text-sm font-black text-slate-950">
                      {projekt.projektName}
                    </div>
                    <div className="shrink-0 text-sm font-black text-orange-700">
                      {formatStunden(Number(projekt.stunden || 0))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  orange,
}: {
  label: string;
  value: string | number;
  orange?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/70 bg-stone-900/5 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={`mt-1 font-bold ${
          orange ? "text-orange-800" : "text-slate-950"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
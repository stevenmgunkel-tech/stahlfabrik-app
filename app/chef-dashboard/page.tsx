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

  const [verwaltungsModus, setVerwaltungsModus] = useState<"projekt" | "mitarbeiter">("projekt");
  const [abwesenheitOffen, setAbwesenheitOffen] = useState(false);
  const [auswertungOffen, setAuswertungOffen] = useState(false);
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
  const alleEintraege = arbeitszeiten
    .filter(
      (zeit) =>
        zeit.user_id === tag.user_id &&
        zeit.datum === tag.datum
    )
    .sort((a, b) => String(a.startzeit || "").localeCompare(String(b.startzeit || "")));

  const projektEintraege = alleEintraege.filter(
    (zeit) => String(zeit.projekt || "").toLowerCase() !== "betriebsunterhalt"
  );

  return projektEintraege.length > 0 ? projektEintraege : alleEintraege;
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
      farbe: "text-slate-200",
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

  if (!zugriffGeprueft || loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-slate-100">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-5 font-black shadow-2xl shadow-black/30">
          Zugriff wird geprüft...
        </div>
      </main>
    );
  }

  if (!istAdmin) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-slate-100">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-5 font-black text-red-300 shadow-2xl shadow-black/30">
          Kein Zugriff auf den Chefbereich.
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
              ODZ SILVER · Chef Dashboard
            </div>


            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              STAHLFABRIK
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/65 sm:text-base">
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
            <HeroMini label="Offen" value={offeneTage} orange={offeneTage > 0} />
            <HeroMini label="Prüfung" value={abgeschlosseneTage} orange={abgeschlosseneTage > 0} />
            <HeroMini label="Geprüft" value={gepruefteTage} green={gepruefteTage > 0} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <a
          href="#kommandozentrale"
          onClick={() => setVerwaltungsModus("projekt")}
          className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-white transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
        >
          <div className="text-sm text-white/50">Projekt</div>
          <div className="mt-2 text-lg font-black text-white">
            🏗️ Neues Projekt
          </div>
        </a>

        <a
          href="#kommandozentrale"
          onClick={() => setVerwaltungsModus("mitarbeiter")}
          className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
        >
          <div className="text-sm text-white/50">Team</div>
          <div className="mt-2 text-lg font-black text-white">
            👤 Mitarbeiter
          </div>
        </a>

        <a
          href="#abwesenheit"
          onClick={() => setAbwesenheitOffen(true)}
          className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
        >
          <div className="text-sm text-white/50">Abwesenheit</div>
          <div className="mt-2 text-lg font-black text-white">
            📅 Urlaub
          </div>
        </a>

        <a
          href="#auswertung"
          onClick={() => setAuswertungOffen(true)}
          className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
        >
          <div className="text-sm text-white/50">Auswertung</div>
          <div className="mt-2 text-lg font-black text-white">
            📊 Statistik
          </div>
        </a>
      </section>

      {meldung && (
        <div className="rounded-xl border border-slate-200/20 bg-slate-200/10 p-4 text-sm font-bold text-slate-100">
          {meldung}
        </div>
      )}

      <section
        id="kommandozentrale"
        className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-black/20 p-6 shadow-2xl shadow-black/30 lg:p-7"
      >
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-200">
              Kommandozentrale
            </div>
            <h2 className="mt-2 text-2xl font-black text-white">
              Verwaltung direkt im Chef Dashboard
            </h2>
            <p className="mt-1 text-white/55">
              Projekte und Mitarbeiter werden zentral hier angelegt. So bleibt der Chef im Dashboard.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <HeroMini label="Aktiv" value={aktiveProjekte} green={aktiveProjekte > 0} />
            <HeroMini label="Pausiert" value={pausierteProjekte} orange={pausierteProjekte > 0} />
            <HeroMini label="Archiv" value={abgeschlosseneProjekte} />
            <HeroMini label="Team" value={mitarbeiter.length} />
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <label className="block">
            <span className="text-sm font-black text-white/65">Was möchtest du verwalten?</span>
            <select
              value={verwaltungsModus}
              onChange={(event) => setVerwaltungsModus(event.target.value as "projekt" | "mitarbeiter")}
              className="mt-2 w-full rounded-2xl border border-slate-200/25 bg-slate-200/10 px-4 py-4 font-black text-slate-100 outline-none transition focus:border-slate-200/50 focus:bg-slate-200/15"
            >
              <option value="projekt">🏗️ Projekt erstellen / bearbeiten</option>
              <option value="mitarbeiter">👤 Mitarbeiter erstellen / bearbeiten</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setVerwaltungsModus("projekt")}
              className={`rounded-2xl border px-5 py-4 font-black transition-all duration-300 hover:-translate-y-1 ${
                verwaltungsModus === "projekt"
                  ? "border-slate-200/40 bg-slate-200/10 text-slate-100 shadow-lg shadow-slate-200/10"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:border-sky-300/25 hover:bg-sky-300/5 hover:text-slate-100"
              }`}
            >
              🏗️ Projekt
            </button>

            <button
              type="button"
              onClick={() => setVerwaltungsModus("mitarbeiter")}
              className={`rounded-2xl border px-5 py-4 font-black transition-all duration-300 hover:-translate-y-1 ${
                verwaltungsModus === "mitarbeiter"
                  ? "border-slate-200/40 bg-slate-200/10 text-slate-100 shadow-lg shadow-slate-200/10"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:border-sky-300/25 hover:bg-sky-300/5 hover:text-sky-200"
              }`}
            >
              👤 Mitarbeiter
            </button>
          </div>
        </div>

        {verwaltungsModus === "projekt" ? (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              <label className="block">
                <span className="text-sm font-black text-white/65">Kunde</span>
                <input
                  value={projektKunde}
                  onChange={(event) => setProjektKunde(event.target.value)}
                  placeholder="z.B. Firma"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition placeholder:text-white/25 focus:border-slate-200/40 focus:bg-black/40"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-white/65">Kommission</span>
                <input
                  value={projektKommission}
                  onChange={(event) => setProjektKommission(event.target.value)}
                  placeholder="z.B. Baustelle"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition placeholder:text-white/25 focus:border-slate-200/40 focus:bg-black/40"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-white/65">Projektname</span>
                <input
                  value={projektName}
                  onChange={(event) => setProjektName(event.target.value)}
                  placeholder="z.B. Geländer Müller"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition placeholder:text-white/25 focus:border-slate-200/40 focus:bg-black/40"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-white/65">Status</span>
                <select
                  value={projektStatus}
                  onChange={(event) => setProjektStatus(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition focus:border-slate-200/40 focus:bg-black/40"
                >
                  <option value="Aktiv">Aktiv</option>
                  <option value="Pausiert">Pausiert</option>
                  <option value="Abgeschlossen">Abgeschlossen</option>
                </select>
              </label>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5">
              <div className="text-lg font-black text-white">Erlaubte Bereiche</div>
              <p className="mt-1 text-sm text-white/50">
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
                          ? "border-slate-200/40 bg-slate-200/10 text-slate-100 shadow-lg shadow-slate-200/10"
                          : "border-white/10 bg-white/[0.03] text-white/55 hover:border-sky-300/25 hover:bg-sky-300/5 hover:text-slate-100"
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
              <p className="text-sm text-white/45">
                {projektBearbeitenId
                  ? "Bearbeitungsmodus aktiv. Änderungen werden direkt am bestehenden Projekt gespeichert."
                  : "Ziel: Chef bleibt im Dashboard. Keine doppelte Projektverwaltung mehr."}
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                {projektBearbeitenId && (
                  <button
                    type="button"
                    onClick={projektFormZuruecksetzen}
                    className="rounded-2xl border border-white/10 bg-black/25 px-6 py-4 font-black text-white/60 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:text-white"
                  >
                    Abbrechen
                  </button>
                )}

                <button
                  type="button"
                  onClick={projektSpeichern}
                  className="rounded-2xl border border-slate-200/30 bg-slate-200/10 px-6 py-4 font-black text-slate-100 shadow-lg shadow-slate-200/10 transition-all duration-300 hover:-translate-y-1 hover:border-slate-200/50 hover:bg-slate-200/15 hover:shadow-sky-300/10"
                >
                  {projektBearbeitenId ? "✓ Projekt aktualisieren" : "+ Projekt speichern"}
                </button>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <div className="text-lg font-black text-white">Projekt auswählen</div>
                  <p className="mt-1 text-sm text-white/45">
                    Nur noch Dropdown: Projekt wählen, Formular springt nach oben, anpassen und speichern.
                  </p>
                </div>

                <div className="text-xs font-black uppercase tracking-widest text-white/35">
                  {projekte.length} Projekte
                </div>
              </div>

              {projekte.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-white/45">
                  Noch keine Projekte vorhanden.
                </div>
              ) : (
                <label className="block">
                  <span className="text-sm font-black text-white/65">Projekt zum Bearbeiten wählen</span>
                  <select
                    value={projektBearbeitenId ? String(projektBearbeitenId) : ""}
                    onChange={(event) => {
                      const projekt = projekte.find(
                        (eintrag) => String(eintrag.id) === event.target.value
                      );

                      if (projekt) projektZumBearbeitenLaden(projekt);
                    }}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-black text-white outline-none transition focus:border-sky-300/40 focus:bg-black/40"
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
                <div className="mt-5 flex flex-col justify-between gap-3 rounded-2xl border border-sky-300/20 bg-sky-300/5 p-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="text-sm font-black text-sky-100">Bearbeitung aktiv</div>
                    <div className="mt-1 text-sm text-white/50">
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
                    className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 font-black text-red-200 transition hover:-translate-y-1 hover:border-red-300/45 hover:bg-red-500/15"
                  >
                    Projekt löschen
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <label className="block">
                <span className="text-sm font-black text-white/65">Name</span>
                <input
                  value={mitarbeiterName}
                  onChange={(event) => setMitarbeiterName(event.target.value)}
                  placeholder="z.B. Max Muster"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition placeholder:text-white/25 focus:border-sky-300/40 focus:bg-black/40"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-white/65">{mitarbeiterBearbeitenId ? "E-Mail nur bei neuem Login" : "E-Mail"}</span>
                <input
                  value={mitarbeiterEmail}
                  onChange={(event) => setMitarbeiterEmail(event.target.value)}
                  placeholder={mitarbeiterBearbeitenId ? "Bei Bearbeitung nicht nötig" : "max@firma.ch"}
                  type="email"
                  disabled={!!mitarbeiterBearbeitenId}
                  className={`mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition placeholder:text-white/25 focus:border-sky-300/40 focus:bg-black/40 ${mitarbeiterBearbeitenId ? "cursor-not-allowed opacity-50" : ""}`}
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-white/65">{mitarbeiterBearbeitenId ? "Passwort unverändert" : "Startpasswort"}</span>
                <input
                  value={mitarbeiterPasswort}
                  onChange={(event) => setMitarbeiterPasswort(event.target.value)}
                  placeholder={mitarbeiterBearbeitenId ? "Nur über Supabase Auth ändern" : "mind. 6 Zeichen"}
                  type="password"
                  disabled={!!mitarbeiterBearbeitenId}
                  className={`mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition placeholder:text-white/25 focus:border-sky-300/40 focus:bg-black/40 ${mitarbeiterBearbeitenId ? "cursor-not-allowed opacity-50" : ""}`}
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-6">
              <label className="block">
                <span className="text-sm font-black text-white/65">Rolle</span>
                <select
                  value={mitarbeiterRolle}
                  onChange={(event) => setMitarbeiterRolle(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition focus:border-sky-300/40 focus:bg-black/40"
                >
                  <option value="Mitarbeiter">Mitarbeiter</option>
                  <option value="Admin">Admin</option>
                  <option value="Lehrling">Lehrling</option>
                  <option value="Temporär">Temporär</option>
                  <option value="Aushilfe">Aushilfe</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-black text-white/65">Arbeitsmodell</span>
                <select
                  value={mitarbeiterArbeitsmodell}
                  onChange={(event) => arbeitsmodellSetzen(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition focus:border-sky-300/40 focus:bg-black/40"
                >
                  <option value="100">100% · 42.5h · 5 Tage</option>
                  <option value="80">80% · 34h · 4 Tage</option>
                  <option value="manuell">Manuell</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-black text-white/65">Wochenstunden</span>
                <input
                  value={mitarbeiterWochenstunden}
                  onChange={(event) => {
                    setMitarbeiterWochenstunden(event.target.value);
                    setMitarbeiterArbeitsmodell("manuell");
                  }}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition focus:border-sky-300/40 focus:bg-black/40"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-white/65">Ferienwochen</span>
                <input
                  value={mitarbeiterFerienwochen}
                  onChange={(event) => setMitarbeiterFerienwochen(event.target.value)}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition focus:border-sky-300/40 focus:bg-black/40"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-white/65">Urlaubstage</span>
                <input
                  value={mitarbeiterUrlaubstage}
                  onChange={(event) => setMitarbeiterUrlaubstage(event.target.value)}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition focus:border-sky-300/40 focus:bg-black/40"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-white/65">Vertragsart</span>
                <select
                  value={mitarbeiterVertragsart}
                  onChange={(event) => setMitarbeiterVertragsart(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition focus:border-sky-300/40 focus:bg-black/40"
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
                <span className="text-sm font-black text-white/65">Pensum %</span>
                <input
                  value={mitarbeiterPensumProzent}
                  onChange={(event) => {
                    setMitarbeiterPensumProzent(event.target.value);
                    setMitarbeiterArbeitsmodell("manuell");
                  }}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition focus:border-sky-300/40 focus:bg-black/40"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-white/65">Arbeitstage / Woche</span>
                <input
                  value={mitarbeiterArbeitstageProWoche}
                  onChange={(event) => {
                    setMitarbeiterArbeitstageProWoche(event.target.value);
                    setMitarbeiterArbeitsmodell("manuell");
                  }}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition focus:border-sky-300/40 focus:bg-black/40"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-white/65">Freier Wochentag</span>
                <select
                  value={mitarbeiterFreierWochentag}
                  onChange={(event) => setMitarbeiterFreierWochentag(event.target.value)}
                  disabled={Number(mitarbeiterArbeitstageProWoche || 0) !== 4}
                  className={`mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition focus:border-sky-300/40 focus:bg-black/40 ${Number(mitarbeiterArbeitstageProWoche || 0) !== 4 ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <option value="">Kein freier Tag</option>
                  <option value="Montag">Montag</option>
                  <option value="Dienstag">Dienstag</option>
                  <option value="Mittwoch">Mittwoch</option>
                  <option value="Donnerstag">Donnerstag</option>
                  <option value="Freitag">Freitag</option>
                </select>
                <p className="mt-2 text-xs font-bold text-white/40">
                  Bei 80% zählt der freie Tag nicht als Minuszeit.
                </p>
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-5">
              <label className="block">
                <span className="text-sm font-black text-white/65">Eintrittsdatum</span>
                <input
                  value={mitarbeiterEintrittsdatum}
                  onChange={(event) => setMitarbeiterEintrittsdatum(event.target.value)}
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition focus:border-sky-300/40 focus:bg-black/40"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-white/65">Zeiterfassung ab</span>
                <input
                  value={mitarbeiterZeiterfassungAb}
                  onChange={(event) => setMitarbeiterZeiterfassungAb(event.target.value)}
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition focus:border-sky-300/40 focus:bg-black/40"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-white/65">Probezeit bis</span>
                <input
                  value={mitarbeiterProbezeitBis}
                  onChange={(event) => setMitarbeiterProbezeitBis(event.target.value)}
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition focus:border-sky-300/40 focus:bg-black/40"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-white/65">Austrittsdatum</span>
                <input
                  value={mitarbeiterAustrittsdatum}
                  onChange={(event) => setMitarbeiterAustrittsdatum(event.target.value)}
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition focus:border-sky-300/40 focus:bg-black/40"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-white/65">Überstunden Start</span>
                <input
                  value={mitarbeiterUeberstundenStart}
                  onChange={(event) => setMitarbeiterUeberstundenStart(event.target.value)}
                  inputMode="decimal"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition focus:border-sky-300/40 focus:bg-black/40"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-white/45">
                {mitarbeiterBearbeitenId
                  ? "Bearbeitungsmodus aktiv. Es wird kein neuer Login erstellt."
                  : "Mitarbeiter wird mit Login erstellt. Details können direkt hier bearbeitet werden."}
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                {mitarbeiterBearbeitenId && (
                  <button
                    type="button"
                    onClick={mitarbeiterFormZuruecksetzen}
                    className="rounded-2xl border border-white/10 bg-black/25 px-6 py-4 font-black text-white/60 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:text-white"
                  >
                    Abbrechen
                  </button>
                )}

                <button
                  type="button"
                  onClick={mitarbeiterSpeichern}
                  className="rounded-2xl border border-slate-200/25 bg-slate-200/10 px-6 py-4 font-black text-slate-100 shadow-lg shadow-slate-200/10 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/40 hover:bg-sky-300/5 hover:shadow-sky-300/10"
                >
                  {mitarbeiterBearbeitenId ? "✓ Mitarbeiter aktualisieren" : "+ Mitarbeiter speichern"}
                </button>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <div className="text-lg font-black text-white">Mitarbeiter bearbeiten</div>
                  <p className="mt-1 text-sm text-white/45">
                    Bestehende Mitarbeiter direkt ins Formular laden und aktualisieren.
                  </p>
                </div>

                <div className="text-xs font-black uppercase tracking-widest text-white/35">
                  {mitarbeiter.length} Personen
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {mitarbeiter.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-white/45">
                    Noch keine Mitarbeiter vorhanden.
                  </div>
                ) : (
                  mitarbeiter.map((person) => (
                    <div
                      key={person.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-sky-300/25 hover:bg-sky-300/5"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div>
                          <div className="text-lg font-black text-white">
                            {person.name}
                          </div>
                          <div className="mt-1 text-sm text-white/45">
                            {person.rolle || "Mitarbeiter"} · {Number(person.pensum_prozent || (Number(person.wochenstunden || 0) === 34 ? 80 : 100))}% · {Number(person.wochenstunden || 0)} h/Woche
                          </div>
                          <div className="mt-1 text-xs font-bold text-white/35">
                            {normalisiereArbeitstageProWoche(person)} Tage/Woche
                            {normalisiereFreierWochentag(person) ? ` · frei ${normalisiereFreierWochentag(person)}` : ""}
                          </div>
                          <div className="mt-1 text-xs font-bold text-white/35">
                            Zeiterfassung ab: {formatDatumInput(person.zeiterfassung_ab) || "Eintrittsdatum"}
                          </div>
                          <div className="mt-2 text-xs font-black uppercase tracking-widest text-slate-200">
                            {person.vertragsart || "Festangestellt"}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => mitarbeiterZumBearbeitenLaden(person)}
                          className="rounded-xl border border-slate-200/25 bg-slate-200/10 px-4 py-3 font-black text-slate-100 transition hover:-translate-y-1 hover:border-sky-300/40 hover:bg-sky-300/5"
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
        )}
      </section>

      <section className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-4">
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
          label="Überstundenabbau"
          value={
            loading
              ? "..."
              : teamUeberstundenAbbauStunden > 0
              ? formatStunden(-teamUeberstundenAbbauStunden)
              : "0 min"
          }
          orange
        />

        <KpiCard
          label="Team Überstunden"
          value={
            loading
              ? "..."
              : formatStunden(teamDifferenz, true)
          }
          green={teamDifferenz >= 0}
          red={teamDifferenz < 0}
        />
      </section>

      

      <section className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Team Sollstunden"
          value={loading ? "..." : formatStunden(teamSollstunden)}
        />

        <KpiCard label="Arbeitstage bis heute" value={loading ? "..." : arbeitstage} />

        <KpiCard
          label="Mitarbeiter"
          value={loading ? "..." : mitarbeiter.length}
        />

        <KpiCard
          label="Offene Anträge"
          value={loading ? "..." : offeneAntraege}
          orange={offeneAntraege > 0}
        />

        <KpiCard
  label="Offene Tage"
  value={loading ? "..." : offeneTage}
  orange={offeneTage > 0}
/>

<KpiCard
  label="Abgeschlossen"
  value={loading ? "..." : abgeschlosseneTage}
/>

<KpiCard
  label="Geprüft"
  value={loading ? "..." : gepruefteTage}
  green={gepruefteTage > 0}
/>
      </section>

      <section className="min-h-[150px] rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
  <div className="mb-6">
    <h2 className="text-2xl font-black text-white">
      Prüfzentrum
    </h2>
    <p className="mt-1 text-white/55">
      Tage prüfen, freigeben und sauber abschließen.
    </p>
  </div>

  {abgeschlosseneTageListe.length === 0 ? (
    <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-white/55">
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
            className="rounded-2xl border border-slate-200/20 bg-gradient-to-br from-slate-200/10 to-black/25 p-5"
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="text-lg font-black text-white">
                  {tag.mitarbeiterName}
                </div>

                <div className="mt-1 text-sm text-white/55">
                  {tag.datum} · Tagesabschluss {formatStunden(Number(tag.netto_stunden || 0))}
                </div>

                <div className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-200">
                  Status: {tag.status}
                </div>
              </div>

              <button
                type="button"
                onClick={() => tagAlsGeprueftMarkieren(tag.id)}
                className="rounded-xl border border-slate-200/25 bg-slate-200/10 px-5 py-3 font-black text-slate-100 shadow-lg shadow-slate-200/10 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/40 hover:bg-sky-300/5 hover:shadow-sky-300/10"
              >
                ✓ Freigeben
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-sky-200">
                    Aufträge zur Prüfung
                  </div>
                  <div className="mt-1 text-sm text-white/45">
                    Nicht nur Gesamtzeit: Hier siehst du die gebuchten Aufträge, Bereiche und Zeiten.
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-200">
                  {pruefEintraege.length} Buchung{pruefEintraege.length === 1 ? "" : "en"} · {formatStunden(pruefSumme)}
                </div>
              </div>

              {pruefEintraege.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/45">
                  Keine Projektbuchungen für diesen Tagesabschluss gefunden.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {pruefEintraege.map((eintrag) => (
                    <div
                      key={`${tag.id}-${eintrag.id}`}
                      className="rounded-xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-sky-300/25 hover:bg-sky-300/5"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <div className="text-base font-black text-white">
                            {eintrag.projekt || "Ohne Auftrag"}
                          </div>
                          <div className="mt-1 text-sm text-white/50">
                            Bereich: <span className="font-bold text-white/75">{eintrag.bereich || "Ohne Bereich"}</span>
                          </div>
                          {String(eintrag.projekt || "").toLowerCase() === "betriebsunterhalt" && (
                            <div className="mt-2 inline-flex rounded-full border border-slate-200/20 bg-slate-200/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-200">
                              Automatisch
                            </div>
                          )}
                        </div>

                        <div className="text-left sm:text-right">
                          <div className="text-xl font-black text-sky-200">
                            {formatStunden(Number(eintrag.stunden || 0))}
                          </div>
                          <div className="mt-1 text-sm font-bold text-white/55">
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

<section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
  <button
    type="button"
    onClick={() => setGepruefteOffen(!gepruefteOffen)}
    className="flex w-full items-center justify-between gap-4 text-left"
  >
    <div>
      <h2 className="text-2xl font-black text-white">
        Freigabehistorie
      </h2>

      <p className="mt-1 text-white/55">
        Zuletzt freigegebene und geprüfte Arbeitstage.
      </p>
    </div>

    <div className="rounded-xl border border-slate-200/30 bg-slate-200/10 px-4 py-3 text-sm font-black text-slate-200">
      {gepruefteOffen ? "Schließen ▲" : "Historie öffnen ▼"}
    </div>
  </button>

  {gepruefteOffen && (
    <div className="mt-6">
      {letzteGepruefteTage.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-white/55">
          Noch keine Freigaben vorhanden.
        </div>
      ) : (
        <>
        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
          {sichtbareFreigaben.map((tag) => (
            <div
              key={tag.id}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-black/25 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <div className="text-base font-black text-white">
                    {tag.mitarbeiterName}
                  </div>

                  <div className="mt-1 text-sm text-white/55">
                    {tag.datum} · {formatStunden(Number(tag.netto_stunden || 0))}
                  </div>

                  <div className="mt-2 text-xs font-bold uppercase tracking-widest text-green-400">
                    Status: Geprüft
                  </div>
                </div>

                <div className="text-sm text-white/60 md:text-right">
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
            className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 font-black text-white/70 transition hover:border-sky-300/30 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ◀
          </button>

          <div className="text-sm font-black uppercase tracking-widest text-white/45">
            Seite {freigabeSeite} / {freigabeSeiten}
          </div>

          <button
            type="button"
            onClick={() =>
              setFreigabeSeite((s) => Math.min(freigabeSeiten, s + 1))
            }
            disabled={freigabeSeite === freigabeSeiten}
            className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 font-black text-white/70 transition hover:border-sky-300/30 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-30"
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
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-black/30">
          <div className="mb-7">
            <h2 className="text-2xl font-black text-white">
              Abwesenheiten diesen Monat
            </h2>
            <p className="mt-1 text-white/55">
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

        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.025] p-7 shadow-2xl shadow-black/30">
          <div className="mb-7">
            <h2 className="text-2xl font-black text-white">Schnellzugriff</h2>
            <p className="mt-1 text-white/55">Wichtige Adminbereiche</p>
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
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-black/30">
          <div className="mb-7">
            <h2 className="text-2xl font-black text-white">Top Projekte</h2>
            <p className="mt-1 text-white/55">Stärkste Projektbelastung im aktuellen Monat</p>
          </div>

          {topProjekte.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-white/55">
              Noch keine Projektstunden vorhanden.
            </div>
          ) : (
            <div className="space-y-4">
              {topProjekte.map((projekt, index) => {
                const max = Math.max(...topProjekte.map((p) => Number(p.stunden || 0)), 1);
                const percent = Math.min(100, Math.round((Number(projekt.stunden || 0) / max) * 100));

                return (
                  <div key={projekt.name} className="rounded-2xl border border-white/10 bg-black/25 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-300">
                          #{index + 1}
                        </div>
                        <div className="mt-2 text-xl font-black text-white">{projekt.name}</div>
                        <div className="mt-1 text-sm text-white/45">{projekt.kunde || "Kein Kunde"}</div>
                      </div>

                      <div className="text-3xl font-black text-slate-100">
                        {formatStunden(Number(projekt.stunden || 0))}
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-slate-200/80 to-slate-100/80 shadow-lg shadow-slate-200/10" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-black/30">
          <div className="mb-7">
            <h2 className="text-2xl font-black text-white">Kontrollstatus</h2>
            <p className="mt-1 text-white/55">Was Aufmerksamkeit braucht</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MiniCard label="Offene Tage" value={offeneTage} orange={offeneTage > 0} />
            <MiniCard label="Zur Prüfung" value={abgeschlosseneTage} orange={abgeschlosseneTage > 0} />
            <MiniCard label="Offene Anträge" value={offeneAntraege} orange={offeneAntraege > 0} />
            <MiniCard label="Geprüft" value={gepruefteTage} />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-black/30">
        <div className="mb-7">
          <h2 className="text-2xl font-black text-white">Top Bereiche</h2>
          <p className="mt-1 text-white/55">Werkstatt, Montage, Planung und Logistik sauber im Blick</p>
        </div>

        {topBereiche.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-white/55">
            Noch keine Bereichsstunden vorhanden.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {topBereiche.map((bereich, index) => (
              <div
                key={bereich.name}
                className="rounded-2xl border border-white/10 bg-black/25 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:shadow-lg hover:shadow-sky-300/10"
              >
                <div className="text-xs font-black uppercase tracking-[0.22em] text-slate-200">
                  #{index + 1}
                </div>
                <div className="mt-3 text-xl font-black text-white">{bereich.name}</div>
                <div className="mt-3 text-3xl font-black text-slate-100">
                  {formatStunden(bereich.stunden)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      
      </DropdownPanel>

      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-black/30">
  <div className="mb-7">
    <h2 className="text-2xl font-black text-white">
      Team Status
    </h2>

    <p className="mt-1 text-white/55">
      Live Übersicht für den heutigen Arbeitstag
    </p>
  </div>

  <div className="space-y-3">
    {teamStatus.map((person) => (
      <div
        key={person.name}
        className="flex items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r from-black/30 to-white/[0.03] p-4 transition hover:border-sky-300/25"
      >
        <div className="flex items-center gap-4">
          <span className={`h-3 w-3 rounded-full ${person.punkt}`} />

          <div>
            <div className="text-lg font-black text-white">
              {person.name}
            </div>

            <div className="text-sm text-white/45">
              {person.rolle}
            </div>
          </div>
        </div>

        <div className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${person.farbe}`}>
          {person.status}
        </div>
      </div>
    ))}
  </div>
</section>

      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
        <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black text-white">
              Team Performance
            </h2>
            <p className="mt-1 text-white/55">
              Leistung, Arbeitszeit und Überstunden im Überblick
            </p>
          </div>

          <div className="text-sm text-white/50">
            Monat {monat} · {mitarbeiterStats.length} Mitarbeiter
          </div>
        </div>

        <div className="space-y-4 md:hidden">
          {mitarbeiterStats.map((person) => {
            const detailsOffen = String(teamDetailsOffenId || "") === String(person.id);

            return (
              <div
                key={person.id}
                className="rounded-2xl border border-white/10 bg-black/25 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setTeamDetailsOffenId(detailsOffen ? null : person.id)}
                    className="min-w-0 text-left"
                  >
                    <div className="text-xl font-black text-white hover:text-sky-100">
                      {person.name}
                    </div>
                    <div className="mt-1 text-sm text-white/55">
                      {person.rolle} · Details {detailsOffen ? "ausblenden" : "anzeigen"}
                    </div>
                  </button>

                  <span
                    className={`rounded-full border px-3 py-1 text-sm font-black ${
                      person.differenz >= 0
                        ? "border-green-400/30 bg-green-500/10 text-green-300"
                        : "border-red-400/30 bg-red-500/10 text-red-300"
                    }`}
                  >
                    {formatStunden(Number(person.differenz || 0), true)}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <Info label="Arbeitstage" value={person.personArbeitstage} />
                  <Info
                    label="Soll"
                    value={formatStunden(Number(person.sollstunden || 0))}
                  />
                  <Info label="Ist" value={formatStunden(Number(person.iststunden || 0))} />
                  <Info
                    label="Angerechnet"
                    value={formatStunden(Number(person.angerechneteStunden || 0))}
                  />
                  <Info label="Urlaub" value={person.urlaubstagePerson} />
                  <Info label="Krank" value={person.kranktagePerson} />
                  <Info
                    label="ÜA Stunden"
                    value={formatStunden(-Number(person.ueberstundenAbbauStunden || 0))}
                    orange
                  />
                </div>

                {detailsOffen && <MitarbeiterDetail person={person} formatStunden={formatStunden} />}
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-white/10 md:block">
          <div className="overflow-x-auto">
            <div className="min-w-[1250px]">
              <div className="grid grid-cols-9 border-b border-white/10 bg-black/20 px-5 py-4 text-sm font-bold uppercase tracking-wide text-white/50">
                <div>Name</div>
                <div>Rolle</div>
                <div>Arbeitstage</div>
                <div>Soll</div>
                <div>Ist</div>
                <div>Angerechnet</div>
                <div>Überstunden</div>
                <div>Abwesenheit</div>
                <div>ÜA Abbau</div>
              </div>

              {mitarbeiterStats.map((person) => {
                const detailsOffen = String(teamDetailsOffenId || "") === String(person.id);

                return (
                  <div key={person.id} className="border-b border-white/10">
                    <div className="grid grid-cols-9 items-center px-5 py-4 text-white/80 transition hover:bg-white/[0.03]">
                      <button
                        type="button"
                        onClick={() => setTeamDetailsOffenId(detailsOffen ? null : person.id)}
                        className="text-left text-lg font-black text-white transition hover:text-sky-100"
                      >
                        {detailsOffen ? "▾" : "▸"} {person.name}
                      </button>
                      <div>{person.rolle}</div>
                      <div>{person.personArbeitstage}</div>
                      <div>{formatStunden(Number(person.sollstunden || 0))}</div>
                      <div>{formatStunden(Number(person.iststunden || 0))}</div>

                      <div className="text-lg font-black text-white">
                        {formatStunden(Number(person.angerechneteStunden || 0))}
                      </div>

                      <div
                        className={`font-black ${
                          Number(person.differenz || 0) >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {formatStunden(Number(person.differenz || 0), true)}
                      </div>

                      <div>
                        U: {person.urlaubstagePerson} / K:{" "}
                        {person.kranktagePerson}
                      </div>

                      <div className="font-black text-slate-100">
                      {formatStunden(-Number(person.ueberstundenAbbauStunden || 0))}
                      </div>
                    </div>

                    {detailsOffen && <MitarbeiterDetail person={person} formatStunden={formatStunden} desktop />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <DropdownPanel
        id="projektuebersicht"
        title="Projektübersicht"
        eyebrow="Projektliste · Kunde · Stunden"
        description="Die Projektübersicht ist jetzt als Dropdown im Chef Dashboard und bleibt sauber eingeklappt."
        open={projektUebersichtOffen}
        onToggle={() => setProjektUebersichtOffen(!projektUebersichtOffen)}
      >
<section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
        <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black text-white">
              Projektübersicht
            </h2>
            <p className="mt-1 text-white/55">
              Aktuelle Projektbelastung im laufenden Monat
            </p>
          </div>

          <div className="text-sm text-white/50">
            {projektStunden.length} Projekte
          </div>
        </div>

        <div className="space-y-4 md:hidden">
          {projektStunden.map((projekt) => (
            <div
              key={projekt.name}
              className="rounded-2xl border border-white/10 bg-black/25 p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-black text-white">
                    {projekt.name}
                  </div>
                  <p className="mt-1 text-sm text-white/55">
                    Kunde: {projekt.kunde || "-"}
                  </p>
                </div>

                <div className="font-black text-slate-100">
                  {formatStunden(Number(projekt.stunden || 0))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-white/10 md:block">
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-3 border-b border-white/10 bg-black/20 px-5 py-4 text-sm font-bold uppercase tracking-wide text-white/50">
                <div>Projekt</div>
                <div>Kunde</div>
                <div>Stunden</div>
              </div>

              {projektStunden.map((projekt) => (
                <div
                  key={projekt.name}
                  className="grid grid-cols-3 items-center border-b border-white/10 px-5 py-4 text-white/80 transition hover:bg-white/[0.03]"
                >
                  <div className="text-lg font-black text-white">{projekt.name}</div>
                  <div className="text-sm text-white/55">{projekt.kunde || "-"}</div>
                  <div className="font-black text-slate-100">
                    {formatStunden(Number(projekt.stunden || 0))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      </DropdownPanel>
    </main>
  );
}

function KpiCard({
  label,
  value,
  orange,
  green,
  red,
}: {
  label: string;
  value: string | number;
  orange?: boolean;
  green?: boolean;
  red?: boolean;
}) {
  const color = green
    ? "text-green-400"
    : red
    ? "text-red-400"
    : orange
    ? "text-slate-200"
    : "text-slate-100";

  return (
  <div className="group rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-sky-300/10">
      <div className={`text-4xl font-black md:text-5xl ${color}`}>
        {value}
      </div>

      <div className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-white/45">
        {label}
      </div>

      <div className="mt-5 h-1 w-16 rounded-full bg-white/30 transition-all duration-300 group-hover:w-24 group-hover:bg-sky-200/70" />
    </div>
  );
}


function HeroMini({
  label,
  value,
  orange,
  green,
}: {
  label: string;
  value: string | number;
  orange?: boolean;
  green?: boolean;
}) {
  const color = orange
    ? "text-slate-200"
    : green
    ? "text-green-400"
    : "text-slate-100";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center transition hover:border-sky-300/25 hover:bg-sky-300/5">
      <div className={`text-xl font-black leading-tight md:text-2xl ${color}`}>{value}</div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/45">
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
    <div className="rounded-xl border border-white/10 bg-black/25 p-5 transition hover:border-sky-300/25 hover:bg-sky-300/5">
      <div className="text-sm font-bold text-white/50">{label}</div>
      <div
        className={`mt-3 text-4xl font-black ${
          orange ? "text-slate-200" : "text-slate-100"
        }`}
      >
        {value}
      </div>
    </div>
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

function QuickLink({ href, label, orange, onClick }: { href: string; label: string; orange?: boolean; onClick?: () => void }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`block rounded-xl border p-4 font-black transition-all duration-300 hover:-translate-y-1 ${
        orange
          ? "border-slate-200/20 bg-white/[0.03] text-slate-100 hover:border-slate-200/35 hover:bg-sky-300/5"
          : "border-white/10 bg-white/[0.03] text-white hover:border-sky-300/25 hover:bg-sky-300/5 hover:text-slate-100"
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
      <div className="rounded-2xl border border-sky-300/20 bg-sky-300/[0.04] p-5">
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Info label="Echte Tageszeit" value={formatStunden(Number(person.iststunden || 0))} />
          <Info label="Projektzeit" value={formatStunden(Number(person.projektStundenOhneBetriebsunterhalt || 0))} />
          <Info label="Betriebsunterhalt" value={formatStunden(Number(person.betriebsunterhaltStunden || 0))} />
          <Info label="Alle Buchungen" value={formatStunden(Number(person.projektStundenGebucht || 0))} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-white/40">
              Tage · Von/Bis · Netto · Status
            </div>

            {tagesliste.length === 0 ? (
              <div className="text-sm font-bold text-white/40">
                Noch keine abgeschlossenen Tageszeiten in diesem Zeitraum.
              </div>
            ) : (
              <div className="space-y-2">
                {tagesliste.map((tag: any) => (
                  <div
                    key={`${person.id}-${tag.id || tag.datum}`}
                    className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-sm text-white/70 md:grid-cols-[1fr_0.9fr_0.8fr_0.8fr]"
                  >
                    <div className="font-black text-white">{tag.datum}</div>
                    <div>
                      {String(tag.startzeit || "").slice(0, 5) || "--:--"} - {String(tag.endzeit || "").slice(0, 5) || "--:--"}
                    </div>
                    <div className="font-black text-sky-100">
                      {formatStunden(Number(tag.netto_stunden || 0))}
                    </div>
                    <div className="text-white/45">
                      {tag.status || "-"} · {tag.buchungen || 0} Buch.
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-white/40">
              Projektverteilung
            </div>

            {projektSummen.length === 0 ? (
              <div className="text-sm font-bold text-white/40">
                Noch keine Projektbuchungen in diesem Zeitraum.
              </div>
            ) : (
              <div className="space-y-2">
                {projektSummen.map((projekt: any) => (
                  <div
                    key={`${person.id}-${projekt.projektName}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3"
                  >
                    <div className="min-w-0 truncate text-sm font-black text-white">
                      {projekt.projektName}
                    </div>
                    <div className="shrink-0 text-sm font-black text-sky-100">
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
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <div className="text-xs text-white/45">{label}</div>
      <div
        className={`mt-1 font-bold ${
          orange ? "text-slate-200" : "text-slate-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
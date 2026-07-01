"use client";

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";

function heuteDatum() {
  const heute = new Date();
  const year = heute.getFullYear();
  const month = String(heute.getMonth() + 1).padStart(2, "0");
  const day = String(heute.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ArbeitszeitenPage() {
  const [zeiten, setZeiten] = useState<any[]>([]);
  const [projekte, setProjekte] = useState<any[]>([]);
  const [bereich, setBereich] = useState("");
  const [projektBereiche, setProjektBereiche] = useState<any[]>([]);
  const [tageszeiten, setTageszeiten] = useState<any[]>([]);
  const [offeneTage, setOffeneTage] = useState<string[]>([]);
  const [offeneDetails, setOffeneDetails] = useState<string[]>([]);

  const [datum, setDatum] = useState(
  heuteDatum()
);
  const [projekt, setProjekt] = useState("");
  const [projektId, setProjektId] = useState<number | null>(null);
  const [stunden, setStunden] = useState("");
  const [vonZeit, setVonZeit] = useState("");
  const [bisZeit, setBisZeit] = useState("");

  const [pauseStop, setPauseStop] = useState("0");
  const [timerJetzt, setTimerJetzt] = useState(new Date());

  const [manuellDatum, setManuellDatum] = useState(
    heuteDatum()
  );
  const [manuellStart, setManuellStart] = useState("07:00");
  const [manuellEnde, setManuellEnde] = useState("");
  const [manuellPause, setManuellPause] = useState("0");
  const FIXPAUSE_MINUTEN = 15;

  const standardBereiche = [
    "Werkstatt",
    "Montage",
    "Logistik",
    "Planung",
    "Lieferung",
    "Aufräumen",
    "Sonstiges",
  ];

  const [saving, setSaving] = useState(false);
  const [meldung, setMeldung] = useState("");
  const [bearbeitenId, setBearbeitenId] = useState<string | number | null>(null);
  const [arbeitstagOffen, setArbeitstagOffen] = useState(true);
  const [manuellOffen, setManuellOffen] = useState(false);
  const [buchungOffen, setBuchungOffen] = useState(true);
  const [zusammenfassungOffen, setZusammenfassungOffen] = useState(true);
  const [datumSuche, setDatumSuche] = useState(heuteDatum());

  async function ladeDaten() {
    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: zeitData, error: zeitError } = await supabase
      .from("arbeitszeiten")
      .select("*")
      .eq("user_id", user.id)
      .order("datum", { ascending: false })
      .order("id", { ascending: false });

    if (zeitError) {
      setMeldung(zeitError.message);
      console.log(zeitError);
    }

    if (zeitData) setZeiten(zeitData);

    const { data: tageszeitenData, error: tageszeitenError } = await supabase
      .from("tageszeiten")
      .select("*")
      .eq("user_id", user.id);

    if (tageszeitenError) {
      setMeldung(tageszeitenError.message);
      console.log(tageszeitenError);
    }

    if (tageszeitenData) setTageszeiten(tageszeitenData);

    const { data: projektData, error: projektError } = await supabase
      .from("projekte")
      .select("*")
      .order("name", { ascending: true });

    if (projektError) {
      setMeldung(projektError.message);
      console.log(projektError);
    }

    if (projektData) {
  const aktiveProjekte = projektData.filter(
    (p) =>
      p.status !== "Abgeschlossen" &&
      p.name !== "Betriebsunterhalt"
  );

  setProjekte(aktiveProjekte);
}
  }

  useEffect(() => {
    ladeDaten();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerJetzt(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  function formatDateLocal(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
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

  function projektAnzeige(projektItem: any) {
    const name = projektItem.name || "";
    const kommission = projektItem.kommission || "";
    const kunde = projektItem.kunde || "";

    if (!name && kunde && kommission) return `${kunde} - ${kommission}`;
    if (!name) return kommission || kunde || "Ohne Projekt";

    if (
      kommission &&
      kommission !== "NULL" &&
      name.toLowerCase().includes(kommission.toLowerCase())
    ) {
      return name;
    }

    if (kunde === "Intern") return name;

    if (kommission && kommission !== "NULL") {
      return `${name} - ${kommission}`;
    }

    return name;
  }

  function kundeFuerProjekt(projektName: string) {
  if (projektName === "Betriebsunterhalt") {
    return "Intern";
  }

  const gefunden = projekte.find(
    (p) => p.name === projektName || projektAnzeige(p) === projektName
  );

  return gefunden?.kunde || "Kein Kunde hinterlegt";
}


  function normalisiereBereiche(wert: any): string[] {
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
        // Falls Supabase den Wert als normalen Text speichert, nutzen wir Komma-Trennung.
      }

      return sauber
        .split(",")
        .map((eintrag) => eintrag.trim())
        .filter(Boolean);
    }

    return [];
  }

  function bereicheAlsOptionen(bereicheListe: string[]) {
    return bereicheListe.map((name, index) => ({
      id: `projekt-bereich-${index}-${name}`,
      bereich: name,
    }));
  }

  async function ladeProjektBereicheById(
    projektIdWert: number | null,
    vorauswahlBereich = ""
  ) {
    setBereich(vorauswahlBereich);

    if (!projektIdWert) {
      setProjektBereiche([]);
      return;
    }

    const projektObj = projekte.find(
      (p) => Number(p.id) === Number(projektIdWert)
    );

    let bereicheVomProjekt = normalisiereBereiche(
      projektObj?.erlaubte_bereiche
    );

    if (bereicheVomProjekt.length === 0) {
      bereicheVomProjekt = normalisiereBereiche(projektObj?.bereiche);
    }

    if (bereicheVomProjekt.length > 0) {
      setProjektBereiche(bereicheAlsOptionen(bereicheVomProjekt));
      return;
    }

    const { data, error } = await supabase
      .from("projekt_bereiche")
      .select("*")
      .eq("projekt_id", projektIdWert)
      .order("bereich", { ascending: true });

    if (error) {
      console.log("PROJEKT BEREICHE FEHLER:", error);
      setProjektBereiche(bereicheAlsOptionen(standardBereiche));
      return;
    }

    if (data && data.length > 0) {
      setProjektBereiche(data);
      return;
    }

    setProjektBereiche(bereicheAlsOptionen(standardBereiche));
  }

  async function betriebsunterhaltSpeichern(
    userId: string,
    datumWert: string,
    stundenWert: number
  ) {
    const saubererWert = Number(Number(stundenWert || 0).toFixed(2));

    const { data: tageszeitFuerBetriebsunterhalt } = await supabase
      .from("tageszeiten")
      .select("id, startzeit, endzeit, pause")
      .eq("user_id", userId)
      .eq("datum", datumWert)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    const zeitPayload = {
      startzeit: tageszeitFuerBetriebsunterhalt?.startzeit || null,
      endzeit: tageszeitFuerBetriebsunterhalt?.endzeit || null,
      pause: Number(tageszeitFuerBetriebsunterhalt?.pause || 0),
    };

    const { data: vorhandenerBetriebsunterhalt, error: sucheError } =
      await supabase
        .from("arbeitszeiten")
        .select("*")
        .eq("user_id", userId)
        .eq("datum", datumWert)
        .eq("projekt", "Betriebsunterhalt")
        .maybeSingle();

    if (sucheError) {
      console.log("BETRIEBSUNTERHALT SUCHE FEHLER:", sucheError);
      throw sucheError;
    }

    if (saubererWert <= 0) {
      if (vorhandenerBetriebsunterhalt) {
        const { error } = await supabase
          .from("arbeitszeiten")
          .delete()
          .eq("id", vorhandenerBetriebsunterhalt.id);

        if (error) {
          console.log("BETRIEBSUNTERHALT DELETE FEHLER:", error);
          throw error;
        }
      }

      return;
    }

    if (vorhandenerBetriebsunterhalt) {
      const { error } = await supabase
        .from("arbeitszeiten")
        .update({
          stunden: saubererWert,
          ...zeitPayload,
        })
        .eq("id", vorhandenerBetriebsunterhalt.id);

      if (error) {
        console.log("BETRIEBSUNTERHALT UPDATE FEHLER:", error);
        throw error;
      }

      return;
    }

    const { error } = await supabase.from("arbeitszeiten").insert({
      user_id: userId,
      datum: datumWert,
      projekt: "Betriebsunterhalt",
      bereich: "Betriebsunterhalt",
      stunden: saubererWert,
      auto_generiert: true,
      ...zeitPayload,
    });

    if (error) {
      console.log("BETRIEBSUNTERHALT INSERT FEHLER:", error);
      throw error;
    }
  }

  async function betriebsunterhaltNeuBerechnen(userId: string, datumWert: string) {
  const { data: tag, error: tagError } = await supabase
    .from("tageszeiten")
    .select("*")
    .eq("user_id", userId)
    .eq("datum", datumWert)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (tagError) {
    console.log("BETRIEBSUNTERHALT TAGESZEIT FEHLER:", tagError);
    throw tagError;
  }

  if (!tag) return;

  const { data: zeiten, error: zeitenError } = await supabase
    .from("arbeitszeiten")
    .select("*")
    .eq("user_id", userId)
    .eq("datum", datumWert);

  if (zeitenError) {
    console.log("BETRIEBSUNTERHALT ZEITEN FEHLER:", zeitenError);
    throw zeitenError;
  }

  const projektStunden =
    zeiten
      ?.filter((z) => z.projekt !== "Betriebsunterhalt" && !z.auto_generiert)
      .reduce((sum, z) => sum + Number(z.stunden || 0), 0) || 0;

  const betriebsunterhalt = Math.max(
    0,
    Number(tag.netto_stunden || 0) - projektStunden
  );

  await betriebsunterhaltSpeichern(userId, datumWert, betriebsunterhalt);
}

async function pruefeProjektUeberbuchung({
  userId,
  datumWert,
  neueStunden,
  ausnahmeId,
}: {
  userId: string;
  datumWert: string;
  neueStunden: number;
  ausnahmeId?: string | number | null;
}) {
  const { data: tag, error: tagError } = await supabase
    .from("tageszeiten")
    .select("id, netto_stunden")
    .eq("user_id", userId)
    .eq("datum", datumWert)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (tagError) {
    console.log("UEBERBUCHUNG TAGESZEIT FEHLER:", tagError);
    throw tagError;
  }

  // Ohne Tagesabschluss kennt die App die echte Nettozeit noch nicht.
  // Projektbuchungen dürfen trotzdem gespeichert werden.
  // Ein Tagesabschluss wird aber NICHT automatisch aus Projektbuchungen erzeugt.
  if (!tag) return;

  const nettoStunden = Number(tag.netto_stunden || 0);
  if (!Number.isFinite(nettoStunden) || nettoStunden <= 0) return;

  const { data: vorhandeneBuchungen, error: buchungenError } = await supabase
    .from("arbeitszeiten")
    .select("id, projekt, auto_generiert, stunden")
    .eq("user_id", userId)
    .eq("datum", datumWert);

  if (buchungenError) {
    console.log("UEBERBUCHUNG BUCHUNGEN FEHLER:", buchungenError);
    throw buchungenError;
  }

  const bestehendeProjektStunden =
    vorhandeneBuchungen
      ?.filter(
        (eintrag) =>
          eintrag.projekt !== "Betriebsunterhalt" &&
          !eintrag.auto_generiert &&
          String(eintrag.id) !== String(ausnahmeId || "")
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0) || 0;

  const neueProjektSumme = bestehendeProjektStunden + Number(neueStunden || 0);
  const differenz = neueProjektSumme - nettoStunden;

  if (differenz > 0.01) {
    throw new Error(
      `Projektzeit überschreitet den Arbeitstag um ${formatStunden(differenz)}. Netto-Arbeitstag: ${formatStunden(
        nettoStunden
      )}, Projektzeiten neu: ${formatStunden(
        neueProjektSumme
      )}. Bitte Buchung korrigieren.`
    );
  }
}

async function tagesabschlussAusBuchungenAktualisieren(
  userId: string,
  datumWert: string
) {
  const { data: vorhandenerTag, error: tagError } = await supabase
    .from("tageszeiten")
    .select("id")
    .eq("user_id", userId)
    .eq("datum", datumWert)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (tagError) {
    console.log("TAGESABSCHLUSS SUCHE FEHLER:", tagError);
    throw tagError;
  }

  // Wichtig: Projektbuchungen dürfen gespeichert werden,
  // aber sie dürfen keinen Tagesabschluss automatisch erzeugen.
  // Betriebsunterhalt wird nur berechnet, wenn Start/Stop oder manueller Tag existiert.
  if (!vorhandenerTag) return;

  await betriebsunterhaltNeuBerechnen(userId, datumWert);
}

  async function startArbeitstag() {
    setMeldung("");

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;
    if (!user) return;

    const heute = formatDateLocal(new Date());
    const jetzt = new Date().toTimeString().slice(0, 8);

    const { data: vorhandenerTag, error: sucheError } = await supabase
      .from("tageszeiten")
      .select("*")
      .eq("user_id", user.id)
      .eq("datum", heute)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sucheError) {
      setMeldung(sucheError.message);
      return;
    }

    if (vorhandenerTag) {
      setMeldung(
        vorhandenerTag.status === "Offen"
          ? "Arbeitstag läuft bereits."
          : "Für heute wurde bereits ein Arbeitstag erfasst. Bitte nicht erneut starten. Nutze bei Korrekturen den manuellen Eintrag."
      );
      await ladeDaten();
      return;
    }

    const { data: tagVorStart, error: tagVorStartError } = await supabase
      .from("tageszeiten")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("datum", heute)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tagVorStartError) {
      setMeldung(tagVorStartError.message);
      return;
    }

    if (tagVorStart) {
      setMeldung(
        tagVorStart.status === "Offen"
          ? "Arbeitstag läuft bereits."
          : "Für heute wurde bereits ein Arbeitstag erfasst. Bitte nicht erneut starten."
      );
      await ladeDaten();
      return;
    }

    const { error } = await supabase.from("tageszeiten").insert({
      user_id: user.id,
      datum: heute,
      startzeit: jetzt,
      pause: 0,
      netto_stunden: 0,
      status: "Offen",
    });

    if (error) {
      setMeldung(error.message);
      return;
    }

    setMeldung("Arbeitstag gestartet.");
    await ladeDaten();
  }

  async function stopArbeitstag() {
    setMeldung("");

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;
    if (!user) return;

    const heute = formatDateLocal(new Date());
    const jetztString = new Date().toTimeString().slice(0, 8);
    const pauseStunden = Number(pauseStop || 0);

    const { data: tageszeit, error: tageszeitError } = await supabase
      .from("tageszeiten")
      .select("*")
      .eq("user_id", user.id)
      .eq("datum", heute)
      .eq("status", "Offen")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tageszeitError) {
      setMeldung(tageszeitError.message);
      return;
    }

    if (!tageszeit) {
      setMeldung("Kein gestarteter Arbeitstag gefunden.");
      return;
    }

    const start = new Date(`${heute}T${tageszeit.startzeit}`);
    const ende = new Date(`${heute}T${jetztString}`);
    const bruttoStunden = (ende.getTime() - start.getTime()) / 1000 / 60 / 60;
    const nettoStunden = Math.max(0, bruttoStunden - pauseStunden);

    const { data: heutigeZeiten, error: zeitenError } = await supabase
      .from("arbeitszeiten")
      .select("*")
      .eq("user_id", user.id)
      .eq("datum", heute);

    if (zeitenError) {
      setMeldung(zeitenError.message);
      console.log(zeitenError);
      return;
    }

    const projektStunden =
      heutigeZeiten
        ?.filter(
          (eintrag) =>
            eintrag.projekt !== "Betriebsunterhalt" && !eintrag.auto_generiert
        )
        .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0) || 0;

    const differenzProjektZuTag = projektStunden - nettoStunden;

    if (differenzProjektZuTag > 0.01) {
      setMeldung(
        `Arbeitstag kann nicht beendet werden: Projektzeit überschreitet die Nettozeit um ${formatStunden(
          differenzProjektZuTag
        )}. Netto: ${formatStunden(nettoStunden)}, Projektzeiten: ${formatStunden(
          projektStunden
        )}. Bitte Projektbuchungen oder Pause korrigieren.`
      );
      return;
    }

    const betriebsunterhalt = Math.max(0, nettoStunden - projektStunden);

    const { error: updateError } = await supabase
      .from("tageszeiten")
      .update({
  endzeit: jetztString,
  pause: pauseStunden,
  zusatzpause_minuten: 0,
  netto_stunden: Number(nettoStunden.toFixed(2)),
  status: "Abgeschlossen",
})
      .eq("id", tageszeit.id);

    if (updateError) {
      setMeldung(updateError.message);
      return;
    }

    try {
      await betriebsunterhaltSpeichern(user.id, heute, betriebsunterhalt);
    } catch (error: any) {
      console.log("BETRIEBSUNTERHALT STOP FEHLER:", error);
      setMeldung(error?.message || "Betriebsunterhalt konnte nicht gespeichert werden.");
      return;
    }

    setDatumSuche(heute);
    setZusammenfassungOffen(true);

    setMeldung(
      `Arbeitstag beendet. Netto: ${nettoStunden.toFixed(
        2
      )}h · Betriebsunterhalt: ${betriebsunterhalt.toFixed(2)}h`
    );

    setPauseStop("0");
    await ladeDaten();
  }

  async function arbeitstagManuellSpeichern() {
    setMeldung("");

    if (!manuellDatum || !manuellStart || !manuellEnde) {
      setMeldung("Bitte Datum, Start und Ende ausfüllen.");
      return;
    }

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;
    if (!user) return;

    const zusatzPauseMinuten = Number(manuellPause || 0);

const gesamtPauseMinuten =
  FIXPAUSE_MINUTEN + zusatzPauseMinuten;

const pauseStunden =
  gesamtPauseMinuten / 60;
    const start = new Date(`${manuellDatum}T${manuellStart}`);
const ende = new Date(`${manuellDatum}T${manuellEnde}`);

const jetzt = new Date();

if (
  manuellDatum === heuteDatum() &&
  ende > jetzt
) {
  setMeldung(
    "Endzeit darf nicht in der Zukunft liegen."
  );
  return;
}

const bruttoStunden =
  (ende.getTime() - start.getTime()) / 1000 / 60 / 60;

const nettoStunden =
  Math.max(0, bruttoStunden - pauseStunden);

    if (bruttoStunden <= 0 || nettoStunden <= 0) {
      setMeldung(
        "Endzeit muss nach Startzeit liegen und Nettozeit muss größer als 0 sein."
      );
      return;
    }

    const { data: projektzeitenTag, error: zeitenError } = await supabase
      .from("arbeitszeiten")
      .select("*")
      .eq("user_id", user.id)
      .eq("datum", manuellDatum);

    if (zeitenError) {
      setMeldung(zeitenError.message);
      console.log(zeitenError);
      return;
    }

    const projektStunden =
      projektzeitenTag
        ?.filter(
          (eintrag) =>
            eintrag.projekt !== "Betriebsunterhalt" && !eintrag.auto_generiert
        )
        .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0) || 0;

    const differenzProjektZuTag = projektStunden - nettoStunden;

    if (differenzProjektZuTag > 0.01) {
      setMeldung(
        `Arbeitstag kann nicht gespeichert werden: Projektzeit überschreitet die Nettozeit um ${formatStunden(
          differenzProjektZuTag
        )}. Netto: ${formatStunden(nettoStunden)}, Projektzeiten: ${formatStunden(
          projektStunden
        )}. Bitte Projektbuchungen oder Tageszeit korrigieren.`
      );
      return;
    }

    const betriebsunterhalt = Math.max(0, nettoStunden - projektStunden);

    const { data: vorhandenerTag, error: tagError } = await supabase
      .from("tageszeiten")
      .select("*")
      .eq("user_id", user.id)
      .eq("datum", manuellDatum)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (tagError) {
      setMeldung(tagError.message);
      return;
    }

    if (vorhandenerTag) {
      const { error } = await supabase
        .from("tageszeiten")
        .update({
          startzeit: manuellStart,
          endzeit: manuellEnde,
          pause: pauseStunden,
zusatzpause_minuten: zusatzPauseMinuten,
netto_stunden: Number(nettoStunden.toFixed(2)),
          status: "Abgeschlossen",
        })
        .eq("id", vorhandenerTag.id);

      if (error) {
        setMeldung(error.message);
        return;
      }
    } else {
      const { data: tagVorInsert, error: tagVorInsertError } = await supabase
        .from("tageszeiten")
        .select("id")
        .eq("user_id", user.id)
        .eq("datum", manuellDatum)
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (tagVorInsertError) {
        setMeldung(tagVorInsertError.message);
        return;
      }

      if (tagVorInsert?.id) {
        const { error } = await supabase
          .from("tageszeiten")
          .update({
            startzeit: manuellStart,
            endzeit: manuellEnde,
            pause: pauseStunden,
zusatzpause_minuten: zusatzPauseMinuten,
netto_stunden: Number(nettoStunden.toFixed(2)),
            status: "Abgeschlossen",
          })
          .eq("id", tagVorInsert.id);

        if (error) {
          setMeldung(error.message);
          return;
        }
      } else {
        const { error } = await supabase.from("tageszeiten").insert({
          user_id: user.id,
          datum: manuellDatum,
          startzeit: manuellStart,
          endzeit: manuellEnde,
          pause: pauseStunden,
zusatzpause_minuten: zusatzPauseMinuten,
netto_stunden: Number(nettoStunden.toFixed(2)),
status: "Abgeschlossen",
        });

        if (error) {
          setMeldung(error.message);
          return;
        }
      }
    }

    try {
      await betriebsunterhaltSpeichern(user.id, manuellDatum, betriebsunterhalt);
    } catch (error: any) {
      console.log("BETRIEBSUNTERHALT MANUELL FEHLER:", error);
      setMeldung(error?.message || "Betriebsunterhalt konnte nicht gespeichert werden.");
      return;
    }

    setDatumSuche(manuellDatum);
    setZusammenfassungOffen(true);

    setMeldung(
      `Arbeitstag manuell gespeichert. Netto: ${nettoStunden.toFixed(
        2
      )}h · Betriebsunterhalt: ${betriebsunterhalt.toFixed(2)}h`
    );

    setManuellDatum(heuteDatum());
    setManuellStart("07:00");
    setManuellEnde("");
    setManuellPause("0");

    await ladeDaten();
  }

  async function zeitSpeichern() {
    setMeldung("");

    if (!datum || !projekt || !bereich || !vonZeit || !bisZeit) {
      setMeldung("Bitte Datum, Projekt, Bereich, Von und Bis ausfüllen.");
      return;
    }

    if (projekt === "Betriebsunterhalt") {
      setMeldung(
        "Betriebsunterhalt wird automatisch berechnet und kann nicht manuell erfasst werden."
      );
      return;
    }

    const start = new Date(`${datum}T${vonZeit}`);
    const ende = new Date(`${datum}T${bisZeit}`);

    const berechneteStunden =
      (ende.getTime() - start.getTime()) / 1000 / 60 / 60;

    if (!Number.isFinite(berechneteStunden) || berechneteStunden <= 0) {
      setMeldung("Bitte gültige Von-/Bis-Zeit eingeben.");
      return;
    }

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      setSaving(false);
      setMeldung("Bitte zuerst einloggen.");
      window.location.href = "/login";
      return;
    }

    setSaving(true);

    const gespeichertesDatum = datum;
    let alteDatumVorBearbeitung: string | null = null;

    try {
      if (bearbeitenId) {
        const { data: alteZeit, error: alteZeitError } = await supabase
          .from("arbeitszeiten")
          .select("datum, auto_generiert, bereich")
          .eq("id", bearbeitenId)
          .eq("user_id", user.id)
          .single();

        if (alteZeitError) throw alteZeitError;

        if (alteZeit?.auto_generiert) {
          setMeldung("Automatisch berechneter Betriebsunterhalt kann nicht bearbeitet werden.");
          return;
        }

        alteDatumVorBearbeitung = alteZeit?.datum || null;

        await pruefeProjektUeberbuchung({
          userId: user.id,
          datumWert: gespeichertesDatum,
          neueStunden: Number(berechneteStunden.toFixed(2)),
          ausnahmeId: bearbeitenId,
        });

        const { data: gespeicherteZeit, error } = await supabase
          .from("arbeitszeiten")
          .update({
            datum: gespeichertesDatum,
            projekt,
            bereich,
            startzeit: vonZeit,
            endzeit: bisZeit,
            pause: 0,
            stunden: Number(berechneteStunden.toFixed(2)),
          })
          .eq("id", bearbeitenId)
          .eq("user_id", user.id)
          .select("id")
          .single();

        if (error) throw error;
        if (!gespeicherteZeit?.id) throw new Error("Arbeitszeit wurde nicht bestätigt gespeichert.");
      } else {
        await pruefeProjektUeberbuchung({
          userId: user.id,
          datumWert: gespeichertesDatum,
          neueStunden: Number(berechneteStunden.toFixed(2)),
          ausnahmeId: null,
        });

        const { data: gespeicherteZeit, error } = await supabase
          .from("arbeitszeiten")
          .insert({
            datum: gespeichertesDatum,
            projekt,
            bereich,
            startzeit: vonZeit,
            endzeit: bisZeit,
            pause: 0,
            stunden: Number(berechneteStunden.toFixed(2)),
            user_id: user.id,
          })
          .select("id")
          .single();

        if (error) throw error;
        if (!gespeicherteZeit?.id) throw new Error("Arbeitszeit wurde nicht bestätigt gespeichert.");
      }

      if (alteDatumVorBearbeitung && alteDatumVorBearbeitung !== gespeichertesDatum) {
        await tagesabschlussAusBuchungenAktualisieren(user.id, alteDatumVorBearbeitung);
      }

      await tagesabschlussAusBuchungenAktualisieren(user.id, gespeichertesDatum);
      await ladeDaten();

      setDatum(heuteDatum());
      setProjekt("");
      setProjektId(null);
      setBereich("");
      setProjektBereiche([]);
      setStunden("");
      setVonZeit("");
      setBisZeit("");
      setBearbeitenId(null);
      setDatumSuche(gespeichertesDatum);
      setZusammenfassungOffen(true);

      setMeldung(
        bearbeitenId
          ? `Arbeitszeit aktualisiert für ${gespeichertesDatum}.`
          : `Arbeitszeit gespeichert für ${gespeichertesDatum}.`
      );
    } catch (error: any) {
      console.log("ARBEITSZEIT SPEICHERN FEHLER:", error);
      setMeldung(error?.message || "Arbeitszeit konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  async function zeitLoeschen(id: string | number) {
    const bestaetigen = confirm("Arbeitszeit wirklich löschen?");
    if (!bestaetigen) return;

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      setMeldung("Bitte zuerst einloggen.");
      window.location.href = "/login";
      return;
    }

    const { data: zuLoeschendeZeit, error: leseError } = await supabase
      .from("arbeitszeiten")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (leseError) {
      setMeldung(leseError.message);
      console.log(leseError);
      return;
    }

    if (zuLoeschendeZeit?.auto_generiert) {
      setMeldung("Automatisch berechneter Betriebsunterhalt kann nicht gelöscht werden.");
      return;
    }

    const { error } = await supabase
      .from("arbeitszeiten")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    if (zuLoeschendeZeit?.datum) {
      await tagesabschlussAusBuchungenAktualisieren(user.id, zuLoeschendeZeit.datum);
    }

    await ladeDaten();
    setMeldung("Arbeitszeit gelöscht.");
  }

  function bearbeitungStarten(zeit: any) {
    if (zeit.auto_generiert) {
      setMeldung("Automatisch berechneter Betriebsunterhalt kann nicht bearbeitet werden.");
      return;
    }
    const projektObj = projekte.find(
      (p) => projektAnzeige(p) === (zeit.projekt || "") || p.name === (zeit.projekt || "")
    );

    const id = projektObj ? Number(projektObj.id) : null;

    setBearbeitenId(zeit.id);
    setDatum(zeit.datum || "");
    setProjekt(zeit.projekt || "");
    setProjektId(id);
    setBereich(zeit.bereich || "");
    ladeProjektBereicheById(id, zeit.bereich || "");
    setStunden(String(zeit.stunden || ""));
    setVonZeit(String(zeit.startzeit || "").slice(0, 5));
    setBisZeit(String(zeit.endzeit || "").slice(0, 5));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function bearbeitungAbbrechen() {
    setBearbeitenId(null);
    setDatum(heuteDatum());
    setProjekt("");
    setProjektId(null);
    setBereich("");
    setProjektBereiche([]);
    setStunden("");
    setVonZeit("");
    setBisZeit("");
  }

  function toggleTag(key: string) {
    setOffeneTage((aktuell) =>
      aktuell.includes(key)
        ? aktuell.filter((item) => item !== key)
        : [...aktuell, key]
    );
  }

  function toggleDetails(key: string) {
    setOffeneDetails((aktuell) =>
      aktuell.includes(key)
        ? aktuell.filter((item) => item !== key)
        : [...aktuell, key]
    );
  }

  function gruppierteArbeitszeiten() {
    const tageMap = new Map<string, any>();

    zeiten.forEach((zeit) => {
      const datumKey = zeit.datum || "Ohne Datum";
      const projektKey = zeit.projekt || "Ohne Projekt";

      if (!tageMap.has(datumKey)) {
        tageMap.set(datumKey, {
          datum: datumKey,
          gesamt: 0,
          projekte: new Map<string, any>(),
        });
      }

      const tag = tageMap.get(datumKey);
      tag.gesamt += Number(zeit.stunden || 0);

      if (!tag.projekte.has(projektKey)) {
        tag.projekte.set(projektKey, {
          name: projektKey,
          stunden: 0,
          eintraege: [],
        });
      }

      const projektGruppe = tag.projekte.get(projektKey);
      projektGruppe.stunden += Number(zeit.stunden || 0);
      projektGruppe.eintraege.push(zeit);
    });

    return Array.from(tageMap.values()).map((tag) => ({
      ...tag,
      netto: Number(tag.gesamt || 0),
      projekte: Array.from(tag.projekte.values()),
    }));
  }

  function datumFormatieren(datumWert: string) {
    if (!datumWert || datumWert === "Ohne Datum") return datumWert;

    return new Date(datumWert).toLocaleDateString("de-CH", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const vorschauStunden = Number(stunden || 0);
  const alleGruppiertenTage = gruppierteArbeitszeiten();
  const gruppierteTage = datumSuche
    ? alleGruppiertenTage.filter((tag) => tag.datum === datumSuche)
    : alleGruppiertenTage;
  const heuteKey = formatDateLocal(new Date());

  const offenerArbeitstag = tageszeiten.find(
    (tag) => tag.datum === heuteKey && tag.status === "Offen"
  );

  function laufzeitText() {
    if (!offenerArbeitstag?.startzeit) return "00:00:00";

    const start = new Date(`${heuteKey}T${offenerArbeitstag.startzeit}`);
    const differenzMs = timerJetzt.getTime() - start.getTime();

    if (differenzMs <= 0) return "00:00:00";

    const sekundenGesamt = Math.floor(differenzMs / 1000);
    const stunden = Math.floor(sekundenGesamt / 3600);
    const minuten = Math.floor((sekundenGesamt % 3600) / 60);
    const sekunden = sekundenGesamt % 60;

    return `${String(stunden).padStart(2, "0")}:${String(minuten).padStart(
      2,
      "0"
    )}:${String(sekunden).padStart(2, "0")}`;
  }

  return (
    <main className="arbeitszeiten-v12 space-y-6 text-slate-950">
      <section className="v12-hero relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-[#302720]/90 via-[#26272a]/90 to-[#161719]/95 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.16)] lg:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-[0.38]">
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
              ODZ V1.2 · Zeiterfassung
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Arbeitszeiten
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/65 sm:text-base">
              Arbeitszeit sauber erfassen, nachtragen und als Tagesübersicht kontrollieren.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2 backdrop-blur-xl">
                <span
                  className={`h-3 w-3 rounded-full ${
                    offenerArbeitstag
                      ? "bg-emerald-700 shadow-lg shadow-emerald-900/20"
                      : "bg-slate-400"
                  }`}
                />
                <span className="text-xs font-black uppercase tracking-widest text-white/70">
                  {offenerArbeitstag ? "Arbeitstag läuft" : "Bereit zur Erfassung"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-3xl border border-white/10 bg-black/25 p-2 text-center backdrop-blur-xl sm:p-3 md:grid-cols-3">
            <HeroMini label="Heute" value={heuteDatum().slice(5)} />
            <HeroMini label="Buchungen" value={zeiten.length} />
            <HeroMini label="Laufzeit" value={offenerArbeitstag ? laufzeitText().slice(0, 5) : "--:--"} green={!!offenerArbeitstag} />
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-white/60 bg-white/35 p-2 shadow-[0_14px_44px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <ActionCard href="#arbeitstag" label="Start / Stop" title="▶ Arbeitstag" onClick={() => setArbeitstagOffen(true)} />
          <ActionCard href="#manuell" label="Nachtragen" title="🕒 Manuell" onClick={() => setManuellOffen(true)} />
          <ActionCard href="#buchen" label="Projekt" title="🏗️ Buchen" onClick={() => setBuchungOffen(true)} />
          <ActionCard href="#zusammenfassung" label="Suche" title="📊 Zeiten" onClick={() => setZusammenfassungOffen(true)} />
        </div>
      </section>

      {meldung && (
        <div className="rounded-xl border border-orange-200/40 bg-orange-100/60 p-4 text-sm font-bold text-slate-950 shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
          {meldung}
        </div>
      )}

      <DropdownPanel
        id="arbeitstag"
        title="Arbeitstag"
        eyebrow="Start · Stop · Live Timer"
        description="Start / Stop mit automatischem Betriebsunterhalt. Normalzustand ruhig, Hover mit blauem Premium-Glow."
        open={arbeitstagOffen}
        onToggle={() => setArbeitstagOffen(!arbeitstagOffen)}
      >
        <div className="rounded-2xl border border-white/10 bg-black/25 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10">
          <div className="text-sm font-bold text-white/50">Status</div>

          {offenerArbeitstag ? (
            <>
              <div className="mt-2 text-xl font-black text-emerald-700">Arbeitstag läuft</div>
              <div className="mt-3 text-sm text-white/50">Gestartet um {offenerArbeitstag.startzeit?.slice(0, 5)}</div>
              <div className="mt-3 text-5xl font-black text-white">{laufzeitText()}</div>
            </>
          ) : (
            <div className="mt-2 text-xl font-black text-white/70">Kein Arbeitstag gestartet</div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={startArbeitstag}
            className="rounded-2xl border border-emerald-900/35 bg-emerald-950/15 px-5 py-4 font-black text-emerald-800 shadow-lg shadow-emerald-950/5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-900/50 hover:bg-emerald-950/25"
          >
            ▶ Arbeitstag starten
          </button>

          <Field label="Pause in Stunden">
            <input
              type="number"
              step="0.25"
              value={pauseStop}
              onChange={(e) => setPauseStop(e.target.value)}
              className="dark-input"
              placeholder="z.B. 0.5"
            />
          </Field>

          <button
            type="button"
            onClick={stopArbeitstag}
            disabled={!offenerArbeitstag}
            className={`rounded-2xl border px-5 py-4 font-black shadow-lg transition-all duration-300 ${
              offenerArbeitstag
                ? "border-red-950/40 bg-red-950/15 text-red-900 shadow-red-950/5 hover:-translate-y-1 hover:border-red-950/55 hover:bg-red-950/25 hover:shadow-red-950/10"
                : "cursor-not-allowed border-red-950/15 bg-red-950/5 text-red-900/35 shadow-none"
            }`}
          >
            ■ Arbeitstag stoppen
          </button>
        </div>
      </DropdownPanel>

      <DropdownPanel
        id="manuell"
        title="Arbeitstag manuell nachtragen"
        eyebrow="Nachtragen · Korrigieren · Betriebsunterhalt"
        description="Für vergessenen Start / Stop. Nettozeit und Betriebsunterhalt werden automatisch berechnet."
        open={manuellOffen}
        onToggle={() => setManuellOffen(!manuellOffen)}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <Field label="Datum">
            <input type="date" value={manuellDatum} onChange={(e) => setManuellDatum(e.target.value)} className="dark-input" />
          </Field>

          <Field label="Von">
            <input type="time" value={manuellStart} onChange={(e) => setManuellStart(e.target.value)} className="dark-input" />
          </Field>

          <Field label="Bis">
            <input type="time" value={manuellEnde} onChange={(e) => setManuellEnde(e.target.value)} className="dark-input" />
          </Field>

          <Field label="Zusätzliche Pause (Min.)">
            <input type="number" min="0" step="5" value={manuellPause} onChange={(e) => setManuellPause(e.target.value)} className="dark-input" placeholder="0" />
            <p className="mt-2 text-xs text-white/50">Fixpause: 15 Min + Zusatzpause</p>
            <p className="mt-2 text-sm font-bold text-slate-200">Gesamtpause: {15 + Number(manuellPause || 0)} Minuten</p>
          </Field>

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={arbeitstagManuellSpeichern}
              disabled={saving}
              className="rounded-2xl border border-slate-200/30 bg-slate-200/10 px-5 py-4 font-black text-slate-100 shadow-lg shadow-slate-200/10 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:bg-sky-300/10 hover:shadow-sky-300/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Speichert..." : "Manuell berechnen"}
            </button>
          </div>
        </div>
      </DropdownPanel>

      <DropdownPanel
        id="buchen"
        title={bearbeitenId ? "Arbeitszeit bearbeiten" : "Arbeitszeit erfassen"}
        eyebrow="Projekt · Bereich · Von/Bis"
        description="Die eigentliche Buchung bleibt bewusst simpel: Datum, Projekt, Bereich und Zeitraum."
        open={buchungOffen}
        onToggle={() => setBuchungOffen(!buchungOffen)}
      >
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="text-sm text-white/50">
            Eingetragen: <span className="font-black text-slate-100">{vonZeit && bisZeit ? `${vonZeit} - ${bisZeit}` : "Von - Bis"}</span>
            {vonZeit && bisZeit && (
              <span className="ml-2 rounded-full border border-sky-300/20 bg-sky-300/5 px-3 py-1 text-xs font-black text-sky-200">
                {formatStunden((new Date(`${datum}T${bisZeit}`).getTime() - new Date(`${datum}T${vonZeit}`).getTime()) / 1000 / 60 / 60)}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
          <Field label="Datum">
            <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className="dark-input" />
          </Field>

          <Field label="Projekt">
            <select
              value={projektId ?? ""}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                const projektObj = id ? projekte.find((p) => Number(p.id) === id) : null;
                setProjektId(id);
                setProjekt(projektObj ? projektAnzeige(projektObj) : "");
                setBereich("");
                ladeProjektBereicheById(id, "");
              }}
              className="dark-input"
            >
              <option value="">Projekt auswählen</option>
              {projekte.map((projektItem) => (
                <option key={projektItem.id} value={projektItem.id}>{projektAnzeige(projektItem)}</option>
              ))}
            </select>
          </Field>

          <Field label="Bereich">
            <select value={bereich} onChange={(e) => setBereich(e.target.value)} disabled={!projekt || projektBereiche.length === 0} className="dark-input">
              <option value="">{!projekt ? "Zuerst Projekt auswählen" : projektBereiche.length === 0 ? "Keine Bereiche" : "Bereich auswählen"}</option>
              {projektBereiche.map((eintrag) => (
                <option key={eintrag.id} value={eintrag.bereich}>{eintrag.bereich}</option>
              ))}
            </select>
          </Field>

          <Field label="Von">
            <input type="time" value={vonZeit} onChange={(e) => setVonZeit(e.target.value)} className="dark-input" />
          </Field>

          <Field label="Bis">
            <input type="time" value={bisZeit} onChange={(e) => setBisZeit(e.target.value)} className="dark-input" />
          </Field>

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={zeitSpeichern}
              disabled={saving}
              className="rounded-2xl border border-slate-200/30 bg-slate-200/10 p-4 font-black text-slate-100 shadow-lg shadow-slate-200/10 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:bg-sky-300/10 hover:shadow-sky-300/10 disabled:opacity-50"
            >
              {saving ? "Speichern..." : bearbeitenId ? "Änderung speichern" : "Speichern"}
            </button>
          </div>
        </div>

        {bearbeitenId && (
          <button type="button" onClick={bearbeitungAbbrechen} className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 font-bold text-white transition hover:border-sky-300/35 hover:text-sky-200">
            Bearbeiten abbrechen
          </button>
        )}
      </DropdownPanel>

      <DropdownPanel
        id="zusammenfassung"
        title="Zusammenfassung"
        eyebrow="Datumssuche · Projekte · Rapporte"
        description="Die komplette Arbeitserfassung als sauberes Dropdown mit Datumssuche und Stunden/Minuten-Anzeige."
        open={zusammenfassungOffen}
        onToggle={() => setZusammenfassungOffen(!zusammenfassungOffen)}
      >
        <div className="mb-7 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
          <Field label="Datum suchen">
            <input type="date" value={datumSuche} onChange={(e) => setDatumSuche(e.target.value)} className="dark-input" />
          </Field>

          <button
            type="button"
            onClick={() => setDatumSuche(heuteDatum())}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 font-black text-white transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
          >
            Heute
          </button>

          <button
            type="button"
            onClick={() => setDatumSuche("")}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 font-black text-white transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
          >
            Alle Tage
          </button>
        </div>

        <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black text-white">Gebuchte Arbeitszeiten</h2>
            <p className="mt-1 text-white/55">Übersicht inklusive Betriebsunterhalt, Projektgruppen und Rapportdetails.</p>
          </div>

          <div className="text-sm text-white/50">
            {zeiten.length} Buchungen · {gruppierteTage.length} angezeigte Tage
          </div>
        </div>

        {gruppierteTage.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-white/55">
            Keine Arbeitszeiten für diese Auswahl vorhanden.
          </div>
        )}

        <div className="space-y-4">
          {gruppierteTage.map((tag) => {
            const tagOffen = offeneTage.includes(tag.datum);

            return (
              <div
                key={tag.datum}
                className="overflow-hidden rounded-2xl border border-white/10 bg-black/25 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10"
              >
                <button
                  type="button"
                  onClick={() => toggleTag(tag.datum)}
                  className="flex w-full flex-col justify-between gap-3 bg-black/25 px-5 py-5 text-left transition hover:bg-white/[0.03] md:flex-row md:items-center"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 text-2xl font-black text-sky-200">{tagOffen ? "▾" : "▸"}</div>
                    <div>
                      <div className="text-sm font-bold uppercase tracking-widest text-slate-200">{datumFormatieren(tag.datum)}</div>
                      <div className="mt-1 text-white/50">
                        {tag.projekte.length} Bereiche · {tag.projekte.reduce((sum: number, p: any) => sum + Number(p.eintraege.length || 0), 0)} Buchungen · Gebucht {formatStunden(Number(tag.gesamt || 0))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200/20 bg-slate-200/10 px-4 py-2 text-lg font-black text-slate-100 shadow-lg shadow-slate-200/10">
                    Summe {formatStunden(Number(tag.netto || 0))}
                  </div>
                </button>

                {tagOffen && (
                  <div className="divide-y divide-white/10 border-t border-white/10">
                    {tag.projekte.map((projektGruppe: any) => {
                      const detailKey = `${tag.datum}-${projektGruppe.name}`;
                      const detailsOffen = offeneDetails.includes(detailKey);
                      const kunde = kundeFuerProjekt(projektGruppe.name);

                      return (
                        <div key={detailKey} className="px-5 py-4">
                          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                            <div>
                              <div className="text-xl font-black text-white">{projektGruppe.name}</div>
                              <div className="mt-1 text-sm text-white/50">Kunde: <span className="font-bold text-white/75">{kunde}</span></div>

                              {projektGruppe.name === "Betriebsunterhalt" && (() => {
                                const tageszeit = tageszeiten.find((t) => t.datum === tag.datum);
                                if (!tageszeit) return null;

                                return (
                                  <div className="mt-2 text-sm text-white/50">
                                    <div className="font-bold text-sky-200">🕒 {tageszeit.startzeit?.slice(0, 5)} - {tageszeit.endzeit?.slice(0, 5)}</div>
                                    <div className="text-white/40">Fixpause: 15 Min · Zusatzpause: {tageszeit.zusatzpause_minuten || 0} Min · Gesamtpause: {Math.round((tageszeit.pause || 0) * 60)} Min</div>
                                    <div className="text-white/40">Netto: {formatStunden(Number(tageszeit.netto_stunden || 0))}</div>
                                  </div>
                                );
                              })()}

                              <div className="mt-1 text-sm text-white/45">{projektGruppe.eintraege.length} Buchung{projektGruppe.eintraege.length === 1 ? "" : "en"}</div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <div className="text-3xl font-black text-slate-100">{formatStunden(Number(projektGruppe.stunden || 0))}</div>
                              <button
                                type="button"
                                onClick={() => toggleDetails(detailKey)}
                                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white transition hover:border-sky-300/35 hover:bg-sky-300/5 hover:text-sky-200"
                              >
                                {detailsOffen ? "Details ausblenden" : "Details anzeigen"}
                              </button>
                            </div>
                          </div>

                          {detailsOffen && (
                            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {projektGruppe.eintraege.map((zeit: any) => (
                                <div key={zeit.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/25 hover:bg-sky-300/5 hover:shadow-lg hover:shadow-sky-300/10">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <div className="text-sm text-white/50">Rapport</div>
                                      <div className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-slate-200">{zeit.bereich || "Ohne Bereich"}</div>
                                    </div>

                                    <div className="text-right">
                                      <div className="text-lg font-black text-sky-200">{zeit.startzeit && zeit.endzeit ? `${zeit.startzeit.slice(0, 5)} - ${zeit.endzeit.slice(0, 5)}` : "--:--"}</div>
                                      <div className="text-sm text-white/50">{zeit.bereich || "Ohne Bereich"} · {formatStunden(Number(zeit.stunden || 0))}</div>
                                    </div>
                                  </div>

                                  {zeit.auto_generiert ? (
                                    <div className="mt-4 rounded-lg border border-slate-200/20 bg-slate-200/10 px-3 py-2 text-center text-xs font-black text-slate-100">
                                      Automatisch berechnet · nicht bearbeitbar
                                    </div>
                                  ) : (
                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                      <button type="button" onClick={() => bearbeitungStarten(zeit)} className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-bold text-white transition hover:border-sky-300/25 hover:bg-sky-300/10">Bearbeiten</button>
                                      <button type="button" onClick={() => zeitLoeschen(zeit.id)} className="rounded-lg border border-red-950/30 bg-red-950/10 px-3 py-2 text-sm font-bold text-red-900 transition hover:bg-red-950/15">Löschen</button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DropdownPanel>

      <style jsx global>{`
        .dark-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.78);
          padding: 0.9rem 1rem;
          color: #020617;
          outline: none;
          transition: 0.2s ease;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
          color-scheme: light;
        }

        .dark-input:focus {
          border-color: rgba(251, 146, 60, 0.55);
          box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.13), inset 0 1px 0 rgba(255,255,255,0.65);
          background: rgba(255, 255, 255, 0.92);
        }

        .dark-input::placeholder {
          color: rgba(100, 116, 139, 0.62);
        }

        .dark-input,
        .dark-input[type="date"],
        .dark-input[type="time"],
        .dark-input[type="number"],
        .dark-input[type="text"] {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          color-scheme: light !important;
        }

        .dark-input::-webkit-datetime-edit,
        .dark-input::-webkit-datetime-edit-fields-wrapper,
        .dark-input::-webkit-datetime-edit-text,
        .dark-input::-webkit-datetime-edit-month-field,
        .dark-input::-webkit-datetime-edit-day-field,
        .dark-input::-webkit-datetime-edit-year-field,
        .dark-input::-webkit-datetime-edit-hour-field,
        .dark-input::-webkit-datetime-edit-minute-field,
        .dark-input::-webkit-datetime-edit-second-field,
        .dark-input::-webkit-datetime-edit-ampm-field {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
        }

        input.dark-input::-webkit-datetime-edit,
        input.dark-input::-webkit-datetime-edit-fields-wrapper,
        input.dark-input::-webkit-datetime-edit-text,
        input.dark-input::-webkit-datetime-edit-month-field,
        input.dark-input::-webkit-datetime-edit-day-field,
        input.dark-input::-webkit-datetime-edit-year-field,
        input.dark-input::-webkit-datetime-edit-hour-field,
        input.dark-input::-webkit-datetime-edit-minute-field,
        input.dark-input::-webkit-datetime-edit-second-field,
        input.dark-input::-webkit-datetime-edit-ampm-field {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
        }

        .dark-input:disabled,
        .dark-input:disabled::-webkit-datetime-edit,
        .dark-input:disabled::-webkit-datetime-edit-fields-wrapper,
        .dark-input:disabled::-webkit-datetime-edit-text,
        .dark-input:disabled::-webkit-datetime-edit-month-field,
        .dark-input:disabled::-webkit-datetime-edit-day-field,
        .dark-input:disabled::-webkit-datetime-edit-year-field,
        .dark-input:disabled::-webkit-datetime-edit-hour-field,
        .dark-input:disabled::-webkit-datetime-edit-minute-field {
          color: rgba(15, 23, 42, 0.45);
        }

        .dark-input option {
          background: #ffffff;
          color: #020617;
        }

        .dark-input[type="date"],
        .dark-input[type="month"],
        .dark-input[type="datetime-local"] {
          padding-right: 3rem !important;
          background-repeat: no-repeat !important;
          background-position: right 1rem center !important;
          background-size: 1.15rem 1.15rem !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23020617' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'/%3E%3Cline x1='16' y1='2' x2='16' y2='6'/%3E%3Cline x1='8' y1='2' x2='8' y2='6'/%3E%3Cline x1='3' y1='10' x2='21' y2='10'/%3E%3C/svg%3E") !important;
        }

        .dark-input[type="time"] {
          padding-right: 3rem !important;
          background-repeat: no-repeat !important;
          background-position: right 1rem center !important;
          background-size: 1.15rem 1.15rem !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23020617' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpolyline points='12 6 12 12 16 14'/%3E%3C/svg%3E") !important;
        }

        .dark-input::-webkit-calendar-picker-indicator {
          opacity: 0 !important;
          cursor: pointer !important;
          width: 2.75rem !important;
          height: 100% !important;
        }

        .arbeitszeiten-v12 input,
        .arbeitszeiten-v12 select,
        .arbeitszeiten-v12 textarea {
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
          caret-color: #020617 !important;
          color-scheme: light !important;
        }

        .arbeitszeiten-v12 input::placeholder,
        .arbeitszeiten-v12 textarea::placeholder {
          color: rgba(100, 116, 139, 0.62) !important;
          -webkit-text-fill-color: rgba(100, 116, 139, 0.62) !important;
        }

        .arbeitszeiten-v12 select option {
          background: #ffffff !important;
          color: #020617 !important;
          -webkit-text-fill-color: #020617 !important;
        }

        .arbeitszeiten-v12 section:not(.v12-hero) .bg-black\/25,
        .arbeitszeiten-v12 section:not(.v12-hero) .bg-white\/\[0\.03\],
        .arbeitszeiten-v12 section:not(.v12-hero) .bg-white\/\[0\.04\],
        .arbeitszeiten-v12 section:not(.v12-hero) .bg-white\/\[0\.06\] {
          background: rgba(255, 255, 255, 0.52) !important;
        }

        .arbeitszeiten-v12 section:not(.v12-hero) .border-white\/10,
        .arbeitszeiten-v12 section:not(.v12-hero) .border-slate-200\/20 {
          border-color: rgba(255, 255, 255, 0.7) !important;
        }

        .arbeitszeiten-v12 section:not(.v12-hero) .text-white,
        .arbeitszeiten-v12 section:not(.v12-hero) .text-slate-100 {
          color: #020617 !important;
        }

        .arbeitszeiten-v12 section:not(.v12-hero) [class*="text-white/"] {
          color: #64748b !important;
        }

        .arbeitszeiten-v12 section:not(.v12-hero) .text-slate-200 {
          color: #9a3412 !important;
        }

        .arbeitszeiten-v12 section:not(.v12-hero) .text-sky-200,
        .arbeitszeiten-v12 section:not(.v12-hero) .text-sky-100 {
          color: #9a3412 !important;
        }

        .arbeitszeiten-v12 section:not(.v12-hero) .hover\:bg-sky-300\/5:hover,
        .arbeitszeiten-v12 section:not(.v12-hero) .hover\:bg-sky-300\/10:hover {
          background: rgba(253, 186, 116, 0.14) !important;
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
      className="group block w-full rounded-xl border border-white/70 bg-white/55 px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-300/35 hover:bg-orange-100/45 hover:shadow-[0_14px_34px_rgba(154,52,18,0.10)]"
    >
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
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
    <section id={id} className="overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-white/40 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
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
}: {
  label: string;
  value: string | number;
  green?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center transition hover:border-sky-300/25 hover:bg-sky-300/5">
      <div className={`text-xl font-black leading-tight md:text-2xl ${green ? "text-emerald-700" : "text-slate-100"}`}>{value}</div>
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
      <label className="mb-2 block text-sm font-black text-slate-600">{label}</label>
      {children}
    </div>
  );
}

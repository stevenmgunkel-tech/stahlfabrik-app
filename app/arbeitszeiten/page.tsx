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
  const [tageszeiten, setTageszeiten] = useState<any[]>([]);
  const [offeneTage, setOffeneTage] = useState<string[]>([]);
  const [offeneDetails, setOffeneDetails] = useState<string[]>([]);

  const [datum, setDatum] = useState(
  heuteDatum()
);
  const [projekt, setProjekt] = useState("");
  const [stunden, setStunden] = useState("");

  const [pauseStop, setPauseStop] = useState("0");
  const [timerJetzt, setTimerJetzt] = useState(new Date());

  const [manuellDatum, setManuellDatum] = useState(
    heuteDatum()
  );
  const [manuellStart, setManuellStart] = useState("07:00");
  const [manuellEnde, setManuellEnde] = useState("");
  const [manuellPause, setManuellPause] = useState("0");

  const [saving, setSaving] = useState(false);
  const [meldung, setMeldung] = useState("");
  const [bearbeitenId, setBearbeitenId] = useState<string | number | null>(null);

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
    const gefunden = projekte.find(
      (p) => p.name === projektName || projektAnzeige(p) === projektName
    );

    return gefunden?.kunde || "Kein Kunde hinterlegt";
  }

  async function betriebsunterhaltSpeichern(
    userId: string,
    datumWert: string,
    stundenWert: number
  ) {
    const saubererWert = Number(Number(stundenWert || 0).toFixed(2));

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
      setMeldung(sucheError.message);
      return;
    }

    if (saubererWert <= 0) {
      if (vorhandenerBetriebsunterhalt) {
        const { error } = await supabase
          .from("arbeitszeiten")
          .delete()
          .eq("id", vorhandenerBetriebsunterhalt.id);

        if (error) {
          console.log("BETRIEBSUNTERHALT DELETE FEHLER:", error);
          setMeldung(error.message);
        }
      }

      return;
    }

    if (vorhandenerBetriebsunterhalt) {
      const { error } = await supabase
        .from("arbeitszeiten")
        .update({
          stunden: saubererWert,
        })
        .eq("id", vorhandenerBetriebsunterhalt.id);

      if (error) {
        console.log("BETRIEBSUNTERHALT UPDATE FEHLER:", error);
        setMeldung(error.message);
      }

      return;
    }

    const { error } = await supabase.from("arbeitszeiten").insert({
  user_id: userId,
  datum: datumWert,
  projekt: "Betriebsunterhalt",
  stunden: saubererWert,
  auto_generiert: true,
});

    if (error) {
      console.log("BETRIEBSUNTERHALT INSERT FEHLER:", error);
      setMeldung(error.message);
    }
  }

  async function betriebsunterhaltNeuBerechnen(userId: string, datumWert: string) {
  const { data: tag } = await supabase
    .from("tageszeiten")
    .select("*")
    .eq("user_id", userId)
    .eq("datum", datumWert)
    .maybeSingle();

  if (!tag) return;

  const { data: zeiten } = await supabase
    .from("arbeitszeiten")
    .select("*")
    .eq("user_id", userId)
    .eq("datum", datumWert);

  const projektStunden =
    zeiten
      ?.filter((z) => z.projekt !== "Betriebsunterhalt")
      .reduce((sum, z) => sum + Number(z.stunden || 0), 0) || 0;

  const betriebsunterhalt = Math.max(
    0,
    Number(tag.netto_stunden || 0) - projektStunden
  );

  await betriebsunterhaltSpeichern(userId, datumWert, betriebsunterhalt);
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
      .eq("status", "Offen")
      .maybeSingle();

    if (sucheError) {
      setMeldung(sucheError.message);
      return;
    }

    if (vorhandenerTag) {
      setMeldung("Arbeitstag läuft bereits.");
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
        ?.filter((eintrag) => eintrag.projekt !== "Betriebsunterhalt")
        .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0) || 0;

    const betriebsunterhalt = Math.max(0, nettoStunden - projektStunden);
    const projektWarnung = projektStunden > nettoStunden;

    const { error: updateError } = await supabase
      .from("tageszeiten")
      .update({
        endzeit: jetztString,
        pause: pauseStunden,
        netto_stunden: Number(nettoStunden.toFixed(2)),
        status: "Abgeschlossen",
      })
      .eq("id", tageszeit.id);

    if (updateError) {
      setMeldung(updateError.message);
      return;
    }

    await betriebsunterhaltSpeichern(user.id, heute, betriebsunterhalt);

    setMeldung(
      projektWarnung
        ? `Arbeitstag beendet. Netto: ${nettoStunden.toFixed(
            2
          )}h. Hinweis: Projektzeiten (${projektStunden.toFixed(
            2
          )}h) sind höher als Tageszeit. Betriebsunterhalt wurde auf 0.00h gesetzt.`
        : `Arbeitstag beendet. Netto: ${nettoStunden.toFixed(
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

    const pauseStunden = Number(manuellPause || 0);
    const start = new Date(`${manuellDatum}T${manuellStart}`);
    const ende = new Date(`${manuellDatum}T${manuellEnde}`);
    const bruttoStunden = (ende.getTime() - start.getTime()) / 1000 / 60 / 60;
    const nettoStunden = Math.max(0, bruttoStunden - pauseStunden);

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
        ?.filter((eintrag) => eintrag.projekt !== "Betriebsunterhalt")
        .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0) || 0;

    const betriebsunterhalt = Math.max(0, nettoStunden - projektStunden);
    const projektWarnung = projektStunden > nettoStunden;

    const { data: vorhandenerTag, error: tagError } = await supabase
      .from("tageszeiten")
      .select("*")
      .eq("user_id", user.id)
      .eq("datum", manuellDatum)
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
          netto_stunden: Number(nettoStunden.toFixed(2)),
          status: "Abgeschlossen",
        })
        .eq("id", vorhandenerTag.id);

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
        netto_stunden: Number(nettoStunden.toFixed(2)),
        status: "Abgeschlossen",
      });

      if (error) {
        setMeldung(error.message);
        return;
      }
    }

    await betriebsunterhaltSpeichern(user.id, manuellDatum, betriebsunterhalt);

    setMeldung(
      projektWarnung
        ? `Arbeitstag manuell gespeichert. Netto: ${nettoStunden.toFixed(
            2
          )}h. Hinweis: Projektzeiten (${projektStunden.toFixed(
            2
          )}h) sind höher als Tageszeit. Betriebsunterhalt wurde auf 0.00h gesetzt.`
        : `Arbeitstag manuell gespeichert. Netto: ${nettoStunden.toFixed(
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

    if (!datum || !projekt || !stunden) {
      setMeldung("Bitte Datum, Projekt und Stunden ausfüllen.");
      return;
    }

    if (projekt === "Betriebsunterhalt") {
  setMeldung(
    "Betriebsunterhalt wird automatisch berechnet und kann nicht manuell erfasst werden."
  );
  return;
}

    const berechneteStunden = Number(stunden);

    if (!Number.isFinite(berechneteStunden) || berechneteStunden <= 0) {
      setMeldung("Bitte gültige Stunden eingeben.");
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

    let alteDatumVorBearbeitung: string | null = null;

    if (bearbeitenId) {
      const { data: alteZeit } = await supabase
        .from("arbeitszeiten")
        .select("datum, auto_generiert")
        .eq("id", bearbeitenId)
        .eq("user_id", user.id)
        .single();

      if (alteZeit?.auto_generiert) {
        setSaving(false);
        setMeldung("Automatisch berechneter Betriebsunterhalt kann nicht bearbeitet werden.");
        return;
      }

      alteDatumVorBearbeitung = alteZeit?.datum || null;

      const { error } = await supabase
        .from("arbeitszeiten")
        .update({
          datum,
          projekt,
          startzeit: null,
          endzeit: null,
          pause: 0,
          stunden: berechneteStunden,
        })
        .eq("id", bearbeitenId)
        .eq("user_id", user.id);

      if (error) {
        setSaving(false);
        setMeldung(error.message);
        console.log(error);
        return;
      }

      setMeldung("Arbeitszeit aktualisiert.");
    } else {
      const { error } = await supabase.from("arbeitszeiten").insert([
        {
          datum,
          projekt,
          startzeit: null,
          endzeit: null,
          pause: 0,
          stunden: berechneteStunden,
          user_id: user.id,
        },
      ]);

      if (error) {
        setSaving(false);
        setMeldung(error.message);
        console.log(error);
        return;
      }

      setMeldung("Arbeitszeit gespeichert.");
    }

    setDatum(heuteDatum());
    setProjekt("");
    setStunden("");
    setBearbeitenId(null);

    if (alteDatumVorBearbeitung && alteDatumVorBearbeitung !== datum) {
      await betriebsunterhaltNeuBerechnen(user.id, alteDatumVorBearbeitung);
    }

    await betriebsunterhaltNeuBerechnen(user.id, datum);
    await ladeDaten();
    setSaving(false);
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
      await betriebsunterhaltNeuBerechnen(user.id, zuLoeschendeZeit.datum);
    }

    await ladeDaten();
    setMeldung("Arbeitszeit gelöscht.");
  }

  function bearbeitungStarten(zeit: any) {
    if (zeit.auto_generiert) {
      setMeldung("Automatisch berechneter Betriebsunterhalt kann nicht bearbeitet werden.");
      return;
    }

    setBearbeitenId(zeit.id);
    setDatum(zeit.datum || "");
    setProjekt(zeit.projekt || "");
    setStunden(String(zeit.stunden || ""));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function bearbeitungAbbrechen() {
    setBearbeitenId(null);
    setDatum(heuteDatum());
    setProjekt("");
    setStunden("");
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
  const gruppierteTage = gruppierteArbeitszeiten();
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
    <main className="space-y-8">
      <div>
        <div className="mb-3 text-sm font-medium uppercase tracking-widest text-white/60">
          Zeiterfassung
        </div>

        <h1 className="text-5xl font-black tracking-tight text-white lg:text-6xl">
          Arbeitszeiten
        </h1>

        <p className="mt-3 text-white/60">
          Arbeitszeiten einfach nach Projekt und Stunden erfassen
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
        <div className="mb-5">
          <h2 className="text-2xl font-black text-white">Arbeitstag</h2>
          <p className="mt-1 text-white/55">
            Start / Stop mit automatischem Betriebsunterhalt
          </p>
        </div>

        <div className="mb-5 rounded-xl border border-white/10 bg-black/25 p-5">
          <div className="text-sm font-bold text-white/50">Status</div>

          {offenerArbeitstag ? (
            <>
              <div className="mt-2 text-xl font-black text-green-400">
                🟢 Arbeitstag läuft
              </div>
              <div className="mt-3 text-sm text-white/50">
                Gestartet um {offenerArbeitstag.startzeit}
              </div>
              <div className="mt-3 text-4xl font-black text-white">
                {laufzeitText()}
              </div>
            </>
          ) : (
            <div className="mt-2 text-xl font-black text-white/70">
              Kein Arbeitstag gestartet
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={startArbeitstag}
            className="rounded-xl bg-green-600 px-5 py-4 font-black text-white shadow-lg shadow-green-600/20 transition hover:bg-green-700"
          >
            ▶ Arbeitstag starten
          </button>

          <input
            type="number"
            step="0.25"
            value={pauseStop}
            onChange={(e) => setPauseStop(e.target.value)}
            className="dark-input"
            placeholder="Pause in Stunden"
          />

          <button
            type="button"
            onClick={stopArbeitstag}
            className="rounded-xl bg-orange-600 px-5 py-4 font-black text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700"
          >
            ■ Arbeitstag stoppen
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
        <div className="mb-5">
          <h2 className="text-2xl font-black text-white">
            Arbeitstag manuell nachtragen
          </h2>
          <p className="mt-1 text-white/55">
            Für vergessenen Start / Stop. Rechnet automatisch Betriebsunterhalt.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <Field label="Datum">
            <input
              type="date"
              value={manuellDatum}
              onChange={(e) => setManuellDatum(e.target.value)}
              className="dark-input"
            />
          </Field>

          <Field label="Von">
            <input
              type="time"
              value={manuellStart}
              onChange={(e) => setManuellStart(e.target.value)}
              className="dark-input"
            />
          </Field>

          <Field label="Bis">
            <input
              type="time"
              value={manuellEnde}
              onChange={(e) => setManuellEnde(e.target.value)}
              className="dark-input"
            />
          </Field>

          <Field label="Pause (Std.)">
            <input
              type="number"
              step="0.25"
              value={manuellPause}
              onChange={(e) => setManuellPause(e.target.value)}
              className="dark-input"
              placeholder="Pause"
            />
          </Field>

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={arbeitstagManuellSpeichern}
              className="rounded-xl bg-orange-600 px-5 py-4 font-black text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700"
            >
              Manuell berechnen
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-black text-white">
              {bearbeitenId ? "Arbeitszeit bearbeiten" : "Arbeitszeit erfassen"}
            </h2>
            <p className="mt-1 text-white/55">
              Datum, Projekt und Stunden eintragen
            </p>
          </div>

          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3">
            <span className="text-sm text-white/60">Eingetragen</span>{" "}
            <span className="font-black text-orange-500">
              {vorschauStunden}h
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <Field label="Datum">
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              className="dark-input"
            />
          </Field>

          <Field label="Projekt">
            <select
              value={projekt}
              onChange={(e) => setProjekt(e.target.value)}
              className="dark-input"
            >
              <option value="">Projekt auswählen</option>
              {projekte.map((projektItem) => {
                const anzeige = projektAnzeige(projektItem);

                return (
                  <option key={projektItem.id} value={anzeige}>
                    {anzeige}
                  </option>
                );
              })}
            </select>
          </Field>

          <Field label="Stunden">
            <input
              type="number"
              step="0.25"
              min="0"
              placeholder="z.B. 3 oder 4.5"
              value={stunden}
              onChange={(e) => setStunden(e.target.value)}
              className="dark-input"
            />
          </Field>

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={zeitSpeichern}
              disabled={saving}
              className="rounded-xl bg-orange-600 p-3 font-black text-white shadow-lg shadow-orange-600/25 transition hover:bg-orange-500 disabled:opacity-50"
            >
              {saving
                ? "Speichern..."
                : bearbeitenId
                ? "Änderung speichern"
                : "Speichern"}
            </button>
          </div>
        </div>

        {bearbeitenId && (
          <button
            type="button"
            onClick={bearbeitungAbbrechen}
            className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 font-bold text-white transition hover:border-orange-500/40 hover:text-orange-500"
          >
            Bearbeiten abbrechen
          </button>
        )}

        {meldung && (
          <div className="mt-5 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm font-bold text-orange-400">
            {meldung}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
        <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black text-white">Zusammenfassung</h2>
            <p className="mt-1 text-white/55">
              Übersicht deiner gebuchten Projektzeiten inklusive Betriebsunterhalt.
            </p>
          </div>

          <div className="text-sm text-white/50">
            {zeiten.length} Buchungen · {gruppierteTage.length} Tage
          </div>
        </div>

        {gruppierteTage.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-white/55">
            Noch keine Arbeitszeiten vorhanden.
          </div>
        )}

        <div className="space-y-4">
          {gruppierteTage.map((tag) => {
            const tagOffen = offeneTage.includes(tag.datum);

            return (
              <div
                key={tag.datum}
                className="overflow-hidden rounded-2xl border border-white/10 bg-black/25"
              >
                <button
                  type="button"
                  onClick={() => toggleTag(tag.datum)}
                  className="flex w-full flex-col justify-between gap-3 bg-black/25 px-5 py-5 text-left transition hover:bg-white/[0.03] md:flex-row md:items-center"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 text-2xl font-black text-orange-500">
                      {tagOffen ? "▾" : "▸"}
                    </div>

                    <div>
                      <div className="text-sm font-bold uppercase tracking-widest text-orange-500">
                        {datumFormatieren(tag.datum)}
                      </div>

                      <div className="mt-1 text-white/50">
                        {tag.projekte.length} Bereiche ·{" "}
                        {tag.projekte.reduce(
                          (sum: number, p: any) =>
                            sum + Number(p.eintraege.length || 0),
                          0
                        )}{" "}
                        Buchungen · Gebucht {Number(tag.gesamt || 0).toFixed(2)}h
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-orange-600 px-4 py-2 text-lg font-black text-white shadow-lg shadow-orange-600/25">
                    Summe {Number(tag.netto || 0).toFixed(2)}h
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
                              <div className="text-xl font-black text-white">
                                {projektGruppe.name}
                              </div>

                              <div className="mt-1 text-sm text-white/50">
                                Kunde:{" "}
                                <span className="font-bold text-white/75">
                                  {kunde}
                                </span>
                              </div>

                              {projektGruppe.name === "Betriebsunterhalt" && (() => {
  const tageszeit = tageszeiten.find(
    (t) => t.datum === tag.datum
  );

  if (!tageszeit) return null;

  return (
    <div className="mt-2 text-sm text-white/50">
      <div>
        🕒 {tageszeit.startzeit} - {tageszeit.endzeit}
      </div>

      <div className="text-white/40">
        Pause: {tageszeit.pause || 0}h
      </div>
    </div>
  );
})()}

                              <div className="mt-1 text-sm text-white/45">
                                {projektGruppe.eintraege.length} Buchung
                                {projektGruppe.eintraege.length === 1
                                  ? ""
                                  : "en"}
                              </div>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <div className="text-3xl font-black text-orange-500">
                                {Number(projektGruppe.stunden || 0).toFixed(2)}h
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleDetails(detailKey)}
                                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white transition hover:border-orange-500/40 hover:text-orange-500"
                              >
                                {detailsOffen
                                  ? "Details ausblenden"
                                  : "Details anzeigen"}
                              </button>
                            </div>
                          </div>

                          {detailsOffen && (
                            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {projektGruppe.eintraege.map((zeit: any) => (
                                <div
                                  key={zeit.id}
                                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <div className="text-sm text-white/50">
                                        Arbeitszeit
                                      </div>
                                    </div>

                                    <div className="font-black text-white">
                                      {Number(zeit.stunden || 0).toFixed(2)}h
                                    </div>
                                  </div>

                                  {zeit.auto_generiert ? (
  <div className="mt-4 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-center text-xs font-black text-orange-400">
    Automatisch berechnet · nicht bearbeitbar
  </div>
) : (
  <div className="mt-4 grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={() => bearbeitungStarten(zeit)}
      className="rounded-lg bg-white/[0.06] px-3 py-2 text-sm font-bold text-white transition hover:bg-white/[0.10]"
    >
      Bearbeiten
    </button>

    <button
      type="button"
      onClick={() => zeitLoeschen(zeit.id)}
      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-500"
    >
      Löschen
    </button>
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
      </section>

      <style jsx global>{`
        .dark-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.25);
          padding: 0.85rem 1rem;
          color: white;
          outline: none;
          transition: 0.2s ease;
        }

        .dark-input:focus {
          border-color: rgba(249, 115, 22, 0.6);
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12);
        }

        .dark-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }

        .dark-input option {
          background: #111315;
          color: white;
        }

        .dark-input::-webkit-calendar-picker-indicator {
          filter: brightness(0) invert(1);
          opacity: 1;
          cursor: pointer;
        }
      `}</style>
    </main>
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
      <label className="mb-2 block text-sm font-bold text-white/70">
        {label}
      </label>
      {children}
    </div>
  );
}
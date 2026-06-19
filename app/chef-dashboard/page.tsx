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

  const [verwaltungsModus, setVerwaltungsModus] = useState<"projekt" | "mitarbeiter">("projekt");
  const [abwesenheitOffen, setAbwesenheitOffen] = useState(false);
  const [auswertungOffen, setAuswertungOffen] = useState(false);
  const [projektUebersichtOffen, setProjektUebersichtOffen] = useState(false);
  const [mitarbeiterName, setMitarbeiterName] = useState("");
  const [mitarbeiterEmail, setMitarbeiterEmail] = useState("");
  const [mitarbeiterPasswort, setMitarbeiterPasswort] = useState("");
  const [mitarbeiterRolle, setMitarbeiterRolle] = useState("Mitarbeiter");
  const [mitarbeiterWochenstunden, setMitarbeiterWochenstunden] = useState("42.5");
  const [mitarbeiterFerienwochen, setMitarbeiterFerienwochen] = useState("5");
  const [mitarbeiterUrlaubstage, setMitarbeiterUrlaubstage] = useState("25");
  const [mitarbeiterVertragsart, setMitarbeiterVertragsart] = useState("Festangestellt");

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

  useEffect(() => {
    async function ladeDaten() {
      setMeldung("");

      const userData = await supabase.auth.getUser();
      const user = userData.data.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: adminCheck, error: adminError } = await supabase
        .from("mitarbeiter")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (adminError) {
        setMeldung(adminError.message);
        setLoading(false);
        return;
      }

      if (adminCheck?.rolle !== "Admin") {
        window.location.href = "/";
        return;
      }

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
      setLoading(false);
    }

    ladeDaten();
  }, [monat, aktuellerMonat]);

  function berechneArbeitstageAbDatum(startDatum?: string) {
    const jahr = Number(monat.slice(0, 4));
    const monatNummer = Number(monat.slice(5, 7));

    const tageImMonat = aktuellerMonat
      ? heute.getDate()
      : new Date(jahr, monatNummer, 0).getDate();

    let arbeitstage = 0;
    const start = startDatum ? new Date(startDatum) : null;

    for (let tag = 1; tag <= tageImMonat; tag++) {
      const datum = new Date(jahr, monatNummer - 1, tag);

      if (start && datum < start) continue;

      const wochentag = datum.getDay();
      const istWochenende = wochentag === 0 || wochentag === 6;
      const istFeiertag = istFeiertagSG(datum);

      if (!istWochenende && !istFeiertag) arbeitstage++;
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
    const stunden = arbeitszeiten
      .filter((zeit) => zeit.projekt === projekt.name)
      .reduce((sum, zeit) => sum + Number(zeit.stunden || 0), 0);

    return {
      id: projekt.id,
      name: projekt.name,
      kunde: projekt.kunde,
      kommission: projekt.kommission,
      status: projekt.status || "Aktiv",
      stunden,
    };
  });

  const mitarbeiterStats = mitarbeiter.map((person) => {
    const personArbeitszeiten = arbeitszeiten.filter(
      (eintrag) => eintrag.user_id === person.user_id
    );

    const personUrlaub = urlaub.filter(
      (eintrag) => eintrag.user_id === person.user_id
    );

    const bruttoStunden = personArbeitszeiten.reduce(
  (sum, eintrag) => sum + Number(eintrag.stunden || 0),
  0
);

const pauseStunden = tagespausen
  .filter((pause) => pause.user_id === person.user_id)
  .reduce((sum, pause) => sum + Number(pause.pause || 0) / 60, 0);

const iststunden = bruttoStunden - pauseStunden;

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

    const tagesSoll = Number(person.wochenstunden || 0) / 5;

    const personArbeitstage = berechneArbeitstageAbDatum();

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
  sollstunden,
  angerechneteStunden,
  differenz,
  gesamtUeberstunden,
  urlaubstagePerson,
  kranktagePerson,
  ueberstundenAbbauStunden,
  personArbeitstage,
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

async function projektErstellen() {
  setMeldung("");

  if (!projektName.trim()) {
    setMeldung("Bitte Projektname eintragen.");
    return;
  }

  const payload: any = {
    kunde: projektKunde.trim() || "Intern",
    kommission: projektKommission.trim() || null,
    name: projektName.trim(),
    status: projektStatus,
    erlaubte_bereiche: projektBereiche,
  };

  let { data, error } = await supabase
    .from("projekte")
    .insert(payload)
    .select()
    .single();

  if (error && error.message.toLowerCase().includes("erlaubte_bereiche")) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.erlaubte_bereiche;

    const fallback = await supabase
      .from("projekte")
      .insert(fallbackPayload)
      .select()
      .single();

    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    setMeldung(error.message);
    console.log(error);
    return;
  }

  if (data) setProjekte((aktuell) => [data, ...aktuell]);

  setProjektKunde("");
  setProjektKommission("");
  setProjektName("");
  setProjektStatus("Aktiv");
  setProjektBereiche(["Werkstatt", "Montage"]);
  setMeldung("Projekt wurde erstellt.");
}

async function mitarbeiterErstellen() {
  setMeldung("");

  if (!mitarbeiterName.trim()) {
    setMeldung("Bitte Mitarbeiternamen eintragen.");
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
    ferienwochen: Number(mitarbeiterFerienwochen || 0),
    urlaubstage: Number(mitarbeiterUrlaubstage || 0),
    vertragsart: mitarbeiterVertragsart,
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

  const { data: neueMitarbeiter } = await supabase
    .from("mitarbeiter")
    .select("*")
    .order("id", { ascending: false });

  setMitarbeiter(neueMitarbeiter || []);
  setMitarbeiterName("");
  setMitarbeiterEmail("");
  setMitarbeiterPasswort("");
  setMitarbeiterRolle("Mitarbeiter");
  setMitarbeiterWochenstunden("42.5");
  setMitarbeiterFerienwochen("5");
  setMitarbeiterUrlaubstage("25");
  setMitarbeiterVertragsart("Festangestellt");
  setMeldung("Mitarbeiter wurde erstellt.");
}

async function tagAlsGeprueftMarkieren(id: string) {
  setMeldung("");

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

  return (
    <main className="space-y-8 text-slate-100">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-black/20 p-7 shadow-2xl shadow-black/30 lg:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-[0.45]">
          <div
            className="h-full w-full bg-cover bg-[center_20%]"
            style={{
              backgroundImage: "url('/berg.png')",
              filter: "brightness(1.8) contrast(1.05)",
            }}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-transparent" />

        <div className="relative z-10 flex flex-col justify-between gap-8 xl:flex-row xl:items-end">
          <div>
            <div className="inline-flex rounded-full border border-slate-400/25 bg-slate-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-slate-200">
              ODZ SILVER
            </div>

            <div className="mt-5 text-sm font-bold text-white/60">
              Guten Tag {adminName} 👋 · {heutigesDatum}
            </div>

            <h1 className="mt-3 text-5xl font-black tracking-tight text-white lg:text-7xl">
              STAHLFABRIK
            </h1>

            <p className="mt-4 max-w-2xl text-lg font-medium text-white/65">
              Premium Betriebssystem für Zeit, Projekte, Team und Kontrolle.
            </p>

            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-green-400 shadow-lg shadow-green-400/40" />
              <span className="text-sm font-black uppercase tracking-widest text-white/70">
                {systemStatus}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-3xl border border-white/10 bg-black/25 p-4 backdrop-blur-xl">
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
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-black/20 p-6 shadow-2xl shadow-black/30 lg:p-7"
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
            <span className="text-sm font-black text-white/65">Was möchtest du erstellen?</span>
            <select
              value={verwaltungsModus}
              onChange={(event) => setVerwaltungsModus(event.target.value as "projekt" | "mitarbeiter")}
              className="mt-2 w-full rounded-2xl border border-slate-200/25 bg-slate-200/10 px-4 py-4 font-black text-slate-100 outline-none transition focus:border-slate-200/50 focus:bg-slate-200/15"
            >
              <option value="projekt">🏗️ Projekt erstellen</option>
              <option value="mitarbeiter">👤 Mitarbeiter erstellen</option>
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
                Ziel: Chef bleibt im Dashboard. Keine doppelte Projektverwaltung mehr.
              </p>

              <button
                type="button"
                onClick={projektErstellen}
                className="rounded-2xl border border-slate-200/30 bg-slate-200/10 px-6 py-4 font-black text-slate-100 shadow-lg shadow-slate-200/10 transition-all duration-300 hover:-translate-y-1 hover:border-slate-200/50 hover:bg-slate-200/15 hover:shadow-sky-300/10"
              >
                + Projekt speichern
              </button>
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
                <span className="text-sm font-black text-white/65">E-Mail</span>
                <input
                  value={mitarbeiterEmail}
                  onChange={(event) => setMitarbeiterEmail(event.target.value)}
                  placeholder="max@firma.ch"
                  type="email"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition placeholder:text-white/25 focus:border-sky-300/40 focus:bg-black/40"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-white/65">Startpasswort</span>
                <input
                  value={mitarbeiterPasswort}
                  onChange={(event) => setMitarbeiterPasswort(event.target.value)}
                  placeholder="mind. 6 Zeichen"
                  type="password"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 font-bold text-white outline-none transition placeholder:text-white/25 focus:border-sky-300/40 focus:bg-black/40"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-5">
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
                <span className="text-sm font-black text-white/65">Wochenstunden</span>
                <input
                  value={mitarbeiterWochenstunden}
                  onChange={(event) => setMitarbeiterWochenstunden(event.target.value)}
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

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-white/45">
                Mitarbeiter wird mit Login erstellt. Die Detailpflege bleibt später in der Mitarbeiterverwaltung.
              </p>

              <button
                type="button"
                onClick={mitarbeiterErstellen}
                className="rounded-2xl border border-slate-200/25 bg-slate-200/10 px-6 py-4 font-black text-slate-100 shadow-lg shadow-slate-200/10 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/40 hover:bg-sky-300/5 hover:shadow-sky-300/10"
              >
                + Mitarbeiter speichern
              </button>
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

      <section className="min-h-[150px] rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
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
      {abgeschlosseneTageListe.map((tag) => (
        <div
          key={tag.id}
          className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/20 bg-gradient-to-br from-slate-200/10 to-black/25 p-5 md:flex-row md:items-center"
        >
          <div>
            <div className="text-lg font-black text-white">
              {tag.mitarbeiterName}
            </div>

            <div className="mt-1 text-sm text-white/55">
              {tag.datum} · {formatStunden(Number(tag.netto_stunden || 0))}
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
      ))}
    </div>
  )}
</section>

<section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
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
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-black/30">
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

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.025] p-7 shadow-2xl shadow-black/30">
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
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-black/30">
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

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-black/30">
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

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-black/30">
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

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-7 shadow-2xl shadow-black/30">
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

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
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
          {mitarbeiterStats.map((person) => (
            <div
              key={person.id}
              className="rounded-2xl border border-white/10 bg-black/25 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-black text-white">
                    {person.name}
                  </div>
                  <div className="mt-1 text-sm text-white/55">
                    {person.rolle}
                  </div>
                </div>

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
            </div>
          ))}
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

              {mitarbeiterStats.map((person) => (
                <div
                  key={person.id}
                  className="grid grid-cols-9 items-center border-b border-white/10 px-5 py-4 text-white/80 transition hover:bg-white/[0.03]"
                >
                  <div className="text-lg font-black text-white">{person.name}</div>
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
              ))}
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
<section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
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
  <div
    className="
      group
      overflow-hidden
      rounded-3xl
      border
      border-white/10
      bg-gradient-to-br
      from-white/[0.08]
      to-white/[0.03]
      p-6
      shadow-2xl
      shadow-black/30
      transition-all
      duration-300
      hover:-translate-y-1
      hover:border-sky-300/25
      hover:shadow-2xl
      hover:shadow-sky-300/10
    "
  >
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
      <div className={`text-3xl font-black ${color}`}>{value}</div>
      <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
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
    <section
      id={id}
      className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] shadow-2xl shadow-black/30"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col justify-between gap-4 p-6 text-left transition hover:bg-white/[0.03] lg:flex-row lg:items-center lg:p-7"
      >
        <div>
          <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-200">
            {eyebrow}
          </div>
          <h2 className="mt-2 text-2xl font-black text-white">{title}</h2>
          <p className="mt-1 text-white/55">{description}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/30 bg-slate-200/10 px-5 py-3 text-sm font-black text-slate-100 transition hover:border-slate-200/50 hover:bg-slate-200/15">
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
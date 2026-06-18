"use client";

import { useEffect, useState } from "react";
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

  const monat = new Date().toISOString().slice(0, 7);

  const heute = new Date();

  const aktuellerMonat =
    heute.getFullYear() === Number(monat.slice(0, 4)) &&
    heute.getMonth() + 1 === Number(monat.slice(5, 7));

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
      name: projekt.name,
      kunde: projekt.kunde,
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

const letzteGepruefteTage = gepruefteTageListe
  .sort(
    (a, b) =>
      new Date(b.datum).getTime() -
      new Date(a.datum).getTime()
  )
  .slice(0, 10);

const topProjekte = projektStunden
  .filter((projekt) => Number(projekt.stunden || 0) > 0)
  .sort((a, b) => Number(b.stunden || 0) - Number(a.stunden || 0))
  .slice(0, 5);

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
      farbe: "text-orange-400",
      punkt: "bg-orange-400",
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
    <main className="space-y-8">
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
              ODZ V1.1
            </div>

            <div className="mt-5 text-sm font-bold text-white/60">
              Guten Tag {adminName} 👋 · {heutigesDatum}
            </div>

            <h1 className="mt-3 text-5xl font-black tracking-tight text-white lg:text-7xl">
              STAHLFABRIK 🇨🇭
            </h1>

            <p className="mt-4 max-w-2xl text-lg font-medium text-white/65">
              Digitales Betriebssystem für Zeit, Projekte, Team und Kontrolle.
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
          href="/projekte"
          className="group rounded-2xl border border-white/10 bg-black/25 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/25 hover:shadow-lg hover:shadow-orange-500/10"
        >
          <div className="text-sm text-white/50">Projekt</div>
          <div className="mt-2 text-lg font-black text-white">
            🏗️ Neues Projekt
          </div>
        </a>

        <a
          href="/mitarbeiter"
          className="group rounded-2xl border border-white/10 bg-black/25 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/25 hover:shadow-lg hover:shadow-orange-500/10"
        >
          <div className="text-sm text-white/50">Team</div>
          <div className="mt-2 text-lg font-black text-white">
            👤 Mitarbeiter
          </div>
        </a>

        <a
          href="/urlaub"
          className="group rounded-2xl border border-white/10 bg-black/25 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/25 hover:shadow-lg hover:shadow-orange-500/10"
        >
          <div className="text-sm text-white/50">Abwesenheit</div>
          <div className="mt-2 text-lg font-black text-white">
            📅 Urlaub
          </div>
        </a>

        <a
          href="/projektstatistik"
          className="group rounded-2xl border border-white/10 bg-black/25 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/25 hover:shadow-lg hover:shadow-orange-500/10"
        >
          <div className="text-sm text-white/50">Auswertung</div>
          <div className="mt-2 text-lg font-black text-white">
            📊 Statistik
          </div>
        </a>
      </section>

      {meldung && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm font-bold text-orange-400">
          {meldung}
        </div>
      )}

      <section className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Team Iststunden"
          value={loading ? "..." : `${teamIststunden.toFixed(2)}h`}
          orange
        />

        <KpiCard
          label="Angerechnet"
          value={loading ? "..." : `${teamAngerechnet.toFixed(2)}h`}
        />

        <KpiCard
          label="Überstundenabbau"
          value={
            loading
              ? "..."
              : teamUeberstundenAbbauStunden > 0
              ? `-${teamUeberstundenAbbauStunden.toFixed(2)}h`
              : "0.00h"
          }
          orange
        />

        <KpiCard
          label="Team Überstunden"
          value={
            loading
              ? "..."
              : `${teamDifferenz >= 0 ? "+" : ""}${teamDifferenz.toFixed(
                  2
                )}h`
          }
          green={teamDifferenz >= 0}
          red={teamDifferenz < 0}
        />
      </section>

      <section className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Team Sollstunden"
          value={loading ? "..." : `${teamSollstunden.toFixed(2)}h`}
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
          className="flex flex-col justify-between gap-4 rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-black/25 p-5 md:flex-row md:items-center"
        >
          <div>
            <div className="text-lg font-black text-white">
              {tag.mitarbeiterName}
            </div>

            <div className="mt-1 text-sm text-white/55">
              {tag.datum} · {Number(tag.netto_stunden || 0).toFixed(2)}h
            </div>

            <div className="mt-1 text-xs font-bold uppercase tracking-widest text-orange-400">
              Status: {tag.status}
            </div>
          </div>

          <button
            type="button"
            onClick={() => tagAlsGeprueftMarkieren(tag.id)}
            className="rounded-xl bg-green-600 px-5 py-3 font-black text-white shadow-lg shadow-green-600/20 transition hover:bg-green-500"
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

    <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-black text-orange-400">
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
        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
          {letzteGepruefteTage.map((tag) => (
            <div
              key={tag.id}
              className="rounded-2xl border border-green-500/25 bg-gradient-to-br from-green-500/10 to-black/20 p-5"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <div className="text-base font-black text-white">
                    {tag.mitarbeiterName}
                  </div>

                  <div className="mt-1 text-sm text-white/55">
                    {tag.datum} · {Number(tag.netto_stunden || 0).toFixed(2)}h
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
      )}
    </div>
  )}
</section>

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

        <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/12 to-white/[0.025] p-7 shadow-2xl shadow-black/30">
          <div className="mb-7">
            <h2 className="text-2xl font-black text-white">Schnellzugriff</h2>
            <p className="mt-1 text-white/55">Wichtige Adminbereiche</p>
          </div>

          <div className="space-y-3">
            <QuickLink href="/admin" label="Urlaubsanträge prüfen" />
            <QuickLink href="/monatsansicht" label="Monatsansicht öffnen" />
            <QuickLink href="/projekte" label="Projekte verwalten" />
          </div>
        </div>
      </section>

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
                        {Number(projekt.stunden || 0).toFixed(2)}h
                      </div>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 shadow-lg shadow-orange-500/20" style={{ width: `${percent}%` }} />
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
        className="flex items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r from-black/30 to-white/[0.03] p-4 transition hover:border-slate-400/30"
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
                  {Number(person.differenz || 0) >= 0 ? "+" : ""}
{Number(person.differenz || 0).toFixed(2)}h
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Info label="Arbeitstage" value={person.personArbeitstage} />
                <Info
                  label="Soll"
                  value={`${Number(person.sollstunden || 0).toFixed(2)}h`}
                />
                <Info label="Ist" value={`${Number(person.iststunden || 0).toFixed(2)}h`} />
                <Info
                  label="Angerechnet"
                  value={`${Number(person.angerechneteStunden || 0).toFixed(2)}h`}
                />
                <Info label="Urlaub" value={person.urlaubstagePerson} />
                <Info label="Krank" value={person.kranktagePerson} />
                <Info
                  label="ÜA Stunden"
                  value={`-${Number(person.ueberstundenAbbauStunden || 0).toFixed(2)}h`}
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
                  <div>{Number(person.sollstunden || 0).toFixed(2)}h</div>
                  <div>{Number(person.iststunden || 0).toFixed(2)}h</div>

                  <div className="text-lg font-black text-white">
                    {Number(person.angerechneteStunden || 0).toFixed(2)}h
                  </div>

                  <div
                    className={`font-black ${
                      Number(person.differenz || 0) >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {Number(person.differenz || 0) >= 0 ? "+" : ""}
                    {Number(person.differenz || 0).toFixed(2)}
                  </div>

                  <div>
                    U: {person.urlaubstagePerson} / K:{" "}
                    {person.kranktagePerson}
                  </div>

                  <div className="font-black text-slate-100">
                   -{Number(person.ueberstundenAbbauStunden || 0).toFixed(2)}h
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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
                  {projekt.stunden.toFixed(2)}h
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
                    {projekt.stunden.toFixed(2)}h
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
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
      hover:border-orange-500/25
      hover:shadow-2xl
      hover:shadow-orange-500/10
    "
  >
      <div className={`text-4xl font-black md:text-5xl ${color}`}>
        {value}
      </div>

      <div className="mt-3 text-xs font-black uppercase tracking-[0.22em] text-white/45">
        {label}
      </div>

      <div className="mt-5 h-1 w-16 rounded-full bg-orange-500/70 transition-all duration-300 group-hover:w-24" />
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
    ? "text-orange-400"
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
    <div className="rounded-xl border border-white/10 bg-black/25 p-5 transition hover:border-slate-400/30 hover:bg-black/35">
      <div className="text-sm font-bold text-white/50">{label}</div>
      <div
        className={`mt-3 text-4xl font-black ${
          orange ? "text-orange-500" : "text-slate-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="block rounded-xl border border-white/10 bg-black/25 p-4 font-black text-white transition hover:border-slate-400/40 hover:bg-slate-700/40"
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
          orange ? "text-orange-500" : "text-slate-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
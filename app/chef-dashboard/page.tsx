"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { istFeiertagSG } from "../../lib/feiertage";

export default function ChefDashboardPage() {
  const [mitarbeiter, setMitarbeiter] = useState<any[]>([]);
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [urlaub, setUrlaub] = useState<any[]>([]);
  const [projekte, setProjekte] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [meldung, setMeldung] = useState("");

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
        urlaubError ||
        projekteError;

      if (fehler) {
        setMeldung(fehler.message);
        console.log(fehler);
      }

      setMitarbeiter(mitarbeiterData || []);
      setArbeitszeiten(arbeitszeitenData || []);
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

    const iststunden = personArbeitszeiten.reduce(
      (sum, eintrag) => sum + Number(eintrag.stunden || 0),
      0
    );

    const urlaubstagePerson = personUrlaub
      .filter(
        (eintrag) =>
          eintrag.typ === "Urlaub" && eintrag.status === "Genehmigt"
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const kranktagePerson = personUrlaub
      .filter((eintrag) => eintrag.typ === "Krank")
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const ueberstundenabbauPerson = personUrlaub
      .filter(
        (eintrag) =>
          eintrag.typ === "Überstundenabbau" &&
          eintrag.status === "Genehmigt"
      )
      .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

    const tagesSoll = Number(person.wochenstunden || 0) / 5;

    const personArbeitstage = berechneArbeitstageAbDatum();

    const sollstunden = tagesSoll * personArbeitstage;
    const urlaubStunden = urlaubstagePerson * tagesSoll;
    const krankStunden = kranktagePerson * tagesSoll;
    const ueberstundenAbbauStunden = ueberstundenabbauPerson * tagesSoll;

    const angerechneteStunden =
      iststunden + urlaubStunden + krankStunden + ueberstundenAbbauStunden;

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
  ueberstundenabbauPerson,
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

  return (
    <main className="space-y-8">
      <div>
        <div className="mb-3 text-sm font-medium uppercase tracking-widest text-white/60">
          Executive Overview
        </div>

        <h1 className="text-5xl font-black tracking-tight text-white lg:text-6xl">
          Chef Dashboard
        </h1>

        <p className="mt-3 text-white/60">
          Firmenübersicht, Soll/Ist, Überstunden, Abwesenheiten und Projekte
        </p>
      </div>

      {meldung && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm font-bold text-orange-400">
          {meldung}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
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
            loading ? "..." : `-${teamUeberstundenAbbauStunden.toFixed(2)}h`
          }
          orange
        />

        <KpiCard
          label="Team Überstunden Brutto"
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

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
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

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
        <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black text-white">
              Team Monatsübersicht
            </h2>
            <p className="mt-1 text-white/55">
              Soll/Ist Vergleich und Überstunden pro Mitarbeiter
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
                  <div className="font-black text-white">{person.name}</div>
                  <div>{person.rolle}</div>
                  <div>{person.personArbeitstage}</div>
                  <div>{Number(person.sollstunden || 0).toFixed(2)}h</div>
                  <div>{Number(person.iststunden || 0).toFixed(2)}h</div>

                  <div className="font-black text-white">
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

                  <div className="font-black text-orange-500">
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
              Projektstunden diesen Monat
            </h2>
            <p className="mt-1 text-white/55">
              Aufteilung der Arbeitszeit nach Projekt und Kunde
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

                <div className="font-black text-orange-500">
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
                  <div className="font-black text-white">{projekt.name}</div>
                  <div>{projekt.kunde || "-"}</div>
                  <div className="font-black text-orange-500">
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
  const color = orange
    ? "text-orange-500"
    : green
    ? "text-green-400"
    : red
    ? "text-red-400"
    : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.025] p-6 shadow-2xl shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/40">
      <div className="text-sm font-bold uppercase tracking-widest text-white/45">
        {label}
      </div>

      <div className={`mt-5 text-4xl font-black md:text-5xl ${color}`}>
        {value}
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
    <div className="rounded-xl border border-white/10 bg-black/25 p-5 transition hover:border-orange-500/30 hover:bg-black/35">
      <div className="text-sm font-bold text-white/50">{label}</div>
      <div
        className={`mt-3 text-4xl font-black ${
          orange ? "text-orange-500" : "text-white"
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
      className="block rounded-xl border border-white/10 bg-black/25 p-4 font-black text-white transition hover:border-orange-500/40 hover:bg-orange-600"
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
          orange ? "text-orange-500" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
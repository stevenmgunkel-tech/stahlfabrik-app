"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ChefDashboardPage() {
  const [mitarbeiter, setMitarbeiter] = useState<any[]>([]);
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [urlaub, setUrlaub] = useState<any[]>([]);
  const [projekte, setProjekte] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [meldung, setMeldung] = useState("");

  const monat = new Date().toISOString().slice(0, 7);

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

      const ende = new Date(
        Number(monat.slice(0, 4)),
        Number(monat.slice(5, 7)),
        0
      )
        .toISOString()
        .split("T")[0];

      const { data: mitarbeiterData, error: mitarbeiterError } =
        await supabase.from("mitarbeiter").select("*");

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
  }, [monat]);

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

  const arbeitstage = 21;

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
      .filter((eintrag) => eintrag.typ === "Urlaub")
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

    const sollstunden = tagesSoll * arbeitstage;

    const urlaubStunden = urlaubstagePerson * tagesSoll;
    const krankStunden = kranktagePerson * tagesSoll;
    const ueberstundenAbbauStunden = ueberstundenabbauPerson * tagesSoll;

    const angerechneteStunden =
      iststunden + urlaubStunden + krankStunden + ueberstundenAbbauStunden;

    const differenz =
      angerechneteStunden - sollstunden - ueberstundenAbbauStunden;

    return {
      ...person,
      iststunden,
      sollstunden,
      angerechneteStunden,
      differenz,
      urlaubstagePerson,
      kranktagePerson,
      ueberstundenabbauPerson,
      ueberstundenAbbauStunden,
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
    (sum, person) => sum + person.differenz,
    0
  );

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-900 md:text-5xl">
          Chef Dashboard
        </h1>

        <p className="mt-2 text-sm font-medium text-zinc-600 md:text-lg">
          Firmenübersicht für StahlFabrik
        </p>
      </div>

      {meldung && (
        <div className="rounded-xl bg-zinc-900 p-3 text-sm font-semibold text-white">
          {meldung}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-zinc-900 p-5 text-white shadow-sm md:p-6">
          <p className="mb-2 font-semibold text-zinc-300">Team Iststunden</p>
          <p className="text-4xl font-extrabold text-orange-400 md:text-5xl">
            {loading ? "..." : `${teamIststunden.toFixed(2)}h`}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <p className="mb-2 font-semibold text-zinc-600">
            Angerechnete Stunden
          </p>
          <p className="text-4xl font-extrabold text-zinc-900 md:text-5xl">
            {loading ? "..." : `${teamAngerechnet.toFixed(2)}h`}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <p className="mb-2 font-semibold text-zinc-600">
            Überstundenabbau
          </p>
          <p className="text-4xl font-extrabold text-orange-500 md:text-5xl">
            {loading
              ? "..."
              : `-${teamUeberstundenAbbauStunden.toFixed(2)}h`}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <p className="mb-2 font-semibold text-zinc-600">Team Überstunden</p>
          <p
            className={`text-4xl font-extrabold md:text-5xl ${
              teamDifferenz >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {loading
              ? "..."
              : `${teamDifferenz >= 0 ? "+" : ""}${teamDifferenz.toFixed(
                  2
                )}h`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <p className="mb-2 font-semibold text-zinc-600">Team Sollstunden</p>
          <p className="text-4xl font-extrabold text-zinc-900 md:text-5xl">
            {loading ? "..." : `${teamSollstunden.toFixed(2)}h`}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <p className="mb-2 font-semibold text-zinc-600">Mitarbeiter</p>
          <p className="text-4xl font-extrabold text-zinc-900 md:text-5xl">
            {loading ? "..." : mitarbeiter.length}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <p className="mb-2 font-semibold text-zinc-600">Offene Anträge</p>
          <p className="text-4xl font-extrabold text-zinc-900 md:text-5xl">
            {loading ? "..." : offeneAntraege}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <p className="mb-2 font-semibold text-zinc-600">
            ÜA Tage
          </p>
          <p className="text-4xl font-extrabold text-zinc-900 md:text-5xl">
            {loading ? "..." : ueberstundenabbauTage}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="mb-5 text-xl font-bold text-zinc-900 md:text-2xl">
            Abwesenheiten diesen Monat
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-zinc-100 p-5">
              <p className="mb-2 font-semibold text-zinc-600">Urlaubstage</p>
              <p className="text-4xl font-extrabold text-zinc-900">
                {loading ? "..." : urlaubstage}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-100 p-5">
              <p className="mb-2 font-semibold text-zinc-600">Kranktage</p>
              <p className="text-4xl font-extrabold text-zinc-900">
                {loading ? "..." : kranktage}
              </p>
            </div>

            <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
              <p className="mb-2 font-semibold text-orange-700">
                Überstundenabbau
              </p>
              <p className="text-4xl font-extrabold text-orange-600">
                {loading ? "..." : ueberstundenabbauTage}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-5 text-white shadow-sm md:p-6">
          <h2 className="mb-5 text-xl font-bold md:text-2xl">
            Schnellzugriff
          </h2>

          <div className="space-y-3">
            <a
              href="/admin"
              className="block rounded-xl bg-zinc-800 p-4 font-bold transition hover:bg-orange-500"
            >
              Urlaubsanträge prüfen
            </a>

            <a
              href="/monatsansicht"
              className="block rounded-xl bg-zinc-800 p-4 font-bold transition hover:bg-orange-500"
            >
              Monatsansicht öffnen
            </a>

            <a
              href="/projekte"
              className="block rounded-xl bg-zinc-800 p-4 font-bold transition hover:bg-orange-500"
            >
              Projekte verwalten
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="mb-5 text-xl font-bold text-zinc-900 md:text-2xl">
          Team Monatsübersicht
        </h2>

        <div className="space-y-4 md:hidden">
          {mitarbeiterStats.map((person) => (
            <div
              key={person.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="text-lg font-bold text-zinc-900">
                {person.name}
              </div>

              <div className="mt-1 text-sm font-medium text-zinc-500">
                {person.rolle}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-zinc-500">Soll</p>
                  <p className="font-semibold text-zinc-900">
                    {person.sollstunden.toFixed(2)}h
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500">Ist</p>
                  <p className="font-semibold text-zinc-900">
                    {person.iststunden.toFixed(2)}h
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500">Angerechnet</p>
                  <p className="font-semibold text-zinc-900">
                    {person.angerechneteStunden.toFixed(2)}h
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500">Überstunden</p>
                  <p
                    className={`font-bold ${
                      person.differenz >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {person.differenz >= 0 ? "+" : ""}
                    {person.differenz.toFixed(2)}h
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500">Urlaub</p>
                  <p className="font-semibold text-zinc-900">
                    {person.urlaubstagePerson}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500">Krank</p>
                  <p className="font-semibold text-zinc-900">
                    {person.kranktagePerson}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500">ÜA Tage</p>
                  <p className="font-semibold text-orange-600">
                    {person.ueberstundenabbauPerson}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500">ÜA Stunden</p>
                  <p className="font-bold text-orange-600">
                    -{person.ueberstundenAbbauStunden.toFixed(2)}h
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <div className="min-w-[1150px]">
            <div className="grid grid-cols-8 border-b border-zinc-300 pb-4 font-bold text-zinc-800">
              <div>Name</div>
              <div>Rolle</div>
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
                className="grid grid-cols-8 items-center border-b border-zinc-200 py-4"
              >
                <div className="font-medium text-zinc-900">{person.name}</div>

                <div className="text-zinc-800">{person.rolle}</div>

                <div className="text-zinc-800">
                  {person.sollstunden.toFixed(2)}h
                </div>

                <div className="text-zinc-800">
                  {person.iststunden.toFixed(2)}h
                </div>

                <div className="font-semibold text-zinc-900">
                  {person.angerechneteStunden.toFixed(2)}h
                </div>

                <div
                  className={`font-bold ${
                    person.differenz >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {person.differenz >= 0 ? "+" : ""}
                  {person.differenz.toFixed(2)}h
                </div>

                <div className="text-zinc-800">
                  U: {person.urlaubstagePerson} / K: {person.kranktagePerson}
                </div>

                <div className="font-bold text-orange-600">
                  -{person.ueberstundenAbbauStunden.toFixed(2)}h
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="mb-5 text-xl font-bold text-zinc-900 md:text-2xl">
          Projektstunden diesen Monat
        </h2>

        <div className="space-y-4 md:hidden">
          {projektStunden.map((projekt) => (
            <div
              key={projekt.name}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="font-bold text-zinc-900">{projekt.name}</div>

                <div className="font-extrabold text-zinc-900">
                  {projekt.stunden.toFixed(2)}h
                </div>
              </div>

              <p className="mt-2 text-sm text-zinc-600">
                Kunde: {projekt.kunde}
              </p>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-3 border-b border-zinc-300 pb-4 font-bold text-zinc-800">
              <div>Projekt</div>
              <div>Kunde</div>
              <div>Stunden</div>
            </div>

            {projektStunden.map((projekt) => (
              <div
                key={projekt.name}
                className="grid grid-cols-3 items-center border-b border-zinc-200 py-4"
              >
                <div className="font-medium text-zinc-900">{projekt.name}</div>
                <div className="text-zinc-800">{projekt.kunde}</div>
                <div className="font-bold text-zinc-900">
                  {projekt.stunden.toFixed(2)}h
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
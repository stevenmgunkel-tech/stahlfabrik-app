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

  const gesamtstunden = arbeitszeiten.reduce(
    (sum, eintrag) => sum + Number(eintrag.stunden || 0),
    0
  );

  const offeneAntraege = urlaub.filter(
    (eintrag) => eintrag.status === "Beantragt"
  ).length;

  const kranktage = urlaub
    .filter((eintrag) => eintrag.typ === "Krank")
    .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

  const urlaubstage = urlaub
    .filter((eintrag) => eintrag.typ === "Urlaub")
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
          <p className="mb-2 font-semibold text-zinc-300">
            Gesamtstunden Monat
          </p>

          <p className="text-4xl font-extrabold text-orange-400 md:text-5xl">
            {loading ? "..." : `${gesamtstunden.toFixed(2)}h`}
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
          <p className="mb-2 font-semibold text-zinc-600">Projekte</p>

          <p className="text-4xl font-extrabold text-zinc-900 md:text-5xl">
            {loading ? "..." : projekte.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="mb-5 text-xl font-bold text-zinc-900 md:text-2xl">
            Abwesenheiten diesen Monat
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          Mitarbeiterübersicht
        </h2>

        <div className="space-y-4 md:hidden">
          {mitarbeiter.map((person) => (
            <div
              key={person.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="text-lg font-bold text-zinc-900">
                {person.name}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-zinc-500">Rolle</p>
                  <p className="font-semibold text-zinc-900">
                    {person.rolle}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500">Wochenstunden</p>
                  <p className="font-semibold text-zinc-900">
                    {person.wochenstunden}h
                  </p>
                </div>

                <div>
                  <p className="text-zinc-500">Urlaubstage</p>
                  <p className="font-semibold text-zinc-900">
                    {person.urlaubstage}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-4 border-b border-zinc-300 pb-4 font-bold text-zinc-800">
              <div>Name</div>
              <div>Rolle</div>
              <div>Wochenstunden</div>
              <div>Urlaubstage</div>
            </div>

            {mitarbeiter.map((person) => (
              <div
                key={person.id}
                className="grid grid-cols-4 items-center border-b border-zinc-200 py-4"
              >
                <div className="font-medium text-zinc-900">
                  {person.name}
                </div>
                <div className="text-zinc-800">{person.rolle}</div>
                <div className="text-zinc-800">{person.wochenstunden}h</div>
                <div className="text-zinc-800">{person.urlaubstage}</div>
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
                <div className="font-bold text-zinc-900">
                  {projekt.name}
                </div>

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
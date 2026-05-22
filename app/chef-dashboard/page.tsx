"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ChefDashboardPage() {
  const [mitarbeiter, setMitarbeiter] = useState<any[]>([]);
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [urlaub, setUrlaub] = useState<any[]>([]);
  const [projekte, setProjekte] = useState<any[]>([]);

  const monat = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    async function ladeDaten() {
      const userData = await supabase.auth.getUser();
      const user = userData.data.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: adminCheck } = await supabase
        .from("mitarbeiter")
        .select("*")
        .eq("user_id", user.id)
        .single();

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

      const { data: mitarbeiterData } = await supabase
        .from("mitarbeiter")
        .select("*");

      const { data: arbeitszeitenData } = await supabase
        .from("arbeitszeiten")
        .select("*")
        .gte("datum", start)
        .lte("datum", ende);

      const { data: urlaubData } = await supabase
        .from("urlaub")
        .select("*")
        .gte("von", start)
        .lte("bis", ende);

      const { data: projekteData } = await supabase
        .from("projekte")
        .select("*");

      if (mitarbeiterData) setMitarbeiter(mitarbeiterData);
      if (arbeitszeitenData) setArbeitszeiten(arbeitszeitenData);
      if (urlaubData) setUrlaub(urlaubData);
      if (projekteData) setProjekte(projekteData);
    }

    ladeDaten();
  }, []);

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
    <main>
      <h1 className="text-5xl font-extrabold text-zinc-900 mb-3">
        Chef Dashboard
      </h1>

      <p className="text-zinc-700 text-lg mb-10 font-medium">
        Firmenübersicht für StahlFabrik
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-sm">
          <p className="text-zinc-300 font-semibold mb-2">
            Gesamtstunden Monat
          </p>

          <p className="text-5xl font-extrabold text-orange-400">
            {gesamtstunden.toFixed(2)}h
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-zinc-600 font-semibold mb-2">
            Mitarbeiter
          </p>

          <p className="text-5xl font-extrabold text-zinc-900">
            {mitarbeiter.length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-zinc-600 font-semibold mb-2">
            Offene Anträge
          </p>

          <p className="text-5xl font-extrabold text-zinc-900">
            {offeneAntraege}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-zinc-600 font-semibold mb-2">
            Projekte
          </p>

          <p className="text-5xl font-extrabold text-zinc-900">
            {projekte.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
          <h2 className="text-2xl font-bold text-zinc-900 mb-6">
            Abwesenheiten diesen Monat
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-100 border border-zinc-200 p-5 rounded-xl">
              <p className="text-zinc-600 font-semibold mb-2">
                Urlaubstage
              </p>

              <p className="text-4xl font-extrabold text-zinc-900">
                {urlaubstage}
              </p>
            </div>

            <div className="bg-zinc-100 border border-zinc-200 p-5 rounded-xl">
              <p className="text-zinc-600 font-semibold mb-2">
                Kranktage
              </p>

              <p className="text-4xl font-extrabold text-zinc-900">
                {kranktage}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 text-white rounded-2xl shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-6">
            Schnellzugriff
          </h2>

          <div className="space-y-3">
            <a
              href="/admin"
              className="block bg-zinc-800 hover:bg-orange-500 transition p-4 rounded-xl font-bold"
            >
              Urlaubsanträge prüfen
            </a>

            <a
              href="/monatsansicht"
              className="block bg-zinc-800 hover:bg-orange-500 transition p-4 rounded-xl font-bold"
            >
              Monatsansicht öffnen
            </a>

            <a
              href="/projekte"
              className="block bg-zinc-800 hover:bg-orange-500 transition p-4 rounded-xl font-bold"
            >
              Projekte verwalten
            </a>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 mb-8">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">
          Mitarbeiterübersicht
        </h2>

        <div className="grid grid-cols-4 font-bold text-zinc-800 border-b border-zinc-300 pb-4 mb-4">
          <div>Name</div>
          <div>Rolle</div>
          <div>Wochenstunden</div>
          <div>Urlaubstage</div>
        </div>

        {mitarbeiter.map((person) => (
          <div
            key={person.id}
            className="grid grid-cols-4 py-4 border-b border-zinc-200 items-center"
          >
            <div className="text-zinc-900 font-medium">{person.name}</div>
            <div className="text-zinc-800">{person.rolle}</div>
            <div className="text-zinc-800">{person.wochenstunden}h</div>
            <div className="text-zinc-800">{person.urlaubstage}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">
          Projektstunden diesen Monat
        </h2>

        <div className="grid grid-cols-3 font-bold text-zinc-800 border-b border-zinc-300 pb-4 mb-4">
          <div>Projekt</div>
          <div>Kunde</div>
          <div>Stunden</div>
        </div>

        {projektStunden.map((projekt) => (
          <div
            key={projekt.name}
            className="grid grid-cols-3 py-4 border-b border-zinc-200 items-center"
          >
            <div className="text-zinc-900 font-medium">{projekt.name}</div>
            <div className="text-zinc-800">{projekt.kunde}</div>
            <div className="text-zinc-900 font-bold">
              {projekt.stunden.toFixed(2)}h
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
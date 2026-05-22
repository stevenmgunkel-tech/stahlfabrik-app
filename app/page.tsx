"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function HomePage() {

  const [mitarbeiter, setMitarbeiter] = useState(0);
  const [projekte, setProjekte] = useState(0);
  const [urlaub, setUrlaub] = useState(0);
  const [stunden, setStunden] = useState(0);

  useEffect(() => {

    async function ladeDashboard() {

      // Mitarbeiter
      const { data: mitarbeiterData } = await supabase
        .from("mitarbeiter")
        .select("*");

      if (mitarbeiterData) {
        setMitarbeiter(mitarbeiterData.length);
      }

      // Projekte
      const { data: projektData } = await supabase
        .from("projekte")
        .select("*");

      if (projektData) {
        setProjekte(projektData.length);
      }

      // Urlaub
      const { data: urlaubData } = await supabase
        .from("urlaub")
        .select("*");

      if (urlaubData) {
        setUrlaub(urlaubData.length);
      }

      // Arbeitszeiten
      const { data: zeitData } = await supabase
        .from("arbeitszeiten")
        .select("*");

      if (zeitData) {

        const gesamtstunden = zeitData.reduce(
          (sum, eintrag) => sum + Number(eintrag.stunden),
          0
        );

        setStunden(gesamtstunden);
      }

    }

    ladeDashboard();

  }, []);

  return (

    <main>

      <div className="mb-10">

        <p className="text-orange-600 font-bold uppercase tracking-widest mb-3">
          StahlFabrik Control Center
        </p>

        <h1 className="text-5xl font-extrabold text-zinc-900 mb-3">
          Betriebsübersicht
        </h1>

        <p className="text-zinc-700 text-lg font-medium">
          Arbeitszeiten, Projekte, Mitarbeiter und Abwesenheiten auf einen Blick.
        </p>

      </div>

      {/* Statistik Karten */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">

        <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-sm">

          <p className="text-zinc-300 font-semibold mb-3">
            Arbeitsstunden
          </p>

          <h2 className="text-5xl font-extrabold">
            {stunden}h
          </h2>

          <p className="text-orange-400 font-semibold mt-4">
            Gesamt erfasst
          </p>

        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">

          <p className="text-zinc-700 font-semibold mb-3">
            Mitarbeiter
          </p>

          <h2 className="text-5xl font-extrabold text-zinc-900">
            {mitarbeiter}
          </h2>

          <p className="text-zinc-600 font-medium mt-4">
            Registriert
          </p>

        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">

          <p className="text-zinc-700 font-semibold mb-3">
            Projekte
          </p>

          <h2 className="text-5xl font-extrabold text-zinc-900">
            {projekte}
          </h2>

          <p className="text-zinc-600 font-medium mt-4">
            Aktiv
          </p>

        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">

          <p className="text-zinc-700 font-semibold mb-3">
            Urlaub
          </p>

          <h2 className="text-5xl font-extrabold text-zinc-900">
            {urlaub}
          </h2>

          <p className="text-zinc-600 font-medium mt-4">
            Anträge
          </p>

        </div>

      </div>

      {/* Schnellaktionen */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        <div className="xl:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">

          <h2 className="text-2xl font-bold text-zinc-900 mb-6">
            Schnellzugriff
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <a
              href="/arbeitszeiten"
              className="bg-zinc-900 hover:bg-orange-500 transition text-white p-5 rounded-xl font-bold"
            >
              Arbeitszeiten verwalten
            </a>

            <a
              href="/mitarbeiter"
              className="bg-zinc-900 hover:bg-orange-500 transition text-white p-5 rounded-xl font-bold"
            >
              Mitarbeiter verwalten
            </a>

            <a
              href="/projekte"
              className="bg-zinc-900 hover:bg-orange-500 transition text-white p-5 rounded-xl font-bold"
            >
              Projekte verwalten
            </a>

            <a
              href="/urlaub"
              className="bg-zinc-900 hover:bg-orange-500 transition text-white p-5 rounded-xl font-bold"
            >
              Urlaub verwalten
            </a>

          </div>

        </div>

        {/* Rechte Card */}
        <div className="bg-zinc-900 text-white rounded-2xl shadow-sm p-6">

          <h2 className="text-2xl font-bold mb-4">
            StahlFabrik
          </h2>

          <p className="text-zinc-300 leading-relaxed">
            Moderne Verwaltung für Metallveredlung,
            Produktion und Mitarbeiterorganisation.
          </p>

          <div className="mt-8">

            <div className="flex justify-between mb-3">
              <span className="text-zinc-400">
                Systemstatus
              </span>

              <span className="text-green-400 font-bold">
                Online
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-zinc-400">
                Datenbank
              </span>

              <span className="text-green-400 font-bold">
                Verbunden
              </span>
            </div>

          </div>

        </div>

      </div>

    </main>

  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { istFeiertagSG, getFeiertageSG } from "../../lib/feiertage";

export default function MonatsansichtPage() {
  const [zeiten, setZeiten] = useState<any[]>([]);
  const [monat, setMonat] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [wochenstunden, setWochenstunden] = useState(40);
  const [ueberstundenStart, setUeberstundenStart] = useState(0);

  useEffect(() => {
    async function ladeZeiten() {
      const userData = await supabase.auth.getUser();
      const user = userData.data.user;

      if (!user) return;

      const { data: mitarbeiter } = await supabase
        .from("mitarbeiter")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (mitarbeiter) {
        if (mitarbeiter.wochenstunden) {
          setWochenstunden(mitarbeiter.wochenstunden);
        }

        if (mitarbeiter.ueberstunden_start) {
          setUeberstundenStart(mitarbeiter.ueberstunden_start);
        }
      }

      const start = `${monat}-01`;

      const ende = new Date(
        Number(monat.slice(0, 4)),
        Number(monat.slice(5, 7)),
        0
      )
        .toISOString()
        .split("T")[0];

      const { data, error } = await supabase
        .from("arbeitszeiten")
        .select("*")
        .eq("user_id", user.id)
        .gte("datum", start)
        .lte("datum", ende)
        .order("datum", { ascending: true });

      if (data) setZeiten(data);
      if (error) console.log(error);
    }

    ladeZeiten();
  }, [monat]);

  const gesamtstunden = zeiten.reduce(
    (sum, eintrag) => sum + Number(eintrag.stunden || 0),
    0
  );

  function berechneArbeitstage() {
    const jahr = Number(monat.slice(0, 4));
    const monatNummer = Number(monat.slice(5, 7));
    const tageImMonat = new Date(jahr, monatNummer, 0).getDate();

    let arbeitstage = 0;

    for (let tag = 1; tag <= tageImMonat; tag++) {
      const datum = new Date(jahr, monatNummer - 1, tag);
      const wochentag = datum.getDay();

      const istWochenende = wochentag === 0 || wochentag === 6;
      const istFeiertag = istFeiertagSG(datum);

      if (!istWochenende && !istFeiertag) {
        arbeitstage++;
      }
    }

    return arbeitstage;
  }

  function feiertageImMonat() {
    const jahr = Number(monat.slice(0, 4));
    const monatNummer = Number(monat.slice(5, 7));

    return getFeiertageSG(jahr).filter((feiertag) => {
      const datum = new Date(feiertag.datum);
      const wochentag = datum.getDay();

      return (
        datum.getMonth() + 1 === monatNummer &&
        wochentag !== 0 &&
        wochentag !== 6
      );
    });
  }

  const arbeitstage = berechneArbeitstage();
  const feiertage = feiertageImMonat();

  const sollstunden = (wochenstunden / 5) * arbeitstage;
  const differenz = gesamtstunden - sollstunden;
  const gesamtUeberstunden = ueberstundenStart + differenz;

  return (
    <main>
      <h1 className="text-5xl font-extrabold text-zinc-900 mb-3">
        Monatsansicht
      </h1>

      <p className="text-zinc-700 text-lg mb-10 font-medium">
        Eigene Monatsübersicht mit Feiertagen SG, Sollstunden und Überstunden
      </p>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-zinc-600 font-semibold mb-2">
            Monat
          </p>

          <input
            type="month"
            value={monat}
            onChange={(e) => setMonat(e.target.value)}
            className="border border-zinc-300 rounded-xl p-3 text-zinc-900 w-full"
          />
        </div>

        <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-sm">
          <p className="text-zinc-300 font-semibold mb-2">
            Iststunden
          </p>

          <p className="text-5xl font-extrabold text-orange-400">
            {gesamtstunden.toFixed(2)}h
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-zinc-600 font-semibold mb-2">
            Sollstunden
          </p>

          <p className="text-5xl font-extrabold text-zinc-900">
            {sollstunden.toFixed(2)}h
          </p>
        </div>

        <div
          className={`p-6 rounded-2xl shadow-sm ${
            differenz >= 0
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          <p className="font-semibold mb-2">
            Monat
          </p>

          <p className="text-5xl font-extrabold">
            {differenz.toFixed(2)}h
          </p>
        </div>

        <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-sm">
          <p className="text-zinc-300 font-semibold mb-2">
            Gesamt Überstunden
          </p>

          <p className="text-5xl font-extrabold text-orange-400">
            {gesamtUeberstunden.toFixed(2)}h
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-zinc-600 font-semibold mb-2">
            Wochenstunden
          </p>

          <p className="text-4xl font-extrabold text-zinc-900">
            {wochenstunden}h
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-zinc-600 font-semibold mb-2">
            Arbeitstage
          </p>

          <p className="text-4xl font-extrabold text-zinc-900">
            {arbeitstage}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-zinc-600 font-semibold mb-2">
            Feiertage SG
          </p>

          <p className="text-4xl font-extrabold text-zinc-900">
            {feiertage.length}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-zinc-600 font-semibold mb-2">
            Einträge
          </p>

          <p className="text-4xl font-extrabold text-zinc-900">
            {zeiten.length}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-zinc-600 font-semibold mb-2">
            Start Überstunden
          </p>

          <p className="text-4xl font-extrabold text-zinc-900">
            {ueberstundenStart.toFixed(2)}h
          </p>
        </div>
      </div>

      {feiertage.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 mb-6">
            Feiertage im Monat
          </h2>

          <div className="space-y-3">
            {feiertage.map((feiertag) => (
              <div
                key={feiertag.datum}
                className="flex justify-between border-b border-zinc-200 pb-3"
              >
                <span className="text-zinc-900 font-semibold">
                  {feiertag.name}
                </span>

                <span className="text-zinc-700 font-medium">
                  {feiertag.datum}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">
          Eigene Arbeitszeiten
        </h2>

        <div className="grid grid-cols-6 font-bold text-zinc-800 border-b border-zinc-300 pb-4 mb-4">
          <div>Datum</div>
          <div>Projekt</div>
          <div>Start</div>
          <div>Ende</div>
          <div>Pause</div>
          <div>Stunden</div>
        </div>

        {zeiten.map((zeit) => (
          <div
            key={zeit.id}
            className="grid grid-cols-6 py-4 border-b border-zinc-200 items-center"
          >
            <div className="text-zinc-900 font-medium">
              {zeit.datum}
            </div>

            <div className="text-zinc-800">
              {zeit.projekt}
            </div>

            <div className="text-zinc-800">
              {zeit.startzeit || "-"}
            </div>

            <div className="text-zinc-800">
              {zeit.endzeit || "-"}
            </div>

            <div className="text-zinc-800">
              {zeit.pause || 0} Min.
            </div>

            <div className="text-zinc-900 font-bold">
              {zeit.stunden}h
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
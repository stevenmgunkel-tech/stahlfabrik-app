"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { istFeiertagSG, getFeiertageSG } from "../../lib/feiertage";

export default function MonatsansichtPage() {
  const [zeiten, setZeiten] = useState<any[]>([]);
  const [abwesenheiten, setAbwesenheiten] = useState<any[]>([]);
  const [monat, setMonat] = useState(new Date().toISOString().slice(0, 7));

  const [wochenstunden, setWochenstunden] = useState(40);
  const [ueberstundenStart, setUeberstundenStart] = useState(0);

  const [loading, setLoading] = useState(true);
  const [meldung, setMeldung] = useState("");

  useEffect(() => {
    async function ladeZeiten() {
      setLoading(true);
      setMeldung("");

      const userData = await supabase.auth.getUser();
      const user = userData.data.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: mitarbeiter, error: mitarbeiterError } = await supabase
        .from("mitarbeiter")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (mitarbeiterError) {
        setMeldung(mitarbeiterError.message);
        console.log(mitarbeiterError);
      }

      if (mitarbeiter) {
        setWochenstunden(Number(mitarbeiter.wochenstunden || 40));
        setUeberstundenStart(Number(mitarbeiter.ueberstunden_start || 0));
      }

      const start = `${monat}-01`;

      const ende = new Date(
        Number(monat.slice(0, 4)),
        Number(monat.slice(5, 7)),
        0
      )
        .toISOString()
        .split("T")[0];

      const { data: zeitenData, error: zeitenError } = await supabase
        .from("arbeitszeiten")
        .select("*")
        .eq("user_id", user.id)
        .gte("datum", start)
        .lte("datum", ende)
        .order("datum", { ascending: true });

      const { data: abwesenheitenData, error: abwesenheitenError } =
        await supabase
          .from("urlaub")
          .select("*")
          .eq("user_id", user.id)
          .gte("von", start)
          .lte("bis", ende)
          .order("von", { ascending: true });

      if (zeitenError) {
        setMeldung(zeitenError.message);
        console.log(zeitenError);
      }

      if (abwesenheitenError) {
        setMeldung(abwesenheitenError.message);
        console.log(abwesenheitenError);
      }

      setZeiten(zeitenData || []);
      setAbwesenheiten(abwesenheitenData || []);
      setLoading(false);
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

  const tagesSoll = wochenstunden / 5;

  const sollstunden = tagesSoll * arbeitstage;

  const urlaubstage = abwesenheiten
    .filter(
      (eintrag) =>
        eintrag.typ === "Urlaub" &&
        eintrag.status === "Genehmigt"
    )
    .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

  const kranktage = abwesenheiten
    .filter((eintrag) => eintrag.typ === "Krank")
    .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

  const ueberstundenabbauTage = abwesenheiten
    .filter(
      (eintrag) =>
        eintrag.typ === "Überstundenabbau" &&
        eintrag.status === "Genehmigt"
    )
    .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

  const bezahlteAbwesenheitstage =
    urlaubstage + kranktage + ueberstundenabbauTage;

  const abwesenheitsstunden =
    bezahlteAbwesenheitstage * tagesSoll;

  const angerechneteStunden =
    gesamtstunden + abwesenheitsstunden;

  const differenz =
    angerechneteStunden - sollstunden;

  const ueberstundenAbbauStunden =
    ueberstundenabbauTage * tagesSoll;

  const gesamtUeberstunden =
    ueberstundenStart +
    differenz -
    ueberstundenAbbauStunden;

  function typFarbe(typ: string) {
    if (typ === "Urlaub") {
      return "bg-blue-100 text-blue-800";
    }

    if (typ === "Krank") {
      return "bg-red-100 text-red-800";
    }

    if (typ === "Überstundenabbau") {
      return "bg-orange-100 text-orange-800";
    }

    return "bg-zinc-100 text-zinc-800";
  }

  return (
    <main>
      <h1 className="mb-3 text-5xl font-extrabold text-zinc-900">
        Monatsansicht
      </h1>

      <p className="mb-10 text-lg font-medium text-zinc-700">
        Eigene Monatsübersicht mit Feiertagen SG, Sollstunden und Überstunden
      </p>

      {meldung && (
        <div className="mb-6 rounded-xl bg-zinc-900 p-3 text-sm font-semibold text-white">
          {meldung}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-5">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="mb-2 font-semibold text-zinc-600">Monat</p>

          <input
            type="month"
            value={monat}
            onChange={(e) => setMonat(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 p-3 text-zinc-900"
          />
        </div>

        <div className="rounded-2xl bg-zinc-900 p-6 text-white shadow-sm">
          <p className="mb-2 font-semibold text-zinc-300">
            Iststunden
          </p>

          <p className="text-5xl font-extrabold text-orange-400">
            {loading ? "..." : `${gesamtstunden.toFixed(2)}h`}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="mb-2 font-semibold text-zinc-600">
            Abwesenheit
          </p>

          <p className="text-5xl font-extrabold text-zinc-900">
            {loading ? "..." : `${abwesenheitsstunden.toFixed(2)}h`}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="mb-2 font-semibold text-zinc-600">
            Sollstunden
          </p>

          <p className="text-5xl font-extrabold text-zinc-900">
            {loading ? "..." : `${sollstunden.toFixed(2)}h`}
          </p>
        </div>

        <div
          className={`rounded-2xl p-6 shadow-sm ${
            differenz >= 0
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          <p className="mb-2 font-semibold">Monat</p>

          <p className="text-5xl font-extrabold">
            {loading
              ? "..."
              : `${differenz >= 0 ? "+" : ""}${differenz.toFixed(
                  2
                )}h`}
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-6">
        <div className="rounded-2xl bg-zinc-900 p-6 text-white shadow-sm">
          <p className="mb-2 font-semibold text-zinc-300">
            Gesamt Überstunden
          </p>

          <p className="text-5xl font-extrabold text-orange-400">
            {loading
              ? "..."
              : `${gesamtUeberstunden.toFixed(2)}h`}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-2 font-semibold text-zinc-600">
            Wochenstunden
          </p>

          <p className="text-4xl font-extrabold text-zinc-900">
            {loading ? "..." : `${wochenstunden}h`}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-2 font-semibold text-zinc-600">
            Arbeitstage
          </p>

          <p className="text-4xl font-extrabold text-zinc-900">
            {loading ? "..." : arbeitstage}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-2 font-semibold text-zinc-600">
            Feiertage SG
          </p>

          <p className="text-4xl font-extrabold text-zinc-900">
            {loading ? "..." : feiertage.length}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-2 font-semibold text-zinc-600">
            Urlaub
          </p>

          <p className="text-4xl font-extrabold text-zinc-900">
            {urlaubstage}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-2 font-semibold text-zinc-600">
            Überstundenabbau
          </p>

          <p className="text-4xl font-extrabold text-orange-500">
            -{ueberstundenAbbauStunden.toFixed(2)}h
          </p>
        </div>
      </div>
    </main>
  );
}
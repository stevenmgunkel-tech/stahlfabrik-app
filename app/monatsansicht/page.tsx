"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { supabase } from "../../lib/supabase";
import { istFeiertagSG, getFeiertageSG } from "../../lib/feiertage";

export default function MonatsansichtPage() {
  const [zeiten, setZeiten] = useState<any[]>([]);
  const [tagespausen, setTagespausen] = useState<any[]>([]);
  const [abwesenheiten, setAbwesenheiten] = useState<any[]>([]);
  const [monat, setMonat] = useState(new Date().toISOString().slice(0, 7));

  const [wochenstunden, setWochenstunden] = useState(40);
  const [ueberstundenStart, setUeberstundenStart] = useState(0);
  const [eintrittsdatum, setEintrittsdatum] = useState("");

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
        setEintrittsdatum(mitarbeiter.eintrittsdatum || "");
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

      const { data: pausenData, error: pausenError } = await supabase
        .from("tagespausen")
        .select("*")
        .eq("user_id", user.id)
        .gte("datum", start)
        .lte("datum", ende);

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

      if (pausenError) {
        setMeldung(pausenError.message);
        console.log(pausenError);
      }

      if (abwesenheitenError) {
        setMeldung(abwesenheitenError.message);
        console.log(abwesenheitenError);
      }

      setZeiten(zeitenData || []);
      setTagespausen(pausenData || []);
      setAbwesenheiten(abwesenheitenData || []);
      setLoading(false);
    }

    ladeZeiten();
  }, [monat]);

  const bruttoArbeitsstunden = zeiten.reduce(
    (sum, eintrag) => sum + Number(eintrag.stunden || 0),
    0
  );

  const tagespausenStunden = tagespausen.reduce(
    (sum, pause) => sum + Number(pause.pause || 0) / 60,
    0
  );

  const gesamtstunden = bruttoArbeitsstunden - tagespausenStunden;

  function monatVorEintritt() {
    if (!eintrittsdatum) return false;

    const ausgewaehlterMonat = new Date(`${monat}-01`);
    const eintritt = new Date(eintrittsdatum);

    return (
      ausgewaehlterMonat.getFullYear() < eintritt.getFullYear() ||
      (ausgewaehlterMonat.getFullYear() === eintritt.getFullYear() &&
        ausgewaehlterMonat.getMonth() < eintritt.getMonth())
    );
  }

  function berechneArbeitstage() {
    if (monatVorEintritt()) return 0;

    const jahr = Number(monat.slice(0, 4));
    const monatNummer = Number(monat.slice(5, 7));
    const tageImMonat = new Date(jahr, monatNummer, 0).getDate();

    let arbeitstage = 0;

    for (let tag = 1; tag <= tageImMonat; tag++) {
      const datum = new Date(jahr, monatNummer - 1, tag);

      if (eintrittsdatum) {
        const eintritt = new Date(eintrittsdatum);
        if (datum < eintritt) continue;
      }

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
    if (monatVorEintritt()) return [];

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
        eintrag.typ === "Urlaub" && eintrag.status === "Genehmigt"
    )
    .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

  const kranktage = abwesenheiten
    .filter((eintrag) => eintrag.typ === "Krank")
    .reduce((sum, eintrag) => sum + Number(eintrag.tage || 0), 0);

  const ueberstundenAbbauStunden = abwesenheiten
    .filter(
      (eintrag) =>
        eintrag.typ === "Überstundenabbau" &&
        eintrag.status === "Genehmigt"
    )
    .reduce((sum, eintrag) => sum + Number(eintrag.stunden || 0), 0);

  const bezahlteAbwesenheitstage = urlaubstage + kranktage;
  const abwesenheitsstunden = bezahlteAbwesenheitstage * tagesSoll;

  const angerechneteStunden =
    gesamtstunden + abwesenheitsstunden + ueberstundenAbbauStunden;

  const differenz = angerechneteStunden - sollstunden;

  const gesamtUeberstunden =
    ueberstundenStart + differenz - ueberstundenAbbauStunden;

  function exportPdf() {
    const pdf = new jsPDF();

    pdf.setFontSize(22);
    pdf.text("StahlFabrik Monatsrapport", 20, 20);

    pdf.setFontSize(12);
    pdf.text(`Monat: ${monat}`, 20, 38);
    pdf.text(`Wochenstunden: ${wochenstunden.toFixed(2)}h`, 20, 48);
    pdf.text(`Arbeitstage: ${arbeitstage}`, 20, 58);
    pdf.text(`Feiertage SG: ${feiertage.length}`, 20, 68);

    pdf.setFontSize(16);
    pdf.text("Arbeitszeit", 20, 88);

    pdf.setFontSize(12);
    pdf.text(`Sollstunden: ${sollstunden.toFixed(2)}h`, 20, 102);
    pdf.text(`Brutto Arbeitsstunden: ${bruttoArbeitsstunden.toFixed(2)}h`, 20, 112);
    pdf.text(`Tagespausen: -${tagespausenStunden.toFixed(2)}h`, 20, 122);
    pdf.text(`Iststunden netto: ${gesamtstunden.toFixed(2)}h`, 20, 132);
    pdf.text(`Abwesenheitsstunden: ${abwesenheitsstunden.toFixed(2)}h`, 20, 142);
    pdf.text(`Monatsdifferenz: ${differenz >= 0 ? "+" : ""}${differenz.toFixed(2)}h`, 20, 152);

    pdf.setFontSize(16);
    pdf.text("Abwesenheiten", 20, 172);

    pdf.setFontSize(12);
    pdf.text(`Urlaubstage: ${urlaubstage}`, 20, 186);
    pdf.text(`Kranktage: ${kranktage}`, 20, 196);
    pdf.text(`Überstundenabbau: -${ueberstundenAbbauStunden.toFixed(2)}h`, 20, 206);

    pdf.setFontSize(16);
    pdf.text("Überstunden", 20, 226);

    pdf.setFontSize(12);
    pdf.text(`Startwert: ${ueberstundenStart.toFixed(2)}h`, 20, 240);
    pdf.text(`Gesamtüberstunden: ${gesamtUeberstunden.toFixed(2)}h`, 20, 250);

    pdf.setFontSize(10);
    pdf.text("Erstellt mit StahlFabrik ERP", 20, 285);

    pdf.save(`Monatsrapport-${monat}.pdf`);
  }

  return (
    <main>
      <div className="mb-6 flex justify-end">
  <button
    onClick={exportPdf}
    className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-500"
  >
    📄 PDF
  </button>
</div>

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
          <p className="mb-2 font-semibold text-zinc-300">Iststunden</p>

          <p className="text-5xl font-extrabold text-orange-400">
            {loading ? "..." : `${gesamtstunden.toFixed(2)}h`}
          </p>

          <p className="mt-2 text-sm text-zinc-400">
            Brutto {bruttoArbeitsstunden.toFixed(2)}h · Pause{" "}
            {tagespausenStunden.toFixed(2)}h
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="mb-2 font-semibold text-zinc-600">Abwesenheit</p>

          <p className="text-5xl font-extrabold text-zinc-900">
            {loading ? "..." : `${abwesenheitsstunden.toFixed(2)}h`}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="mb-2 font-semibold text-zinc-600">Sollstunden</p>

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
              : `${differenz >= 0 ? "+" : ""}${differenz.toFixed(2)}h`}
          </p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-6">
        <div className="rounded-2xl bg-zinc-900 p-6 text-white shadow-sm">
          <p className="mb-2 font-semibold text-zinc-300">
            Gesamt Überstunden
          </p>

          <p className="text-5xl font-extrabold text-orange-400">
            {loading ? "..." : `${gesamtUeberstunden.toFixed(2)}h`}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-2 font-semibold text-zinc-600">Wochenstunden</p>

          <p className="text-4xl font-extrabold text-zinc-900">
            {loading ? "..." : `${wochenstunden}h`}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-2 font-semibold text-zinc-600">Arbeitstage</p>

          <p className="text-4xl font-extrabold text-zinc-900">
            {loading ? "..." : arbeitstage}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-2 font-semibold text-zinc-600">Feiertage SG</p>

          <p className="text-4xl font-extrabold text-zinc-900">
            {loading ? "..." : feiertage.length}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="mb-2 font-semibold text-zinc-600">Urlaub</p>

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
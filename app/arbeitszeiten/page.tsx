"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ArbeitszeitenPage() {
  const [zeiten, setZeiten] = useState<any[]>([]);
  const [projekte, setProjekte] = useState<any[]>([]);

  const [datum, setDatum] = useState("");
  const [projekt, setProjekt] = useState("");
  const [startzeit, setStartzeit] = useState("");
  const [endzeit, setEndzeit] = useState("");
  const [pause, setPause] = useState("");

  const [saving, setSaving] = useState(false);
  const [meldung, setMeldung] = useState("");

  async function ladeDaten() {
    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: zeitData, error: zeitError } = await supabase
      .from("arbeitszeiten")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (zeitError) {
      setMeldung(zeitError.message);
      console.log(zeitError);
    }

    if (zeitData) setZeiten(zeitData);

    const { data: projektData, error: projektError } = await supabase
      .from("projekte")
      .select("*")
      .order("name", { ascending: true });

    if (projektError) {
      setMeldung(projektError.message);
      console.log(projektError);
    }

    if (projektData) setProjekte(projektData);
  }

  useEffect(() => {
    ladeDaten();
  }, []);

  function berechneStunden() {
    if (!startzeit || !endzeit) return 0;

    const [startH, startM] = startzeit.split(":").map(Number);
    const [endH, endM] = endzeit.split(":").map(Number);

    const startMinuten = startH * 60 + startM;
    const endMinuten = endH * 60 + endM;
    const pauseMinuten = Number(pause || 0);

    const arbeitsMinuten =
      endMinuten - startMinuten - pauseMinuten;

    if (arbeitsMinuten <= 0) return 0;

    return Number((arbeitsMinuten / 60).toFixed(2));
  }

  async function zeitHinzufuegen() {
    setMeldung("");

    if (!datum || !projekt || !startzeit || !endzeit) {
      setMeldung("Bitte Datum, Projekt, Start und Ende ausfüllen.");
      return;
    }

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      setMeldung("Bitte zuerst einloggen.");
      window.location.href = "/login";
      return;
    }

    setSaving(true);

    const berechneteStunden = berechneStunden();

    const { error } = await supabase.from("arbeitszeiten").insert([
      {
        datum,
        projekt,
        startzeit,
        endzeit,
        pause: Number(pause || 0),
        stunden: berechneteStunden,
        user_id: user.id,
      },
    ]);

    if (error) {
      setSaving(false);
      setMeldung(error.message);
      console.log(error);
      return;
    }

    setDatum("");
    setProjekt("");
    setStartzeit("");
    setEndzeit("");
    setPause("");

    await ladeDaten();

    setSaving(false);
    setMeldung("Arbeitszeit gespeichert.");
  }

  async function zeitLoeschen(id: number) {
    const bestaetigen = confirm("Arbeitszeit wirklich löschen?");

    if (!bestaetigen) return;

    const { error } = await supabase
      .from("arbeitszeiten")
      .delete()
      .eq("id", id);

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    await ladeDaten();
    setMeldung("Arbeitszeit gelöscht.");
  }

  const vorschauStunden = berechneStunden();

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-900 md:text-5xl">
          Arbeitszeiten
        </h1>

        <p className="mt-2 text-sm text-zinc-600 md:text-lg">
          Eigene Arbeitszeiten erfassen
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="mb-6 text-xl font-bold text-zinc-900 md:text-2xl">
          Arbeitszeit erfassen
        </h2>

        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-6">
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3 text-zinc-900"
          />

          <select
            value={projekt}
            onChange={(e) => setProjekt(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3 text-zinc-900"
          >
            <option value="">Projekt auswählen</option>

            {projekte.map((projektItem) => (
              <option key={projektItem.id} value={projektItem.name}>
                {projektItem.name}
              </option>
            ))}
          </select>

          <input
            type="time"
            value={startzeit}
            onChange={(e) => setStartzeit(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3 text-zinc-900"
          />

          <input
            type="time"
            value={endzeit}
            onChange={(e) => setEndzeit(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3 text-zinc-900"
          />

          <input
            type="number"
            placeholder="Pause Min."
            value={pause}
            onChange={(e) => setPause(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3 text-zinc-900"
          />

          <button
            type="button"
            onClick={zeitHinzufuegen}
            disabled={saving}
            className="rounded-xl bg-zinc-900 p-3 font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
          >
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-100 p-4">
          <span className="font-bold">Berechnete Arbeitszeit:</span>{" "}
          <span className="font-extrabold text-orange-500">
            {vorschauStunden}h
          </span>
        </div>

        {meldung && (
          <div className="mt-4 rounded-xl bg-zinc-900 p-3 text-sm font-semibold text-white">
            {meldung}
          </div>
        )}
      </div>

      <div className="space-y-4 md:hidden">
        {zeiten.map((zeit) => (
          <div
            key={zeit.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-zinc-500">{zeit.datum}</div>

              <div className="font-bold text-orange-500">
                {zeit.stunden}h
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div>
                <span className="font-semibold">Projekt:</span>{" "}
                {zeit.projekt}
              </div>

              <div>
                <span className="font-semibold">Zeit:</span>{" "}
                {zeit.startzeit || "-"} - {zeit.endzeit || "-"}
              </div>

              <div>
                <span className="font-semibold">Pause:</span>{" "}
                {zeit.pause || 0} Min.
              </div>
            </div>

            <button
              type="button"
              onClick={() => zeitLoeschen(zeit.id)}
              className="mt-4 rounded-xl bg-red-600 p-3 font-bold text-white"
            >
              Löschen
            </button>
          </div>
        ))}
      </div>

      <div className="hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:block">
        <h2 className="mb-6 text-2xl font-bold text-zinc-900">
          Eigene Arbeitszeiten
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-[900px]">
            <thead>
              <tr className="border-b border-zinc-300 text-left">
                <th className="pb-4">Datum</th>
                <th className="pb-4">Projekt</th>
                <th className="pb-4">Start</th>
                <th className="pb-4">Ende</th>
                <th className="pb-4">Pause</th>
                <th className="pb-4">Stunden</th>
                <th className="pb-4">Aktion</th>
              </tr>
            </thead>

            <tbody>
              {zeiten.map((zeit) => (
                <tr key={zeit.id} className="border-b border-zinc-200">
                  <td className="py-4">{zeit.datum}</td>
                  <td>{zeit.projekt}</td>
                  <td>{zeit.startzeit || "-"}</td>
                  <td>{zeit.endzeit || "-"}</td>
                  <td>{zeit.pause || 0} Min.</td>
                  <td className="font-bold">{zeit.stunden}h</td>

                  <td>
                    <button
                      type="button"
                      onClick={() => zeitLoeschen(zeit.id)}
                      className="rounded-lg bg-red-600 px-4 py-2 text-white"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
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

  useEffect(() => {
    async function ladeDaten() {
      const userData = await supabase.auth.getUser();
      const user = userData.data.user;

      if (!user) return;

      const { data: zeitData } = await supabase
        .from("arbeitszeiten")
        .select("*")
        .eq("user_id", user.id)
        .order("id", { ascending: false });

      if (zeitData) {
        setZeiten(zeitData);
      }

      const { data: projektData } = await supabase
        .from("projekte")
        .select("*")
        .order("name", { ascending: true });

      if (projektData) {
        setProjekte(projektData);
      }
    }

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
    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      alert("Bitte zuerst einloggen.");
      window.location.href = "/login";
      return;
    }

    const berechneteStunden = berechneStunden();

    const { error } = await supabase
      .from("arbeitszeiten")
      .insert([
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

    if (!error) {
      alert("Arbeitszeit gespeichert.");
      location.reload();
    }

    if (error) {
      alert(error.message);
      console.log(error);
    }
  }

  async function zeitLoeschen(id: number) {
    const { error } = await supabase
      .from("arbeitszeiten")
      .delete()
      .eq("id", id);

    if (!error) {
      location.reload();
    }

    if (error) {
      alert(error.message);
      console.log(error);
    }
  }

  const vorschauStunden = berechneStunden();

  return (
    <main>
      <h1 className="text-5xl font-extrabold text-zinc-900 mb-3">
        Arbeitszeiten
      </h1>

      <p className="text-zinc-700 text-lg mb-10 font-medium">
        Eigene Arbeitszeiten erfassen
      </p>

      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">
          Arbeitszeit erfassen
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="border border-zinc-300 rounded-xl p-3 text-zinc-900"
          />

          <select
            value={projekt}
            onChange={(e) => setProjekt(e.target.value)}
            className="border border-zinc-300 rounded-xl p-3 text-zinc-900"
          >
            <option value="">
              Projekt auswählen
            </option>

            {projekte.map((projektItem) => (
              <option
                key={projektItem.id}
                value={projektItem.name}
              >
                {projektItem.name}
              </option>
            ))}
          </select>

          <input
            type="time"
            value={startzeit}
            onChange={(e) => setStartzeit(e.target.value)}
            className="border border-zinc-300 rounded-xl p-3 text-zinc-900"
          />

          <input
            type="time"
            value={endzeit}
            onChange={(e) => setEndzeit(e.target.value)}
            className="border border-zinc-300 rounded-xl p-3 text-zinc-900"
          />

          <input
            type="number"
            placeholder="Pause Min."
            value={pause}
            onChange={(e) => setPause(e.target.value)}
            className="border border-zinc-300 rounded-xl p-3 text-zinc-900"
          />

          <button
            onClick={zeitHinzufuegen}
            className="bg-zinc-900 hover:bg-orange-500 transition text-white rounded-xl font-bold"
          >
            Speichern
          </button>
        </div>

        <div className="mt-5 bg-zinc-100 border border-zinc-200 rounded-xl p-4">
          <span className="font-bold text-zinc-900">
            Berechnete Arbeitszeit:
          </span>{" "}
          <span className="text-orange-600 font-extrabold">
            {vorschauStunden}h
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">
          Eigene Arbeitszeiten
        </h2>

        <div className="grid grid-cols-7 font-bold text-zinc-800 border-b border-zinc-300 pb-4 mb-4">
          <div>Datum</div>
          <div>Projekt</div>
          <div>Start</div>
          <div>Ende</div>
          <div>Pause</div>
          <div>Stunden</div>
          <div>Aktion</div>
        </div>

        {zeiten.map((zeit) => (
          <div
            key={zeit.id}
            className="grid grid-cols-7 py-4 border-b border-zinc-200 items-center"
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

            <div className="text-zinc-800 font-bold">
              {zeit.stunden}h
            </div>

            <div>
              <button
                onClick={() => zeitLoeschen(zeit.id)}
                className="bg-red-600 hover:bg-red-700 transition text-white px-4 py-2 rounded-lg font-semibold"
              >
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
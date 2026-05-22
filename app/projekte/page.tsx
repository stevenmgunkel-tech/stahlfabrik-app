"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ProjektePage() {
  const [projekte, setProjekte] = useState<any[]>([]);

  const [name, setName] = useState("");
  const [kunde, setKunde] = useState("");

  useEffect(() => {
    async function ladeProjekte() {
      const { data, error } = await supabase
        .from("projekte")
        .select("*")
        .order("id", { ascending: false });

      if (data) setProjekte(data);
      if (error) console.log(error);
    }

    ladeProjekte();
  }, []);

  async function projektHinzufuegen() {
    const { error } = await supabase.from("projekte").insert([
      {
        name,
        kunde,
        status: "Aktiv",
      },
    ]);

    if (!error) location.reload();
    if (error) console.log(error);
  }

  async function projektLoeschen(id: number) {
    const { error } = await supabase
      .from("projekte")
      .delete()
      .eq("id", id);

    if (!error) location.reload();
    if (error) console.log(error);
  }

  return (
    <main>
      <h1 className="text-5xl font-extrabold text-zinc-900 mb-3">
        Projekte
      </h1>

      <p className="text-zinc-700 text-lg mb-10 font-medium">
        Projekt- & Kundenverwaltung
      </p>

      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">
          Projekt hinzufügen
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Projektname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-zinc-300 rounded-xl p-3 text-zinc-900"
          />

          <input
            type="text"
            placeholder="Kunde"
            value={kunde}
            onChange={(e) => setKunde(e.target.value)}
            className="border border-zinc-300 rounded-xl p-3 text-zinc-900"
          />

          <button
            onClick={projektHinzufuegen}
            className="bg-zinc-900 hover:bg-orange-500 transition text-white rounded-xl font-bold"
          >
            Speichern
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">
          Projektübersicht
        </h2>

        <div className="grid grid-cols-4 font-bold text-zinc-800 border-b border-zinc-300 pb-4 mb-4">
          <div>Projekt</div>
          <div>Kunde</div>
          <div>Status</div>
          <div>Aktion</div>
        </div>

        {projekte.map((projekt) => (
          <div
            key={projekt.id}
            className="grid grid-cols-4 py-4 border-b border-zinc-200 items-center"
          >
            <div className="text-zinc-900 font-medium">{projekt.name}</div>
            <div className="text-zinc-800">{projekt.kunde}</div>

            <div>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                {projekt.status}
              </span>
            </div>

            <div>
              <button
                onClick={() => projektLoeschen(projekt.id)}
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
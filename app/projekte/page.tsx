"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ProjektePage() {
  const [projekte, setProjekte] = useState<any[]>([]);

  const [name, setName] = useState("");
  const [kunde, setKunde] = useState("");
  const [status, setStatus] = useState("Aktiv");

  const [loading, setLoading] = useState(false);
  const [meldung, setMeldung] = useState("");

  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null);

  async function ladeProjekte() {
    const { data, error } = await supabase
      .from("projekte")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    setProjekte(data || []);
  }

  useEffect(() => {
    ladeProjekte();
  }, []);

  async function projektSpeichern() {
    setMeldung("");

    if (!name.trim()) {
      setMeldung("Bitte Projektname eingeben.");
      return;
    }

    setLoading(true);

    if (bearbeitenId) {
      const { error } = await supabase
        .from("projekte")
        .update({
          name: name.trim(),
          kunde: kunde.trim(),
          status,
        })
        .eq("id", bearbeitenId);

      if (error) {
        setLoading(false);
        setMeldung(error.message);
        console.log(error);
        return;
      }

      setMeldung("Projekt aktualisiert.");
    } else {
      const { error } = await supabase
        .from("projekte")
        .insert([
          {
            name: name.trim(),
            kunde: kunde.trim(),
            status,
          },
        ]);

      if (error) {
        setLoading(false);
        setMeldung(error.message);
        console.log(error);
        return;
      }

      setMeldung("Projekt gespeichert.");
    }

    setName("");
    setKunde("");
    setStatus("Aktiv");

    setBearbeitenId(null);

    await ladeProjekte();

    setLoading(false);
  }

  async function projektLoeschen(id: number) {
    const bestaetigen = confirm(
      "Projekt wirklich löschen?"
    );

    if (!bestaetigen) return;

    const { error } = await supabase
      .from("projekte")
      .delete()
      .eq("id", id);

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    await ladeProjekte();
    setMeldung("Projekt gelöscht.");
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-900 md:text-5xl">
          Projekte
        </h1>

        <p className="mt-2 text-sm font-medium text-zinc-600 md:text-lg">
          Projekt- & Kundenverwaltung
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="mb-6 text-xl font-bold text-zinc-900 md:text-2xl">
          {bearbeitenId
            ? "Projekt bearbeiten"
            : "Projekt hinzufügen"}
        </h2>

        <div className="flex flex-col gap-4 md:grid md:grid-cols-4">
          <input
            type="text"
            placeholder="Projektname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3 text-zinc-900"
          />

          <input
            type="text"
            placeholder="Kunde"
            value={kunde}
            onChange={(e) => setKunde(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3 text-zinc-900"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3 text-zinc-900"
          >
            <option value="Aktiv">Aktiv</option>
            <option value="Pausiert">Pausiert</option>
            <option value="Abgeschlossen">
              Abgeschlossen
            </option>
          </select>

          <button
            type="button"
            onClick={projektSpeichern}
            disabled={loading}
            className="rounded-xl bg-zinc-900 p-3 font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
          >
            {loading
              ? "Speichern..."
              : bearbeitenId
              ? "Änderung speichern"
              : "Speichern"}
          </button>
        </div>

        {bearbeitenId && (
          <button
            type="button"
            onClick={() => {
              setBearbeitenId(null);
              setName("");
              setKunde("");
              setStatus("Aktiv");
            }}
            className="mt-4 rounded-xl bg-zinc-200 px-4 py-3 font-bold text-zinc-900"
          >
            Bearbeiten abbrechen
          </button>
        )}

        {meldung && (
          <div className="mt-4 rounded-xl bg-zinc-900 p-3 text-sm font-semibold text-white">
            {meldung}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="mb-6 text-xl font-bold text-zinc-900 md:text-2xl">
          Projektübersicht
        </h2>

        {projekte.length === 0 && (
          <div className="rounded-xl bg-zinc-100 p-4 text-zinc-600">
            Noch keine Projekte angelegt.
          </div>
        )}

        <div className="space-y-4 md:hidden">
          {projekte.map((projekt) => (
            <div
              key={projekt.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-zinc-900">
                    {projekt.name}
                  </div>

                  <div className="mt-1 text-sm text-zinc-600">
                    Kunde: {projekt.kunde || "-"}
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    projekt.status === "Aktiv"
                      ? "bg-green-100 text-green-800"
                      : projekt.status === "Pausiert"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-zinc-200 text-zinc-800"
                  }`}
                >
                  {projekt.status || "Aktiv"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBearbeitenId(projekt.id);
                  setName(projekt.name || "");
                  setKunde(projekt.kunde || "");
                  setStatus(projekt.status || "Aktiv");
                }}
                className="mt-4 w-full rounded-xl bg-zinc-900 p-3 font-bold text-white"
              >
                Bearbeiten
              </button>

              <button
                type="button"
                onClick={() => projektLoeschen(projekt.id)}
                className="mt-3 w-full rounded-xl bg-red-600 p-3 font-bold text-white"
              >
                Löschen
              </button>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-4 border-b border-zinc-300 pb-4 font-bold text-zinc-800">
              <div>Projekt</div>
              <div>Kunde</div>
              <div>Status</div>
              <div>Aktion</div>
            </div>

            {projekte.map((projekt) => (
              <div
                key={projekt.id}
                className="grid grid-cols-4 items-center border-b border-zinc-200 py-4"
              >
                <div className="font-medium text-zinc-900">
                  {projekt.name}
                </div>

                <div className="text-zinc-800">
                  {projekt.kunde || "-"}
                </div>

                <div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      projekt.status === "Aktiv"
                        ? "bg-green-100 text-green-800"
                        : projekt.status === "Pausiert"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-zinc-200 text-zinc-800"
                    }`}
                  >
                    {projekt.status || "Aktiv"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBearbeitenId(projekt.id);
                      setName(projekt.name || "");
                      setKunde(projekt.kunde || "");
                      setStatus(
                        projekt.status || "Aktiv"
                      );
                    }}
                    className="rounded-lg bg-zinc-900 px-4 py-2 font-semibold text-white"
                  >
                    Bearbeiten
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      projektLoeschen(projekt.id)
                    }
                    className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ProjektarchivPage() {
  const [projekte, setProjekte] = useState<any[]>([]);
  const [zeiten, setZeiten] = useState<any[]>([]);
  const [offen, setOffen] = useState<number | null>(null);
  const [meldung, setMeldung] = useState("");

  useEffect(() => {
    ladeArchiv();
  }, []);

  async function ladeArchiv() {
    const { data: projektData, error: projektError } = await supabase
      .from("projekte")
      .select("*")
      .eq("status", "Abgeschlossen")
      .order("kunde", { ascending: true })
      .order("kommission", { ascending: true });

    const { data: zeitenData, error: zeitenError } = await supabase
      .from("arbeitszeiten")
      .select("*")
      .order("datum", { ascending: false });

    if (projektError) {
      setMeldung(projektError.message);
      return;
    }

    if (zeitenError) {
      setMeldung(zeitenError.message);
      return;
    }

    setProjekte(projektData || []);
    setZeiten(zeitenData || []);
  }

  function projektAnzeige(projekt: any) {
    if (projekt.name) return projekt.name;

    if (projekt.kunde === "Intern") return projekt.kommission;

    return `${projekt.kunde || "-"} - ${projekt.kommission || "-"}`;
  }

  function zeitenFuerProjekt(projekt: any) {
    const name = projektAnzeige(projekt);

    return zeiten.filter((zeit) => zeit.projekt === name);
  }

  function stundenFuerProjekt(projekt: any) {
    return zeitenFuerProjekt(projekt).reduce(
      (sum, zeit) => sum + Number(zeit.stunden || 0),
      0
    );
  }

  return (
    <main className="space-y-8">
      <div>
        <div className="mb-3 text-sm font-medium uppercase tracking-widest text-white/60">
          Archiv
        </div>

        <h1 className="text-5xl font-black tracking-tight text-white lg:text-6xl">
          Projektarchiv
        </h1>

        <p className="mt-3 text-white/60">
          Abgeschlossene Projekte mit Stundenübersicht für spätere Folgeaufträge
        </p>
      </div>

      {meldung && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm font-bold text-orange-400">
          {meldung}
        </div>
      )}

      {projekte.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-black/25 p-6 text-white/60">
          Keine abgeschlossenen Projekte im Archiv.
        </div>
      )}

<div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
  <table className="w-full">
    <thead>
      <tr className="border-b border-white/10 text-left">
        <th className="p-4">Kunde</th>
        <th className="p-4">Projekt</th>
        <th className="p-4">Stunden</th>
        <th className="p-4">Aktion</th>
      </tr>
    </thead>

    <tbody>
      {projekte.map((projekt) => {
        const istOffen = offen === projekt.id;
        const projektZeiten = zeitenFuerProjekt(projekt);
        const gesamtstunden = stundenFuerProjekt(projekt);

        return (
          <>
            <tr
              key={projekt.id}
              className="border-b border-white/10"
            >
              <td className="p-4 font-bold">
                {projekt.kunde}
              </td>

              <td className="p-4">
                {projekt.projektname}
              </td>

              <td className="p-4 font-black text-orange-400">
                {gesamtstunden.toFixed(2)}h
              </td>

              <td className="p-4">
                <button
                  onClick={() =>
                    setOffen(
                      istOffen ? null : projekt.id
                    )
                  }
                  className="rounded-lg bg-orange-600 px-4 py-2 font-bold text-white hover:bg-orange-500"
                >
                  {istOffen ? "Schließen" : "Details"}
                </button>
              </td>
            </tr>

            {istOffen && (
              <tr>
                <td
                  colSpan={4}
                  className="bg-black/20 p-4"
                >
                  <div className="space-y-2">
                    {projektZeiten.map((zeit) => (
                      <div
                        key={zeit.id}
                        className="flex justify-between rounded-lg border border-white/10 bg-black/20 p-3"
                      >
                        <span>
                          {zeit.datum}
                        </span>

                        <span className="font-bold text-orange-400">
                          {Number(
                            zeit.stunden || 0
                          ).toFixed(2)}
                          h
                        </span>
                      </div>
                    ))}

                    <div className="pt-2 text-right text-xl font-black text-orange-400">
                      Gesamt:{" "}
                      {gesamtstunden.toFixed(2)}h
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </>
        );
      })}
    </tbody>
  </table>
</div>
    </main>
  );
}
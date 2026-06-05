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

      {projekte.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="p-4">Kunde</th>
                <th className="p-4">Projekt</th>
                <th className="p-4 text-right">Stunden</th>
                <th className="p-4 text-center">Buchungen</th>
                <th className="p-4">Aktion</th>
              </tr>
            </thead>

            <tbody>
              {projekte.map((projekt) => {
                const istOffen = offen === projekt.id;
                const projektZeiten = zeitenFuerProjekt(projekt);
                const gesamtstunden = stundenFuerProjekt(projekt);
                const anzahlBuchungen = projektZeiten.length;

                return (
                  <>
                    <tr key={projekt.id} className="border-b border-white/10">
                      <td className="p-4 font-bold text-white">
                        {projekt.kunde || "-"}
                      </td>

                      <td className="p-4 text-white/80">
                        {projekt.projektname || projekt.kommission || "-"}
                      </td>

                      <td className="p-4 text-right font-black text-orange-400">
                        {gesamtstunden.toFixed(2)}h
                      </td>

                      <td className="p-4 text-center">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-bold text-white/80">
                          {anzahlBuchungen}
                        </span>
                      </td>

                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => setOffen(istOffen ? null : projekt.id)}
                          className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-500"
                        >
                          {istOffen ? "Schließen" : "Details"}
                        </button>
                      </td>
                    </tr>

                    {istOffen && (
                      <tr>
                        <td colSpan={5} className="bg-black/20 p-4">
                          <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                            <div>
                              <h3 className="text-xl font-black text-white">
                                Arbeitszeiten
                              </h3>

                              <p className="text-sm text-white/50">
                                {anzahlBuchungen} Buchungen auf diesem Projekt
                              </p>
                            </div>

                            <div className="text-3xl font-black text-orange-400">
                              {gesamtstunden.toFixed(2)}h
                            </div>
                          </div>

                          {projektZeiten.length === 0 && (
                            <div className="rounded-xl border border-white/10 bg-black/25 p-4 text-white/55">
                              Keine Arbeitszeiten zu diesem Projekt gefunden.
                            </div>
                          )}

                          <div className="space-y-3">
                            {projektZeiten.map((zeit) => (
                              <div
                                key={zeit.id}
                                className="flex flex-col justify-between gap-2 rounded-xl border border-white/10 bg-black/25 p-4 md:flex-row md:items-center"
                              >
                                <div>
                                  <div className="font-bold text-white">
                                    {zeit.datum || "-"}
                                  </div>

                                  <div className="text-sm text-white/50">
                                    {zeit.projekt || "-"}
                                  </div>
                                </div>

                                <div className="text-2xl font-black text-orange-400">
                                  {Number(zeit.stunden || 0).toFixed(2)}h
                                </div>
                              </div>
                            ))}
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
      )}
    </main>
  );
}
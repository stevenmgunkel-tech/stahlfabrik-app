"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ProjektstatistikPage() {
  const [daten, setDaten] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ladeDaten();
  }, []);

  async function ladeDaten() {
    const { data, error } = await supabase
      .from("arbeitszeiten")
      .select("projekt, stunden");

    if (error) {
      console.error(error);
      return;
    }

    const gruppiert: Record<string, number> = {};

    data?.forEach((eintrag) => {
      const projekt = eintrag.projekt || "Unbekannt";
      const stunden = Number(eintrag.stunden || 0);

      gruppiert[projekt] =
        (gruppiert[projekt] || 0) + stunden;
    });

    const result = Object.entries(gruppiert)
      .map(([projekt, stunden]) => ({
        projekt,
        stunden,
      }))
      .sort((a, b) => b.stunden - a.stunden);

    setDaten(result);
    setLoading(false);
  }

  const gesamtStunden = daten.reduce(
    (sum, p) => sum + p.stunden,
    0
  );

  const topProjekt = daten[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-black text-white">
          Projektstatistik
        </h1>

        <p className="mt-2 text-white/60">
          Stunden nach Projekt ausgewertet
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-white/60">
            Projekte
          </div>
          <div className="mt-2 text-3xl font-black text-orange-400">
            {daten.length}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-white/60">
            Gebuchte Stunden
          </div>
          <div className="mt-2 text-3xl font-black text-orange-400">
            {gesamtStunden.toFixed(2)}h
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-white/60">
            Top Projekt
          </div>

          <div className="mt-2 font-bold text-white">
            {topProjekt?.projekt || "-"}
          </div>

          <div className="text-orange-400 font-black text-2xl">
            {topProjekt?.stunden?.toFixed(2) || "0"}h
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 px-6 py-4 font-bold text-white">
          Projektstunden
        </div>

        {loading ? (
          <div className="p-6 text-white/60">
            Lade Daten...
          </div>
        ) : (
          daten.map((projekt) => (
            <div
              key={projekt.projekt}
              className="flex items-center justify-between border-b border-white/10 px-6 py-4"
            >
              <div className="font-bold text-white">
                {projekt.projekt}
              </div>

              <div className="text-2xl font-black text-orange-400">
                {projekt.stunden.toFixed(2)}h
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
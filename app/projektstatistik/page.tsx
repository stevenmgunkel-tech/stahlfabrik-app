"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type BereichStat = {
  bereich: string;
  stunden: number;
};

type ProjektStat = {
  projekt: string;
  stunden: number;
  bereiche: BereichStat[];
};

export default function ProjektstatistikPage() {
  const [daten, setDaten] = useState<ProjektStat[]>([]);
  const [bereichDaten, setBereichDaten] = useState<BereichStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ladeDaten();
  }, []);

  async function ladeDaten() {
    setLoading(true);

    const { data, error } = await supabase
      .from("arbeitszeiten")
      .select("projekt, bereich, stunden");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const projektMap: Record<
      string,
      {
        stunden: number;
        bereiche: Record<string, number>;
      }
    > = {};

    const bereichMap: Record<string, number> = {};

    data?.forEach((eintrag) => {
      const projekt = eintrag.projekt || "Unbekannt";
      const bereich = eintrag.bereich || "Ohne Bereich";
      const stunden = Number(eintrag.stunden || 0);

      if (!projektMap[projekt]) {
        projektMap[projekt] = {
          stunden: 0,
          bereiche: {},
        };
      }

      projektMap[projekt].stunden += stunden;
      projektMap[projekt].bereiche[bereich] =
        (projektMap[projekt].bereiche[bereich] || 0) + stunden;

      bereichMap[bereich] = (bereichMap[bereich] || 0) + stunden;
    });

    const projektResult = Object.entries(projektMap)
      .map(([projekt, wert]) => ({
        projekt,
        stunden: wert.stunden,
        bereiche: Object.entries(wert.bereiche)
          .map(([bereich, stunden]) => ({
            bereich,
            stunden,
          }))
          .sort((a, b) => b.stunden - a.stunden),
      }))
      .sort((a, b) => b.stunden - a.stunden);

    const bereichResult = Object.entries(bereichMap)
      .map(([bereich, stunden]) => ({
        bereich,
        stunden,
      }))
      .sort((a, b) => b.stunden - a.stunden);

    setDaten(projektResult);
    setBereichDaten(bereichResult);
    setLoading(false);
  }

  const gesamtStunden = daten.reduce(
    (sum, p) => sum + p.stunden,
    0
  );

  const topProjekt = daten[0];
  const topBereich = bereichDaten[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-black text-white">
          Projektstatistik
        </h1>

        <p className="mt-2 text-white/60">
          Stunden nach Projekt und Bereich ausgewertet
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="Projekte"
          value={daten.length}
        />

        <KpiCard
          label="Gebuchte Stunden"
          value={`${gesamtStunden.toFixed(2)}h`}
        />

        <KpiCard
          label="Top Projekt"
          value={topProjekt?.projekt || "-"}
          subvalue={`${topProjekt?.stunden?.toFixed(2) || "0.00"}h`}
        />

        <KpiCard
          label="Top Bereich"
          value={topBereich?.bereich || "-"}
          subvalue={`${topBereich?.stunden?.toFixed(2) || "0.00"}h`}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 px-6 py-4">
          <div className="font-bold text-white">
            Bereichsauswertung Gesamt
          </div>
          <div className="mt-1 text-sm text-white/50">
            Alle gebuchten Stunden nach Bereich
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-white/60">
            Lade Daten...
          </div>
        ) : bereichDaten.length === 0 ? (
          <div className="p-6 text-white/60">
            Noch keine Bereichsdaten vorhanden.
          </div>
        ) : (
          <div className="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-4">
            {bereichDaten.map((bereich) => (
              <div
                key={bereich.bereich}
                className="rounded-xl border border-white/10 bg-black/25 p-5"
              >
                <div className="font-black text-white">
                  {bereich.bereich}
                </div>

                <div className="mt-3 text-3xl font-black text-orange-400">
                  {bereich.stunden.toFixed(2)}h
                </div>

                <div className="mt-3 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-2 rounded-full bg-orange-500"
                    style={{
                      width: `${
                        gesamtStunden > 0
                          ? Math.min(
                              (bereich.stunden / gesamtStunden) * 100,
                              100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 px-6 py-4">
          <div className="font-bold text-white">
            Projektstunden nach Bereich
          </div>
          <div className="mt-1 text-sm text-white/50">
            Jedes Projekt mit Werkstatt, Montage, Logistik, Planung usw.
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-white/60">
            Lade Daten...
          </div>
        ) : daten.length === 0 ? (
          <div className="p-6 text-white/60">
            Noch keine Arbeitszeiten vorhanden.
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {daten.map((projekt) => (
              <div
                key={projekt.projekt}
                className="px-6 py-5"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <div className="text-xl font-black text-white">
                      {projekt.projekt}
                    </div>

                    <div className="mt-1 text-sm text-white/50">
                      {projekt.bereiche.length} Bereiche
                    </div>
                  </div>

                  <div className="text-3xl font-black text-orange-400">
                    {projekt.stunden.toFixed(2)}h
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {projekt.bereiche.map((bereich) => (
                    <div
                      key={`${projekt.projekt}-${bereich.bereich}`}
                      className="rounded-xl border border-white/10 bg-black/25 p-4"
                    >
                      <div className="text-sm font-bold uppercase tracking-widest text-white/45">
                        {bereich.bereich}
                      </div>

                      <div className="mt-2 text-2xl font-black text-white">
                        {bereich.stunden.toFixed(2)}h
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: string | number;
  subvalue?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="text-white/60">
        {label}
      </div>

      <div className="mt-2 break-words text-3xl font-black text-orange-400">
        {value}
      </div>

      {subvalue && (
        <div className="mt-2 text-xl font-black text-white">
          {subvalue}
        </div>
      )}
    </div>
  );
}

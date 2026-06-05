"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ProjektarchivPage() {
  const [projekte, setProjekte] = useState<any[]>([]);
  const [meldung, setMeldung] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    ladeArchiv();
  }, []);

  async function ladeArchiv() {
    const { data, error } = await supabase
      .from("projekte")
      .select("*")
      .eq("status", "Abgeschlossen")
      .order("kunde", { ascending: true })
      .order("kommission", { ascending: true });

    if (error) {
      setMeldung(error.message);
      return;
    }

    setProjekte(data || []);
  }

  async function wiederAktivieren(id: number) {
    const ok = confirm("Projekt wirklich wieder aktivieren?");
    if (!ok) return;

    setLoading(true);
    setMeldung("");

    const { error } = await supabase
      .from("projekte")
      .update({ status: "Aktiv" })
      .eq("id", id);

    if (error) {
      setMeldung(error.message);
      setLoading(false);
      return;
    }

    await ladeArchiv();
    setMeldung("Projekt wurde wieder aktiviert.");
    setLoading(false);
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
          Abgeschlossene Projekte einsehen und bei Bedarf wieder aktivieren
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

      <div className="space-y-4">
        {projekte.map((projekt) => (
          <div
            key={projekt.id}
            className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30"
          >
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <div className="text-2xl font-black text-white">
                  {projekt.kunde || "-"}
                </div>

                <div className="mt-2 text-white/60">
                  Kommission:{" "}
                  <span className="font-bold text-white/80">
                    {projekt.kommission || "-"}
                  </span>
                </div>

                <div className="mt-1 text-white/60">
                  Projektname:{" "}
                  <span className="font-bold text-orange-400">
                    {projekt.projektname || "-"}
                  </span>
                </div>

                <div className="mt-3 inline-flex rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-sm font-bold text-white/70">
                  Abgeschlossen
                </div>
              </div>

              <button
                type="button"
                onClick={() => wiederAktivieren(projekt.id)}
                disabled={loading}
                className="rounded-xl bg-orange-600 px-5 py-3 font-black text-white shadow-lg shadow-orange-600/25 transition hover:bg-orange-500 disabled:opacity-50"
              >
                Wieder aktivieren
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
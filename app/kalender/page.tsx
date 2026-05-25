"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function KalenderPage() {
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [urlaub, setUrlaub] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [meldung, setMeldung] = useState("");

  async function ladeDaten() {
    setLoading(true);
    setMeldung("");

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: arbeitszeitenData, error: arbeitszeitenError } =
      await supabase
        .from("arbeitszeiten")
        .select("*")
        .eq("user_id", user.id)
        .order("datum", { ascending: false })
        .limit(10);

    const { data: urlaubData, error: urlaubError } = await supabase
      .from("urlaub")
      .select("*")
      .eq("user_id", user.id)
      .order("von", { ascending: false })
      .limit(10);

    const fehler = arbeitszeitenError || urlaubError;

    if (fehler) {
      setMeldung(fehler.message);
      console.log(fehler);
    }

    setArbeitszeiten(arbeitszeitenData || []);
    setUrlaub(urlaubData || []);
    setLoading(false);
  }

  useEffect(() => {
    ladeDaten();
  }, []);

  return (
    <main>
      <h1 className="text-5xl font-extrabold text-zinc-900 mb-3">
        Kalender
      </h1>

      <p className="text-zinc-700 text-lg mb-10 font-medium">
        Übersicht über Arbeitszeiten, Urlaub und Krankheit
      </p>

      {meldung && (
        <div className="mb-6 rounded-xl bg-zinc-900 p-3 text-sm font-semibold text-white">
          {meldung}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h2 className="text-zinc-700 font-semibold">
            Letzte Arbeitszeiten
          </h2>

          <p className="text-5xl font-extrabold text-zinc-900 mt-3">
            {loading ? "..." : arbeitszeiten.length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h2 className="text-zinc-700 font-semibold">
            Abwesenheiten
          </h2>

          <p className="text-5xl font-extrabold text-zinc-900 mt-3">
            {loading ? "..." : urlaub.length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h2 className="text-zinc-700 font-semibold">
            Status
          </h2>

          <p className="text-5xl font-extrabold text-zinc-900 mt-3">
            OK
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
          <h2 className="text-2xl font-bold text-zinc-900 mb-6">
            Arbeitszeiten
          </h2>

          <div className="space-y-4">
            {arbeitszeiten.map((zeit) => (
              <div
                key={zeit.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="font-bold text-zinc-900">
                    {zeit.datum}
                  </div>

                  <div className="font-extrabold text-orange-500">
                    {zeit.stunden}h
                  </div>
                </div>

                <p className="mt-2 text-sm text-zinc-600">
                  {zeit.projekt} · {zeit.startzeit || "-"} -{" "}
                  {zeit.endzeit || "-"}
                </p>
              </div>
            ))}

            {!loading && arbeitszeiten.length === 0 && (
              <div className="rounded-xl bg-zinc-100 p-4 text-zinc-600">
                Keine Arbeitszeiten vorhanden.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
          <h2 className="text-2xl font-bold text-zinc-900 mb-6">
            Urlaub & Krankheit
          </h2>

          <div className="space-y-4">
            {urlaub.map((eintrag) => (
              <div
                key={eintrag.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="font-bold text-zinc-900">
                    {eintrag.typ || "Urlaub"}
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      eintrag.status === "Genehmigt"
                        ? "bg-green-100 text-green-800"
                        : eintrag.status === "Abgelehnt"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {eintrag.status}
                  </span>
                </div>

                <p className="mt-2 text-sm text-zinc-600">
                  {eintrag.von} - {eintrag.bis} · {eintrag.tage || 0} Tage
                </p>
              </div>
            ))}

            {!loading && urlaub.length === 0 && (
              <div className="rounded-xl bg-zinc-100 p-4 text-zinc-600">
                Keine Abwesenheiten vorhanden.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
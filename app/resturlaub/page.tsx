"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ResturlaubPage() {
  const [urlaubstage, setUrlaubstage] = useState(0);
  const [genommenerUrlaub, setGenommenerUrlaub] = useState(0);
  const [kranktage, setKranktage] = useState(0);
  const [offeneAntraege, setOffeneAntraege] = useState(0);

  const [loading, setLoading] = useState(true);
  const [meldung, setMeldung] = useState("");

  useEffect(() => {
    async function ladeDaten() {
      setMeldung("");

      const userData = await supabase.auth.getUser();
      const user = userData.data.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: mitarbeiter, error: mitarbeiterError } = await supabase
        .from("mitarbeiter")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (mitarbeiterError) {
        setMeldung(mitarbeiterError.message);
        console.log(mitarbeiterError);
      }

      if (mitarbeiter?.urlaubstage) {
        setUrlaubstage(Number(mitarbeiter.urlaubstage));
      }

      const { data: abwesenheiten, error: abwesenheitenError } =
        await supabase
          .from("urlaub")
          .select("*")
          .eq("user_id", user.id);

      if (abwesenheitenError) {
        setMeldung(abwesenheitenError.message);
        console.log(abwesenheitenError);
      }

      if (abwesenheiten) {
        const genehmigterUrlaub = abwesenheiten
          .filter(
            (eintrag) =>
              eintrag.typ === "Urlaub" &&
              eintrag.status === "Genehmigt"
          )
          .reduce(
            (sum, eintrag) => sum + Number(eintrag.tage || 0),
            0
          );

        const krank = abwesenheiten
          .filter((eintrag) => eintrag.typ === "Krank")
          .reduce(
            (sum, eintrag) => sum + Number(eintrag.tage || 0),
            0
          );

        const offen = abwesenheiten.filter(
          (eintrag) => eintrag.status === "Beantragt"
        ).length;

        setGenommenerUrlaub(genehmigterUrlaub);
        setKranktage(krank);
        setOffeneAntraege(offen);
      }

      setLoading(false);
    }

    ladeDaten();
  }, []);

  const resturlaub = urlaubstage - genommenerUrlaub;

  return (
    <main>
      <h1 className="text-5xl font-extrabold text-zinc-900 mb-3">
        Resturlaub
      </h1>

      <p className="text-zinc-700 text-lg mb-10 font-medium">
        Persönliche Übersicht über Urlaub, Krankheit und offene Anträge
      </p>

      {meldung && (
        <div className="mb-6 rounded-xl bg-zinc-900 p-3 text-sm font-semibold text-white">
          {meldung}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-sm">
          <p className="text-zinc-300 font-semibold mb-2">
            Jahresurlaub
          </p>

          <p className="text-5xl font-extrabold text-orange-400">
            {loading ? "..." : urlaubstage}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-zinc-600 font-semibold mb-2">
            Genommen
          </p>

          <p className="text-5xl font-extrabold text-zinc-900">
            {loading ? "..." : genommenerUrlaub}
          </p>
        </div>

        <div
          className={`p-6 rounded-2xl shadow-sm ${
            resturlaub >= 0
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          <p className="font-semibold mb-2">
            Resturlaub
          </p>

          <p className="text-5xl font-extrabold">
            {loading ? "..." : resturlaub}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <p className="text-zinc-600 font-semibold mb-2">
            Krankheitstage
          </p>

          <p className="text-5xl font-extrabold text-zinc-900">
            {loading ? "..." : kranktage}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">
          Status
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-zinc-100 p-5 rounded-xl border border-zinc-200">
            <p className="text-zinc-600 font-semibold mb-2">
              Offene Anträge
            </p>

            <p className="text-4xl font-extrabold text-zinc-900">
              {loading ? "..." : offeneAntraege}
            </p>
          </div>

          <div className="bg-zinc-100 p-5 rounded-xl border border-zinc-200">
            <p className="text-zinc-600 font-semibold mb-2">
              Genehmigter Urlaub
            </p>

            <p className="text-4xl font-extrabold text-zinc-900">
              {loading ? "..." : genommenerUrlaub}
            </p>
          </div>

          <div className="bg-zinc-100 p-5 rounded-xl border border-zinc-200">
            <p className="text-zinc-600 font-semibold mb-2">
              Verfügbar
            </p>

            <p className="text-4xl font-extrabold text-zinc-900">
              {loading ? "..." : resturlaub}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
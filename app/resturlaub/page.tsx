"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ResturlaubPage() {
  const [urlaubstage, setUrlaubstage] = useState(0);
  const [genommenerUrlaub, setGenommenerUrlaub] = useState(0);
  const [kranktage, setKranktage] = useState(0);
  const [offeneAntraege, setOffeneAntraege] = useState(0);

  const [ueberstundenabbauTage, setUeberstundenabbauTage] = useState(0);

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

        const ueberstundenabbau = abwesenheiten
          .filter(
            (eintrag) =>
              eintrag.typ === "Überstundenabbau" &&
              eintrag.status === "Genehmigt"
          )
          .reduce(
            (sum, eintrag) => sum + Number(eintrag.tage || 0),
            0
          );

        const offen = abwesenheiten.filter(
          (eintrag) => eintrag.status === "Beantragt"
        ).length;

        setGenommenerUrlaub(genehmigterUrlaub);
        setKranktage(krank);
        setUeberstundenabbauTage(ueberstundenabbau);
        setOffeneAntraege(offen);
      }

      setLoading(false);
    }

    ladeDaten();
  }, []);

  const resturlaub = urlaubstage - genommenerUrlaub;

  return (
    <main>
      <h1 className="mb-3 text-5xl font-extrabold text-zinc-900">
        Resturlaub
      </h1>

      <p className="mb-10 text-lg font-medium text-zinc-700">
        Persönliche Übersicht über Urlaub, Krankheit und Überstundenabbau
      </p>

      {meldung && (
        <div className="mb-6 rounded-xl bg-zinc-900 p-3 text-sm font-semibold text-white">
          {meldung}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-5">
        <div className="rounded-2xl bg-zinc-900 p-6 text-white shadow-sm">
          <p className="mb-2 font-semibold text-zinc-300">
            Jahresurlaub
          </p>

          <p className="text-5xl font-extrabold text-orange-400">
            {loading ? "..." : urlaubstage}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="mb-2 font-semibold text-zinc-600">
            Genommener Urlaub
          </p>

          <p className="text-5xl font-extrabold text-zinc-900">
            {loading ? "..." : genommenerUrlaub}
          </p>
        </div>

        <div
          className={`rounded-2xl p-6 shadow-sm ${
            resturlaub >= 0
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          <p className="mb-2 font-semibold">
            Resturlaub
          </p>

          <p className="text-5xl font-extrabold">
            {loading ? "..." : resturlaub}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="mb-2 font-semibold text-zinc-600">
            Krankheitstage
          </p>

          <p className="text-5xl font-extrabold text-zinc-900">
            {loading ? "..." : kranktage}
          </p>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 shadow-sm">
          <p className="mb-2 font-semibold text-orange-700">
            Überstundenabbau
          </p>

          <p className="text-5xl font-extrabold text-orange-600">
            {loading ? "..." : ueberstundenabbauTage}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-2xl font-bold text-zinc-900">
          Status
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-100 p-5">
            <p className="mb-2 font-semibold text-zinc-600">
              Offene Anträge
            </p>

            <p className="text-4xl font-extrabold text-zinc-900">
              {loading ? "..." : offeneAntraege}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-100 p-5">
            <p className="mb-2 font-semibold text-zinc-600">
              Genehmigter Urlaub
            </p>

            <p className="text-4xl font-extrabold text-zinc-900">
              {loading ? "..." : genommenerUrlaub}
            </p>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
            <p className="mb-2 font-semibold text-orange-700">
              Überstundenabbau
            </p>

            <p className="text-4xl font-extrabold text-orange-600">
              {loading ? "..." : ueberstundenabbauTage}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-100 p-5">
            <p className="mb-2 font-semibold text-zinc-600">
              Verfügbarer Urlaub
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
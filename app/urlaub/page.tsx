"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function UrlaubPage() {
  const [urlaub, setUrlaub] = useState<any[]>([]);

  const [typ, setTyp] = useState("Urlaub");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");

  useEffect(() => {
    async function ladeUrlaub() {
      const userData = await supabase.auth.getUser();
      const user = userData.data.user;

      if (!user) return;

      const { data, error } = await supabase
        .from("urlaub")
        .select("*")
        .eq("user_id", user.id)
        .order("id", { ascending: false });

      if (data) setUrlaub(data);
      if (error) console.log(error);
    }

    ladeUrlaub();
  }, []);

  function berechneTage() {
    if (!von || !bis) return 0;

    const start = new Date(von);
    const ende = new Date(bis);

    if (ende < start) return 0;

    let tage = 0;
    const aktuell = new Date(start);

    while (aktuell <= ende) {
      const wochentag = aktuell.getDay();

      if (wochentag !== 0 && wochentag !== 6) {
        tage++;
      }

      aktuell.setDate(aktuell.getDate() + 1);
    }

    return tage;
  }

  async function abwesenheitHinzufuegen() {
    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      alert("Bitte zuerst einloggen.");
      window.location.href = "/login";
      return;
    }

    const tage = berechneTage();

    const { error } = await supabase.from("urlaub").insert([
      {
        typ,
        von,
        bis,
        tage,
        status: "Beantragt",
        user_id: user.id,
      },
    ]);

    if (!error) location.reload();

    if (error) {
      alert(error.message);
      console.log(error);
    }
  }

  async function urlaubLoeschen(id: number) {
    const { error } = await supabase
      .from("urlaub")
      .delete()
      .eq("id", id);

    if (!error) location.reload();

    if (error) {
      alert(error.message);
      console.log(error);
    }
  }

  const berechneteTage = berechneTage();

  return (
    <main>
      <h1 className="text-5xl font-extrabold text-zinc-900 mb-3">
        Urlaub & Krankheit
      </h1>

      <p className="text-zinc-700 text-lg mb-10 font-medium">
        Abwesenheiten beantragen und automatisch berechnen
      </p>

      <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">
          Abwesenheit erfassen
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={typ}
            onChange={(e) => setTyp(e.target.value)}
            className="border border-zinc-300 rounded-xl p-3 text-zinc-900"
          >
            <option value="Urlaub">Urlaub</option>
            <option value="Krank">Krank</option>
          </select>

          <input
            type="date"
            value={von}
            onChange={(e) => setVon(e.target.value)}
            className="border border-zinc-300 rounded-xl p-3 text-zinc-900"
          />

          <input
            type="date"
            value={bis}
            onChange={(e) => setBis(e.target.value)}
            className="border border-zinc-300 rounded-xl p-3 text-zinc-900"
          />

          <button
            onClick={abwesenheitHinzufuegen}
            className="bg-zinc-900 hover:bg-orange-500 transition text-white rounded-xl font-bold"
          >
            Speichern
          </button>
        </div>

        <div className="mt-5 bg-zinc-100 border border-zinc-200 rounded-xl p-4">
          <span className="font-bold text-zinc-900">
            Berechnete Arbeitstage:
          </span>{" "}
          <span className="text-orange-600 font-extrabold">
            {berechneteTage} Tage
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">
          Meine Abwesenheiten
        </h2>

        <div className="grid grid-cols-6 font-bold text-zinc-800 border-b border-zinc-300 pb-4 mb-4">
          <div>Typ</div>
          <div>Von</div>
          <div>Bis</div>
          <div>Tage</div>
          <div>Status</div>
          <div>Aktion</div>
        </div>

        {urlaub.map((eintrag) => (
          <div
            key={eintrag.id}
            className="grid grid-cols-6 py-4 border-b border-zinc-200 items-center"
          >
            <div className="text-zinc-900 font-medium">
              {eintrag.typ || "Urlaub"}
            </div>

            <div className="text-zinc-800">{eintrag.von}</div>
            <div className="text-zinc-800">{eintrag.bis}</div>

            <div className="text-zinc-900 font-bold">
              {eintrag.tage || 0}
            </div>

            <div>
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                {eintrag.status}
              </span>
            </div>

            <div>
              <button
                onClick={() => urlaubLoeschen(eintrag.id)}
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
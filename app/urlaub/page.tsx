"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function UrlaubPage() {
  const [urlaub, setUrlaub] = useState<any[]>([]);

  const [typ, setTyp] = useState("Urlaub");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");

  const [loading, setLoading] = useState(false);
  const [meldung, setMeldung] = useState("");

  async function ladeUrlaub() {
    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("urlaub")
      .select("*")
      .eq("user_id", user.id)
      .order("id", { ascending: false });

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    setUrlaub(data || []);
  }

  useEffect(() => {
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
    setMeldung("");

    if (!von || !bis) {
      setMeldung(
        "Bitte Start- und Enddatum auswählen."
      );
      return;
    }

    const tage = berechneTage();

    if (tage <= 0) {
      setMeldung(
        "Bitte gültigen Zeitraum auswählen."
      );
      return;
    }

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      setMeldung("Bitte zuerst einloggen.");
      window.location.href = "/login";
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("urlaub")
      .insert([
        {
          typ,
          von,
          bis,
          tage,
          status: "Beantragt",
          user_id: user.id,
        },
      ]);

    if (error) {
      setLoading(false);
      setMeldung(error.message);
      console.log(error);
      return;
    }

    setTyp("Urlaub");
    setVon("");
    setBis("");

    await ladeUrlaub();

    setLoading(false);

    setMeldung("Abwesenheit gespeichert.");
  }

  async function urlaubLoeschen(id: number) {
    const bestaetigen = confirm(
      "Abwesenheit wirklich löschen?"
    );

    if (!bestaetigen) return;

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      setMeldung("Bitte zuerst einloggen.");
      window.location.href = "/login";
      return;
    }

    const { error } = await supabase
      .from("urlaub")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    await ladeUrlaub();

    setMeldung("Abwesenheit gelöscht.");
  }

  function typFarbe(typ: string) {
    if (typ === "Urlaub") {
      return "bg-blue-100 text-blue-800";
    }

    if (typ === "Krank") {
      return "bg-red-100 text-red-800";
    }

    if (typ === "Überstundenabbau") {
      return "bg-orange-100 text-orange-800";
    }

    return "bg-zinc-100 text-zinc-800";
  }

  function statusFarbe(status: string) {
    if (status === "Genehmigt") {
      return "bg-green-100 text-green-800";
    }

    if (status === "Abgelehnt") {
      return "bg-red-100 text-red-800";
    }

    return "bg-yellow-100 text-yellow-800";
  }

  const berechneteTage = berechneTage();

  return (
    <main>
      <h1 className="mb-3 text-4xl font-extrabold text-zinc-900 md:text-5xl">
        Urlaub & Abwesenheit
      </h1>

      <p className="mb-10 text-base font-medium text-zinc-700 md:text-lg">
        Urlaub, Krankheit und Überstundenabbau beantragen
      </p>

      <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="mb-6 text-2xl font-bold text-zinc-900">
          Abwesenheit erfassen
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <select
            value={typ}
            onChange={(e) => setTyp(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3 text-zinc-900"
          >
            <option value="Urlaub">Urlaub</option>

            <option value="Krank">
              Krank
            </option>

            <option value="Überstundenabbau">
              Überstundenabbau
            </option>
          </select>

          <input
            type="date"
            value={von}
            onChange={(e) => setVon(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3 text-zinc-900"
          />

          <input
            type="date"
            value={bis}
            onChange={(e) => setBis(e.target.value)}
            className="rounded-xl border border-zinc-300 p-3 text-zinc-900"
          />

          <button
            type="button"
            onClick={abwesenheitHinzufuegen}
            disabled={loading}
            className="rounded-xl bg-zinc-900 font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
          >
            {loading
              ? "Speichern..."
              : "Speichern"}
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-100 p-4">
          <span className="font-bold text-zinc-900">
            Berechnete Arbeitstage:
          </span>{" "}
          <span className="font-extrabold text-orange-600">
            {berechneteTage} Tage
          </span>

          {typ === "Überstundenabbau" && (
            <p className="mt-2 text-sm font-medium text-zinc-600">
              Diese Tage werden später vom
              Überstundenkonto abgezogen und nicht
              vom Urlaub.
            </p>
          )}
        </div>

        {meldung && (
          <div className="mt-4 rounded-xl bg-zinc-900 p-3 text-sm font-semibold text-white">
            {meldung}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="mb-6 text-2xl font-bold text-zinc-900">
          Meine Abwesenheiten
        </h2>

        {urlaub.length === 0 && (
          <div className="rounded-xl bg-zinc-100 p-4 text-zinc-600">
            Noch keine Abwesenheiten vorhanden.
          </div>
        )}

        <div className="space-y-4 md:hidden">
          {urlaub.map((eintrag) => (
            <div
              key={eintrag.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${typFarbe(
                      eintrag.typ
                    )}`}
                  >
                    {eintrag.typ || "Urlaub"}
                  </span>

                  <p className="mt-3 font-semibold text-zinc-900">
                    {eintrag.von} bis {eintrag.bis}
                  </p>

                  <p className="mt-1 text-sm text-zinc-600">
                    {eintrag.tage || 0} Arbeitstage
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${statusFarbe(
                    eintrag.status
                  )}`}
                >
                  {eintrag.status}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  urlaubLoeschen(eintrag.id)
                }
                className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
              >
                Löschen
              </button>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <div className="min-w-[850px]">
            <div className="mb-4 grid grid-cols-6 border-b border-zinc-300 pb-4 font-bold text-zinc-800">
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
                className="grid grid-cols-6 items-center border-b border-zinc-200 py-4"
              >
                <div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${typFarbe(
                      eintrag.typ
                    )}`}
                  >
                    {eintrag.typ || "Urlaub"}
                  </span>
                </div>

                <div className="text-zinc-800">
                  {eintrag.von}
                </div>

                <div className="text-zinc-800">
                  {eintrag.bis}
                </div>

                <div className="font-bold text-zinc-900">
                  {eintrag.tage || 0}
                </div>

                <div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${statusFarbe(
                      eintrag.status
                    )}`}
                  >
                    {eintrag.status}
                  </span>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() =>
                      urlaubLoeschen(eintrag.id)
                    }
                    className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
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
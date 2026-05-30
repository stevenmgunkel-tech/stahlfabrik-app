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
      setMeldung("Bitte Start- und Enddatum auswählen.");
      return;
    }

    const tage = berechneTage();

    if (tage <= 0) {
      setMeldung("Bitte gültigen Zeitraum auswählen.");
      return;
    }

    const userData = await supabase.auth.getUser();
    const user = userData.data.user;

    if (!user) {
      setMeldung("Bitte zuerst einloggen.");
      window.location.href = "/login";
      return;
    }

    let mitarbeiterName = user.email || "Unbekannt";

    const { data: mitarbeiterData } = await supabase
      .from("mitarbeiter")
      .select("name")
      .eq("user_id", user.id)
      .single();

    if (mitarbeiterData?.name) {
      mitarbeiterName = mitarbeiterData.name;
    }

    setLoading(true);

    const { error } = await supabase.from("urlaub").insert([
      {
        mitarbeiter: mitarbeiterName,
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
    const bestaetigen = confirm("Abwesenheit wirklich löschen?");
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
      return "border-blue-400/30 bg-blue-500/10 text-blue-300";
    }

    if (typ === "Krank") {
      return "border-red-400/30 bg-red-500/10 text-red-300";
    }

    if (typ === "Überstundenabbau") {
      return "border-orange-400/40 bg-orange-500/10 text-orange-400";
    }

    return "border-white/10 bg-white/[0.06] text-white/70";
  }

  function statusFarbe(status: string) {
    if (status === "Genehmigt") {
      return "border-green-400/30 bg-green-500/10 text-green-300";
    }

    if (status === "Abgelehnt") {
      return "border-red-400/30 bg-red-500/10 text-red-300";
    }

    return "border-yellow-400/30 bg-yellow-500/10 text-yellow-300";
  }

  const berechneteTage = berechneTage();

  return (
    <main className="space-y-8">
      <div>
        <div className="mb-3 text-sm font-medium uppercase tracking-widest text-white/60">
          Abwesenheiten
        </div>

        <h1 className="text-5xl font-black tracking-tight text-white lg:text-6xl">
          Urlaub & Krank
        </h1>

        <p className="mt-3 text-white/60">
          Urlaub, Krankheit und Überstundenabbau beantragen
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-black text-white">
              Abwesenheit erfassen
            </h2>
            <p className="mt-1 text-white/55">
              Zeitraum auswählen und Antrag speichern
            </p>
          </div>

          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3">
            <span className="text-sm text-white/60">Berechnet</span>{" "}
            <span className="font-black text-orange-500">
              {berechneteTage} Tage
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field label="Typ">
            <select
              value={typ}
              onChange={(e) => setTyp(e.target.value)}
              className="dark-input"
            >
              <option value="Urlaub">Urlaub</option>
              <option value="Krank">Krank</option>
              <option value="Überstundenabbau">Überstundenabbau</option>
            </select>
          </Field>

          <Field label="Von">
            <input
              type="date"
              value={von}
              onChange={(e) => setVon(e.target.value)}
              className="dark-input"
            />
          </Field>

          <Field label="Bis">
            <input
              type="date"
              value={bis}
              onChange={(e) => setBis(e.target.value)}
              className="dark-input"
            />
          </Field>

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={abwesenheitHinzufuegen}
              disabled={loading}
              className="rounded-xl bg-orange-600 p-3 font-black text-white shadow-lg shadow-orange-600/25 transition hover:bg-orange-500 disabled:opacity-50"
            >
              {loading ? "Speichern..." : "Speichern"}
            </button>
          </div>
        </div>

        {typ === "Überstundenabbau" && (
          <div className="mt-5 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm font-medium text-orange-300">
            Diese Tage werden später vom Überstundenkonto abgezogen und nicht
            vom Urlaub.
          </div>
        )}

        {meldung && (
          <div className="mt-5 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm font-bold text-orange-400">
            {meldung}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.025] p-6 shadow-2xl shadow-black/30 lg:p-7">
        <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-2xl font-black text-white">
              Meine Abwesenheiten
            </h2>
            <p className="mt-1 text-white/55">
              Übersicht deiner Anträge und Status
            </p>
          </div>

          <div className="text-sm text-white/50">
            {urlaub.length} Einträge
          </div>
        </div>

        {urlaub.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-black/25 p-5 text-white/55">
            Noch keine Abwesenheiten vorhanden.
          </div>
        )}

        <div className="space-y-4 md:hidden">
          {urlaub.map((eintrag) => (
            <div
              key={eintrag.id}
              className="rounded-2xl border border-white/10 bg-black/25 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${typFarbe(
                      eintrag.typ
                    )}`}
                  >
                    {eintrag.typ || "Urlaub"}
                  </span>

                  <p className="mt-4 text-lg font-black text-white">
                    {eintrag.von} bis {eintrag.bis}
                  </p>

                  <p className="mt-1 text-sm text-white/60">
                    {eintrag.tage || 0} Arbeitstage
                  </p>
                </div>

                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${statusFarbe(
                    eintrag.status
                  )}`}
                >
                  {eintrag.status}
                </span>
              </div>

              <button
                type="button"
                onClick={() => urlaubLoeschen(eintrag.id)}
                className="mt-5 w-full rounded-xl bg-red-600 px-4 py-3 font-bold text-white transition hover:bg-red-500"
              >
                Löschen
              </button>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-white/10 md:block">
          <div className="grid min-w-[850px] grid-cols-6 border-b border-white/10 bg-black/20 px-5 py-4 text-sm font-bold uppercase tracking-wide text-white/50">
            <div>Typ</div>
            <div>Von</div>
            <div>Bis</div>
            <div>Tage</div>
            <div>Status</div>
            <div>Aktion</div>
          </div>

          <div className="overflow-x-auto">
            {urlaub.map((eintrag) => (
              <div
                key={eintrag.id}
                className="grid min-w-[850px] grid-cols-6 items-center border-b border-white/10 px-5 py-4 text-white/80 transition hover:bg-white/[0.03]"
              >
                <div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${typFarbe(
                      eintrag.typ
                    )}`}
                  >
                    {eintrag.typ || "Urlaub"}
                  </span>
                </div>

                <div>{eintrag.von}</div>
                <div>{eintrag.bis}</div>

                <div className="font-black text-orange-500">
                  {eintrag.tage || 0}
                </div>

                <div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${statusFarbe(
                      eintrag.status
                    )}`}
                  >
                    {eintrag.status}
                  </span>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => urlaubLoeschen(eintrag.id)}
                    className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white transition hover:bg-red-500"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style jsx global>{`
        .dark-input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.25);
          padding: 0.85rem 1rem;
          color: white;
          outline: none;
          transition: 0.2s ease;
        }

        .dark-input:focus {
          border-color: rgba(249, 115, 22, 0.6);
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12);
        }

        .dark-input option {
          background: #111315;
          color: white;
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-white/70">
        {label}
      </label>
      {children}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function HomePage() {
  const [mitarbeiter, setMitarbeiter] = useState<any[]>([]);
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [urlaub, setUrlaub] = useState<any[]>([]);
  const [projekte, setProjekte] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [meldung, setMeldung] = useState("");

  const monat = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    async function ladeDashboard() {
      setLoading(true);
      setMeldung("");

      const userData = await supabase.auth.getUser();
      const user = userData.data.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const start = `${monat}-01`;

      const ende = new Date(
        Number(monat.slice(0, 4)),
        Number(monat.slice(5, 7)),
        0
      )
        .toISOString()
        .split("T")[0];

      const { data: mitarbeiterData, error: mitarbeiterError } =
        await supabase.from("mitarbeiter").select("*");

      const { data: arbeitszeitenData, error: arbeitszeitenError } =
        await supabase
          .from("arbeitszeiten")
          .select("*")
          .gte("datum", start)
          .lte("datum", ende)
          .order("id", { ascending: false });

      const { data: urlaubData, error: urlaubError } = await supabase
        .from("urlaub")
        .select("*")
        .gte("von", start)
        .lte("bis", ende)
        .order("id", { ascending: false });

      const { data: projekteData, error: projekteError } = await supabase
        .from("projekte")
        .select("*")
        .order("id", { ascending: false });

      const fehler =
        mitarbeiterError ||
        arbeitszeitenError ||
        urlaubError ||
        projekteError;

      if (fehler) {
        setMeldung(fehler.message);
        console.log(fehler);
      }

      setMitarbeiter(mitarbeiterData || []);
      setArbeitszeiten(arbeitszeitenData || []);
      setUrlaub(urlaubData || []);
      setProjekte(projekteData || []);

      setLoading(false);
    }

    ladeDashboard();
  }, [monat]);

  const gesamtstunden = arbeitszeiten.reduce(
    (sum, eintrag) => sum + Number(eintrag.stunden || 0),
    0
  );

  const offeneUrlaube = urlaub.filter(
    (eintrag) =>
      eintrag.typ === "Urlaub" && eintrag.status === "Beantragt"
  ).length;

  const krankmeldungen = urlaub.filter(
    (eintrag) => eintrag.typ === "Krank"
  ).length;

  const letzteArbeitszeit = arbeitszeiten[0];
  const letzterUrlaub = urlaub[0];
  const letztesProjekt = projekte[0];
  const letzterMitarbeiter = mitarbeiter[0];

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-900 md:text-5xl">
          StahlFabrik Dashboard
        </h1>

        <p className="mt-2 text-sm text-zinc-600 md:text-lg">
          Willkommen zurück 👋
        </p>
      </div>

      {meldung && (
        <div className="rounded-xl bg-zinc-900 p-3 text-sm font-semibold text-white">
          {meldung}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-sm text-zinc-500">Mitarbeiter</h2>
          <p className="mt-2 text-4xl font-extrabold text-zinc-900">
            {loading ? "..." : mitarbeiter.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-sm text-zinc-500">
            Arbeitsstunden Monat
          </h2>

          <p className="mt-2 text-4xl font-extrabold text-zinc-900">
            {loading ? "..." : `${gesamtstunden.toFixed(2)}h`}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-sm text-zinc-500">
            Offene Urlaube
          </h2>

          <p className="mt-2 text-4xl font-extrabold text-zinc-900">
            {loading ? "..." : offeneUrlaube}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-sm text-zinc-500">
            Krankmeldungen
          </h2>

          <p className="mt-2 text-4xl font-extrabold text-zinc-900">
            {loading ? "..." : krankmeldungen}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-zinc-900">
          Letzte Aktivitäten
        </h2>

        <div className="space-y-3">
          {letzteArbeitszeit && (
            <div className="rounded-xl bg-zinc-100 p-4">
              Letzte Arbeitszeit:{" "}
              <span className="font-semibold">
                {letzteArbeitszeit.projekt}
              </span>{" "}
              — {letzteArbeitszeit.stunden}h
            </div>
          )}

          {letzterUrlaub && (
            <div className="rounded-xl bg-zinc-100 p-4">
              Letzter Eintrag:{" "}
              <span className="font-semibold">
                {letzterUrlaub.typ}
              </span>{" "}
              — {letzterUrlaub.status}
            </div>
          )}

          {letztesProjekt && (
            <div className="rounded-xl bg-zinc-100 p-4">
              Neues Projekt:{" "}
              <span className="font-semibold">
                {letztesProjekt.name}
              </span>
            </div>
          )}

          {letzterMitarbeiter && (
            <div className="rounded-xl bg-zinc-100 p-4">
              Letzter Mitarbeiter:{" "}
              <span className="font-semibold">
                {letzterMitarbeiter.name}
              </span>
            </div>
          )}

          {!loading &&
            !letzteArbeitszeit &&
            !letzterUrlaub &&
            !letztesProjekt &&
            !letzterMitarbeiter && (
              <div className="rounded-xl bg-zinc-100 p-4 text-zinc-600">
                Noch keine Aktivitäten vorhanden.
              </div>
            )}
        </div>
      </div>
    </main>
  );
}
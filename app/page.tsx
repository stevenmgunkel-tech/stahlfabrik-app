"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function HomePage() {
  const [mitarbeiter, setMitarbeiter] = useState<any[]>([]);
  const [arbeitszeiten, setArbeitszeiten] = useState<any[]>([]);
  const [urlaub, setUrlaub] = useState<any[]>([]);
  const [projekte, setProjekte] = useState<any[]>([]);

  const [userRole, setUserRole] = useState("");
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

      const { data: eigenerMitarbeiter, error: mitarbeiterCheckError } =
        await supabase
          .from("mitarbeiter")
          .select("*")
          .eq("user_id", user.id)
          .single();

      if (mitarbeiterCheckError) {
        setMeldung(mitarbeiterCheckError.message);
        console.log(mitarbeiterCheckError);
        setLoading(false);
        return;
      }

      const rolle = eigenerMitarbeiter?.rolle || "";
      const isAdmin = rolle === "Admin";

      setUserRole(rolle);

      const start = `${monat}-01`;

      const ende = new Date(
        Number(monat.slice(0, 4)),
        Number(monat.slice(5, 7)),
        0
      )
        .toISOString()
        .split("T")[0];

      const { data: mitarbeiterData, error: mitarbeiterError } = await supabase
        .from("mitarbeiter")
        .select(isAdmin ? "*" : "id, name, rolle")
        .order("id", { ascending: false });

      let arbeitszeitenQuery = supabase
        .from("arbeitszeiten")
        .select("*")
        .gte("datum", start)
        .lte("datum", ende)
        .order("id", { ascending: false });

      let urlaubQuery = supabase
        .from("urlaub")
        .select("*")
        .gte("von", start)
        .lte("bis", ende)
        .order("id", { ascending: false });

      if (!isAdmin) {
        arbeitszeitenQuery = arbeitszeitenQuery.eq("user_id", user.id);
        urlaubQuery = urlaubQuery.eq("user_id", user.id);
      }

      const { data: arbeitszeitenData, error: arbeitszeitenError } =
        await arbeitszeitenQuery;

      const { data: urlaubData, error: urlaubError } = await urlaubQuery;

      const { data: projekteData, error: projekteError } = isAdmin
        ? await supabase
            .from("projekte")
            .select("*")
            .order("id", { ascending: false })
        : { data: [], error: null };

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

  const isAdmin = userRole === "Admin";

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
          <h2 className="text-sm text-zinc-500">Teammitglieder</h2>
          <p className="mt-2 text-4xl font-extrabold text-zinc-900">
            {loading ? "..." : mitarbeiter.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-sm text-zinc-500">
            {isAdmin ? "Arbeitsstunden Firma" : "Meine Arbeitsstunden"}
          </h2>

          <p className="mt-2 text-4xl font-extrabold text-zinc-900">
            {loading ? "..." : `${gesamtstunden.toFixed(2)}h`}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-sm text-zinc-500">
            {isAdmin ? "Offene Urlaube" : "Meine offenen Urlaube"}
          </h2>

          <p className="mt-2 text-4xl font-extrabold text-zinc-900">
            {loading ? "..." : offeneUrlaube}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-sm text-zinc-500">
            {isAdmin ? "Krankmeldungen" : "Meine Krankmeldungen"}
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
              {isAdmin ? "Letzte Arbeitszeit" : "Meine letzte Arbeitszeit"}:{" "}
              <span className="font-semibold">
                {letzteArbeitszeit.projekt}
              </span>{" "}
              — {letzteArbeitszeit.stunden}h
            </div>
          )}

          {letzterUrlaub && (
            <div className="rounded-xl bg-zinc-100 p-4">
              {isAdmin ? "Letzter Eintrag" : "Mein letzter Eintrag"}:{" "}
              <span className="font-semibold">
                {letzterUrlaub.typ}
              </span>{" "}
              — {letzterUrlaub.status}
            </div>
          )}

          {isAdmin && letztesProjekt && (
            <div className="rounded-xl bg-zinc-100 p-4">
              Neues Projekt:{" "}
              <span className="font-semibold">
                {letztesProjekt.name}
              </span>
            </div>
          )}

          {isAdmin && letzterMitarbeiter && (
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
            (!isAdmin || (!letztesProjekt && !letzterMitarbeiter)) && (
              <div className="rounded-xl bg-zinc-100 p-4 text-zinc-600">
                Noch keine Aktivitäten vorhanden.
              </div>
            )}
        </div>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function TeamPage() {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [meldung, setMeldung] = useState("");

  useEffect(() => {
    async function ladeTeam() {
      setMeldung("");

      const userData = await supabase.auth.getUser();
      const user = userData.data.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("mitarbeiter")
        .select("id, name, rolle")
        .order("name", { ascending: true });

      if (error) {
        setMeldung(error.message);
        console.log(error);
        setLoading(false);
        return;
      }

      setTeam(data || []);
      setLoading(false);
    }

    ladeTeam();
  }, []);

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-zinc-900 md:text-5xl">
          Team
        </h1>

        <p className="mt-2 text-sm font-medium text-zinc-600 md:text-lg">
          Übersicht aller Teammitglieder
        </p>
      </div>

      {meldung && (
        <div className="rounded-xl bg-zinc-900 p-3 text-sm font-semibold text-white">
          {meldung}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="mb-5 text-xl font-bold text-zinc-900 md:text-2xl">
          Teamübersicht
        </h2>

        {loading && (
          <div className="rounded-xl bg-zinc-100 p-4 font-semibold text-zinc-600">
            Team wird geladen...
          </div>
        )}

        {!loading && team.length === 0 && (
          <div className="rounded-xl bg-zinc-100 p-4 text-zinc-600">
            Noch keine Teammitglieder vorhanden.
          </div>
        )}

        <div className="space-y-4 md:hidden">
          {team.map((person) => (
            <div
              key={person.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="text-lg font-bold text-zinc-900">
                {person.name}
              </div>

              <div className="mt-2 inline-block rounded-full bg-zinc-900 px-3 py-1 text-sm font-semibold text-white">
                {person.rolle || "Mitarbeiter"}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <div className="min-w-[500px]">
            <div className="grid grid-cols-2 border-b border-zinc-300 pb-4 font-bold text-zinc-800">
              <div>Name</div>
              <div>Rolle</div>
            </div>

            {team.map((person) => (
              <div
                key={person.id}
                className="grid grid-cols-2 items-center border-b border-zinc-200 py-4"
              >
                <div className="font-medium text-zinc-900">
                  {person.name}
                </div>

                <div>
                  <span className="rounded-full bg-zinc-900 px-3 py-1 text-sm font-semibold text-white">
                    {person.rolle || "Mitarbeiter"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
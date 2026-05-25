"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {
  const [urlaub, setUrlaub] = useState<any[]>([]);
  const [geladen, setGeladen] = useState(false);
  const [admin, setAdmin] = useState(false);

  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [meldung, setMeldung] = useState("");

  async function ladeUrlaub() {
    const { data: urlaubData, error } = await supabase
      .from("urlaub")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      setMeldung(error.message);
      console.log(error);
      return;
    }

    setUrlaub(urlaubData || []);
  }

  useEffect(() => {
    async function pruefen() {
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
        setGeladen(true);
        return;
      }

      if (mitarbeiter?.rolle !== "Admin") {
        window.location.href = "/";
        return;
      }

      setAdmin(true);

      await ladeUrlaub();

      setGeladen(true);
    }

    pruefen();
  }, []);

  async function statusAendern(id: number, status: string) {
    setMeldung("");
    setLoadingId(id);

    const { error } = await supabase
      .from("urlaub")
      .update({ status })
      .eq("id", id);

    if (error) {
      setLoadingId(null);
      setMeldung(error.message);
      console.log(error);
      return;
    }

    await ladeUrlaub();

    setLoadingId(null);
    setMeldung(`Status wurde auf ${status} gesetzt.`);
  }

  if (!geladen) {
    return (
      <main>
        <h1 className="text-3xl font-bold text-zinc-900">
          Lade Admin Panel...
        </h1>
      </main>
    );
  }

  if (!admin) return null;

  return (
    <main>
      <h1 className="text-5xl font-extrabold text-zinc-900 mb-3">
        Admin Panel
      </h1>

      <p className="text-zinc-700 text-lg mb-10 font-medium">
        Urlaubs- und Krankmeldungen verwalten
      </p>

      {meldung && (
        <div className="mb-6 rounded-xl bg-zinc-900 p-3 text-sm font-semibold text-white">
          {meldung}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">
          Alle Abwesenheiten
        </h2>

        <div className="space-y-4 md:hidden">
          {urlaub.map((eintrag) => (
            <div
              key={eintrag.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-zinc-900">
                    {eintrag.typ || "Urlaub"}
                  </div>

                  <div className="mt-1 text-sm text-zinc-600">
                    {eintrag.von} - {eintrag.bis}
                  </div>

                  <div className="mt-1 text-sm text-zinc-600">
                    {eintrag.tage || 0} Tage
                  </div>
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

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={loadingId === eintrag.id}
                  onClick={() => statusAendern(eintrag.id, "Genehmigt")}
                  className="rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  Genehmigen
                </button>

                <button
                  type="button"
                  disabled={loadingId === eintrag.id}
                  onClick={() => statusAendern(eintrag.id, "Abgelehnt")}
                  className="rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  Ablehnen
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <div className="min-w-[1000px]">
            <div className="grid grid-cols-7 font-bold text-zinc-800 border-b border-zinc-300 pb-4 mb-4">
              <div>Typ</div>
              <div>Von</div>
              <div>Bis</div>
              <div>Tage</div>
              <div>Status</div>
              <div>Genehmigen</div>
              <div>Ablehnen</div>
            </div>

            {urlaub.map((eintrag) => (
              <div
                key={eintrag.id}
                className="grid grid-cols-7 py-4 border-b border-zinc-200 items-center"
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
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
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

                <div>
                  <button
                    type="button"
                    disabled={loadingId === eintrag.id}
                    onClick={() => statusAendern(eintrag.id, "Genehmigt")}
                    className="bg-green-600 hover:bg-green-700 transition text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    Genehmigen
                  </button>
                </div>

                <div>
                  <button
                    type="button"
                    disabled={loadingId === eintrag.id}
                    onClick={() => statusAendern(eintrag.id, "Abgelehnt")}
                    className="bg-red-600 hover:bg-red-700 transition text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {urlaub.length === 0 && (
          <div className="rounded-xl bg-zinc-100 p-4 text-zinc-600">
            Keine Abwesenheiten vorhanden.
          </div>
        )}
      </div>

      <div className="mt-8 bg-zinc-900 text-white rounded-2xl shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-3">
          Resturlaub Logik
        </h2>

        <p className="text-zinc-300">
          Urlaub wird automatisch vom Resturlaub abgezogen, sobald der Status
          auf <span className="text-orange-400 font-bold">Genehmigt</span>{" "}
          gesetzt ist. Kranktage werden separat gezählt und nicht vom Urlaub
          abgezogen.
        </p>
      </div>
    </main>
  );
}
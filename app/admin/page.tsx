"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {
  const [urlaub, setUrlaub] = useState<any[]>([]);

  const [geladen, setGeladen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [meldung, setMeldung] = useState("");

  async function pruefeAdmin() {
    const userData = await supabase.auth.getUser();

    const user = userData.data.user;

    if (!user) {
      window.location.href = "/login";
      return false;
    }

    const { data, error } = await supabase
      .from("mitarbeiter")
      .select("rolle")
      .eq("user_id", user.id)
      .single();

    if (error || data?.rolle !== "Admin") {
      window.location.href = "/";
      return false;
    }

    setIsAdmin(true);

    return true;
  }

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
    async function init() {
      setMeldung("");

      const erlaubt = await pruefeAdmin();

      if (!erlaubt) return;

      await ladeUrlaub();

      setGeladen(true);
    }

    init();
  }, []);

  async function statusAendern(id: number, status: string) {
    if (!isAdmin) {
      setMeldung("Keine Berechtigung.");
      return;
    }

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
      <main className="space-y-6">
        <div className="rounded-2xl bg-white p-6 font-bold text-zinc-900 shadow-sm">
          Adminbereich wird geladen...
        </div>
      </main>
    );
  }

  return (
    <main>
      <h1 className="mb-3 text-5xl font-extrabold text-zinc-900">
        Admin Panel
      </h1>

      <p className="mb-10 text-lg font-medium text-zinc-700">
        Urlaubs- und Krankmeldungen verwalten
      </p>

      {meldung && (
        <div className="mb-6 rounded-xl bg-zinc-900 p-3 text-sm font-semibold text-white">
          {meldung}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-2xl font-bold text-zinc-900">
          Alle Abwesenheiten
        </h2>

        {urlaub.length === 0 && (
          <div className="rounded-xl bg-zinc-100 p-4 text-zinc-600">
            Keine Abwesenheiten vorhanden.
          </div>
        )}

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
                  onClick={() =>
                    statusAendern(
                      eintrag.id,
                      "Genehmigt"
                    )
                  }
                  className="rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  Genehmigen
                </button>

                <button
                  type="button"
                  disabled={loadingId === eintrag.id}
                  onClick={() =>
                    statusAendern(
                      eintrag.id,
                      "Abgelehnt"
                    )
                  }
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
            <div className="mb-4 grid grid-cols-7 border-b border-zinc-300 pb-4 font-bold text-zinc-800">
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
                className="grid grid-cols-7 items-center border-b border-zinc-200 py-4"
              >
                <div className="font-medium text-zinc-900">
                  {eintrag.typ || "Urlaub"}
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
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
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
                    onClick={() =>
                      statusAendern(
                        eintrag.id,
                        "Genehmigt"
                      )
                    }
                    className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                  >
                    Genehmigen
                  </button>
                </div>

                <div>
                  <button
                    type="button"
                    disabled={loadingId === eintrag.id}
                    onClick={() =>
                      statusAendern(
                        eintrag.id,
                        "Abgelehnt"
                      )
                    }
                    className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-zinc-900 p-6 text-white shadow-sm">
        <h2 className="mb-3 text-2xl font-bold">
          Resturlaub Logik
        </h2>

        <p className="text-zinc-300">
          Urlaub wird automatisch vom Resturlaub abgezogen,
          sobald der Status auf{" "}
          <span className="font-bold text-orange-400">
            Genehmigt
          </span>{" "}
          gesetzt ist.
          Kranktage werden separat gezählt und nicht vom
          Urlaub abgezogen.
        </p>
      </div>
    </main>
  );
}
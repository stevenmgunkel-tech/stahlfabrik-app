"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {
  const [urlaub, setUrlaub] = useState<any[]>([]);
  const [geladen, setGeladen] = useState(false);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    async function pruefen() {
      const userData = await supabase.auth.getUser();
      const user = userData.data.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: mitarbeiter } = await supabase
        .from("mitarbeiter")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (mitarbeiter?.rolle !== "Admin") {
        window.location.href = "/";
        return;
      }

      setAdmin(true);

      const { data: urlaubData, error } = await supabase
        .from("urlaub")
        .select("*")
        .order("id", { ascending: false });

      if (urlaubData) setUrlaub(urlaubData);
      if (error) console.log(error);

      setGeladen(true);
    }

    pruefen();
  }, []);

  async function statusAendern(id: number, status: string) {
    const { error } = await supabase
      .from("urlaub")
      .update({ status })
      .eq("id", id);

    if (!error) location.reload();

    if (error) {
      alert(error.message);
      console.log(error);
    }
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

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <h2 className="text-2xl font-bold text-zinc-900 mb-6">
          Alle Abwesenheiten
        </h2>

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
                onClick={() => statusAendern(eintrag.id, "Genehmigt")}
                className="bg-green-600 hover:bg-green-700 transition text-white px-4 py-2 rounded-lg font-semibold"
              >
                Genehmigen
              </button>
            </div>

            <div>
              <button
                onClick={() => statusAendern(eintrag.id, "Abgelehnt")}
                className="bg-red-600 hover:bg-red-700 transition text-white px-4 py-2 rounded-lg font-semibold"
              >
                Ablehnen
              </button>
            </div>
          </div>
        ))}
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
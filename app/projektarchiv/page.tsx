"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ProjektarchivPage() {
  const [projekte, setProjekte] = useState<any[]>([]);

  useEffect(() => {
    ladeArchiv();
  }, []);

  async function ladeArchiv() {
    const { data } = await supabase
      .from("projekte")
      .select("*")
      .eq("status", "Abgeschlossen")
      .order("kunde", { ascending: true });

    setProjekte(data || []);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-black text-white">
          Projektarchiv
        </h1>

        <p className="mt-2 text-white/60">
          Abgeschlossene Projekte
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-left">
              <th className="p-4">Kunde</th>
              <th className="p-4">Kommission</th>
              <th className="p-4">Projekt</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {projekte.map((projekt) => (
              <tr
                key={projekt.id}
                className="border-b border-white/10"
              >
                <td className="p-4">{projekt.kunde}</td>
                <td className="p-4">{projekt.kommission}</td>
                <td className="p-4">{projekt.projektname}</td>

                <td className="p-4">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm">
                    Abgeschlossen
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}